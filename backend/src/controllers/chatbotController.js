import { genAI, pc, indexName } from "../config/ai.js";
import xlsx from "xlsx";
import KnowledgeBaseFile from "../models/KnowledgeBaseFile.js";

// ===== In-memory metadata cache =====
// Caches numeric field names from uploaded data so chat() doesn't need a sample query each time.
let cachedNumericFields = null;

// Regex to quickly detect filter-type questions (Vietnamese keywords for comparison)
const FILTER_KEYWORDS_REGEX =
  /lớn hơn|nhỏ hơn|cao hơn|thấp hơn|nhiều hơn|ít hơn|trên|dưới|ít nhất|nhiều nhất|tối thiểu|tối đa|vượt quá|>=|<=|>|<|từ .{1,20} trở lên|từ .{1,20} trở xuống|\d+\s*(triệu|tỷ|nghìn|ngàn)/i;

// Regex to detect "list all" type queries that need more results
const LIST_KEYWORDS_REGEX =
  /giá|bảng giá|liệt kê|tất cả|toàn bộ|danh sách|cho .{0,10} xem|có bao nhiêu|những|các loại|đầy đủ/i;

export const uploadKnowledgeBase = async (req, res) => {
  try {
    // Support both single and multiple file uploads
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const index = pc.index(indexName);
    const results = [];
    let totalDocuments = 0;

    // Process each file
    for (const file of files) {
      try {
        const workbook = xlsx.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
          results.push({
            filename: file.originalname,
            status: "error",
            message: "Excel file is empty",
          });
          continue;
        }

        const filename = file.originalname;

        // 1. Clear old data from Pinecone
        await index.deleteMany({ source: { $eq: filename } });

        // 2. Clear meta info from MongoDB if exists
        await KnowledgeBaseFile.findOneAndDelete({ filename: filename });

        // Prepare documents
        const documents = data.map((row, i) => {
          // Create a structured string: "Source: filename, Column1: Value1, Column2: Value2..."
          // Adding filename to content helps for queries like "giá bông" when "bông" is in the filename
          const content =
            `Nguồn dữ liệu: ${filename}, ` +
            Object.entries(row)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

          return {
            id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            metadata: { ...row, text: content, source: filename },
          };
        });

        // Get embedding model
        const embeddingModel = genAI.getGenerativeModel({
          model: "models/gemini-embedding-001",
        });

        // Rate limiter: Gemini paid tier = 3000 embedding requests/minute
        const RATE_LIMIT = 2800; // buffer below 3000 to be safe
        const WINDOW_MS = 60_000; // 1 minute
        let windowStart = Date.now();
        let windowRequestCount = 0;

        const waitForRateLimit = async (requestCount) => {
          windowRequestCount += requestCount;

          if (windowRequestCount >= RATE_LIMIT) {
            const elapsed = Date.now() - windowStart;
            const waitTime = WINDOW_MS - elapsed;

            if (waitTime > 0) {
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            // Reset window
            windowStart = Date.now();
            windowRequestCount = 0;
          }
        };

        // Parallel processing with rate limit awareness
        const chunkSize = 100; // Max batch size for Gemini API
        const concurrency = 5; // 5 chunks in parallel = 500 docs per round

        let processedCount = 0;

        for (let i = 0; i < documents.length; i += chunkSize * concurrency) {
          // Check rate limit before starting this round
          const docsInThisRound = Math.min(
            chunkSize * concurrency,
            documents.length - i,
          );
          await waitForRateLimit(docsInThisRound);

          const parallelTasks = [];

          for (
            let j = 0;
            j < concurrency && i + j * chunkSize < documents.length;
            j++
          ) {
            const start = i + j * chunkSize;
            const chunk = documents.slice(start, start + chunkSize);

            parallelTasks.push(
              (async () => {
                const batchEmbeddings = await embeddingModel.batchEmbedContents(
                  {
                    requests: chunk.map((doc) => ({
                      content: { role: "user", parts: [{ text: doc.content }] },
                      taskType: "RETRIEVAL_DOCUMENT",
                      outputDimensionality: 768,
                    })),
                  },
                );

                const upsertData = chunk.map((doc, idx) => ({
                  id: doc.id,
                  values: batchEmbeddings.embeddings[idx].values,
                  metadata: doc.metadata,
                }));

                await index.upsert(upsertData);
                return chunk.length;
              })(),
            );
          }

          const chunkResults = await Promise.all(parallelTasks);
          processedCount += chunkResults.reduce((sum, count) => sum + count, 0);
        }

        // Update metadata cache after successful upload
        const numericFieldsFromData = new Map();
        data.forEach((row) => {
          Object.entries(row).forEach(([k, v]) => {
            if (typeof v === "number" && !numericFieldsFromData.has(k)) {
              numericFieldsFromData.set(k, v);
            }
          });
        });
        cachedNumericFields = Array.from(numericFieldsFromData.entries()).map(
          ([name, sampleValue]) => ({ name, sampleValue }),
        );

        // 3. Save file info to MongoDB
        await KnowledgeBaseFile.create({
          filename: filename,
          originalName: filename,
          rowCount: documents.length,
          uploadedBy: req.user?._id,
        });

        results.push({
          filename: filename,
          status: "success",
          rowCount: documents.length,
        });
        totalDocuments += documents.length;
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        results.push({
          filename: file.originalname,
          status: "error",
          message: fileError.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status === "error").length;

    res.status(200).json({
      message: `Processed ${files.length} file(s): ${successCount} successful, ${failCount} failed`,
      totalDocuments,
      results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Error uploading knowledge base",
      error: error.message,
    });
  }
};

export const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const index = pc.index(indexName);

    // 1. Create embedding for user query
    let embeddingResult;
    try {
      const embeddingModel = genAI.getGenerativeModel({
        model: "models/gemini-embedding-001",
      });

      embeddingResult = await embeddingModel.embedContent({
        content: { parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
      });
    } catch (embError) {
      console.error("Embedding API Error:", embError);
      if (embError.status === 429 || embError.message?.includes("quota")) {
        return res.status(429).json({
          message:
            "Giới hạn tạo embedding (ElanX) đã đạt. Vui lòng thử lại sau.",
          error: embError.message,
          source: "embedding",
        });
      }
      throw new Error(`Embedding failed: ${embError.message}`);
    }
    const queryEmbedding = embeddingResult.embedding.values;

    // 2. Smart filter analysis (only when needed)
    let metadataFilter = null;
    let isFilterQuery = false;

    // Quick regex check: only call Gemini filter analyzer if the question looks like a filter query
    const looksLikeFilterQuery = FILTER_KEYWORDS_REGEX.test(message);

    if (looksLikeFilterQuery) {
      try {
        // Use cached metadata fields if available, otherwise do a quick sample query
        let numericFields = cachedNumericFields;

        if (!numericFields) {
          const sampleResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true,
          });

          const sampleMatches = sampleResponse.matches || [];
          const allFieldsMap = new Map();
          sampleMatches.forEach((match) => {
            if (!match.metadata) return;
            Object.entries(match.metadata).forEach(([k, v]) => {
              if (
                k !== "text" &&
                k !== "source" &&
                typeof v === "number" &&
                !allFieldsMap.has(k)
              ) {
                allFieldsMap.set(k, v);
              }
            });
          });

          numericFields = Array.from(allFieldsMap.entries()).map(
            ([name, sampleValue]) => ({ name, sampleValue }),
          );
          // Cache for future use
          cachedNumericFields = numericFields;
        }

        if (numericFields.length > 0) {
          const analyzerModel = genAI.getGenerativeModel({
            model: "models/gemini-2.0-flash-lite",
          });

          const analyzePrompt = `Analyze this Vietnamese question and determine if it requires NUMERICAL FILTERING on a database field.

Question: "${message}"

Available NUMERIC fields in the database:
${numericFields.map((f) => `- "${f.name}" (example value: ${f.sampleValue})`).join("\n")}

If the question asks to filter by a number (keywords like "lớn hơn", "nhỏ hơn", "trên", "dưới", "cao hơn", "thấp hơn", ">", "<", ">=", "<=", "ít nhất", "nhiều nhất", "tối thiểu", "tối đa", "vượt quá", "đạt", "bằng", "từ ... trở lên", "từ ... trở xuống"), return ONLY this JSON:
{"filter": true, "field": "exact field name from list above", "operator": "$gt or $gte or $lt or $lte or $eq or $ne", "value": <number>}

If the question does NOT need numerical filtering, return ONLY:
{"filter": false}

CRITICAL RULES:
- "triệu" = multiply by 1000000 (e.g., "300 triệu" = 300000000)
- "tỷ" = multiply by 1000000000
- "nghìn" or "ngàn" = multiply by 1000
- Field name MUST exactly match one from the list above (case-sensitive, including spaces and Vietnamese characters)
- Return ONLY valid JSON, no explanation, no markdown, no code block`;

          const analyzeResult =
            await analyzerModel.generateContent(analyzePrompt);
          const analyzeText = analyzeResult.response.text().trim();

          const jsonMatch = analyzeText.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            const filterInfo = JSON.parse(jsonMatch[0]);
            if (
              filterInfo.filter &&
              filterInfo.field &&
              filterInfo.operator &&
              filterInfo.value != null
            ) {
              let matchedField = numericFields.find(
                (f) => f.name === filterInfo.field,
              );

              if (!matchedField) {
                const queryFieldLower = filterInfo.field.toLowerCase().trim();
                matchedField = numericFields.find(
                  (f) =>
                    f.name.toLowerCase().trim() === queryFieldLower ||
                    f.name.toLowerCase().includes(queryFieldLower) ||
                    queryFieldLower.includes(f.name.toLowerCase()),
                );
              }

              if (matchedField) {
                metadataFilter = {
                  [matchedField.name]: {
                    [filterInfo.operator]: filterInfo.value,
                  },
                };
                isFilterQuery = true;
              }
            }
          }
        }
      } catch (filterError) {
        // If filter analysis fails, continue with regular vector search
      }
    }

    // 3. Main Pinecone query (with or without metadata filter)
    // Determine topK based on query type
    const isListQuery = LIST_KEYWORDS_REGEX.test(message);
    const regularTopK = isListQuery ? 50 : 10;

    let queryResponse;
    try {
      const queryParams = {
        vector: queryEmbedding,
        topK: isFilterQuery ? 100 : regularTopK,
        includeMetadata: true,
      };

      if (metadataFilter) {
        queryParams.filter = metadataFilter;
      }

      queryResponse = await index.query(queryParams);

      // Fallback: if filter returned no results, retry without filter
      if (isFilterQuery && queryResponse.matches.length === 0) {
        console.log(
          "[Smart Filter] No results with filter, falling back to regular search",
        );
        queryResponse = await index.query({
          vector: queryEmbedding,
          topK: regularTopK,
          includeMetadata: true,
        });
        isFilterQuery = false;
      }
    } catch (pcError) {
      console.error("Pinecone Query Error:", pcError);
      if (pcError.status === 429 || pcError.message?.includes("Rate limit")) {
        return res.status(429).json({
          message:
            "Giới hạn truy vấn database (Pinecone) đã đạt. Vui lòng thử lại sau.",
          error: pcError.message,
          source: "pinecone",
        });
      }
      throw new Error(`Pinecone query failed: ${pcError.message}`);
    }

    // For filter queries, skip score threshold (results are already pre-filtered by Pinecone)
    // For regular queries, filter low-score results to reduce noise
    const threshold = isFilterQuery ? 0 : 0.25;
    const filteredMatches = queryResponse.matches.filter(
      (match) => match.score >= threshold,
    );

    const context = filteredMatches
      .map(
        (match) =>
          `[Nguồn: ${match.metadata.source || "Unknown"}, Độ liên quan: ${Math.round(match.score * 100)}%]: ${match.metadata.text}`,
      )
      .join("\n---\n");

    const filterContext = isFilterQuery
      ? `\n\nLƯU Ý: Dữ liệu trên đã được LỌC TRƯỚC theo tiêu chí số từ câu hỏi của người dùng. Tất cả ${filteredMatches.length} kết quả đều thỏa mãn điều kiện lọc. Hãy liệt kê TẤT CẢ kết quả.`
      : "";

    // Truncation hint: let Gemini know if results might be incomplete
    const usedTopK = isFilterQuery ? 100 : regularTopK;
    const mayBeTruncated = filteredMatches.length >= usedTopK * 0.8; // if we got near the limit
    const truncationHint = mayBeTruncated
      ? `\n\nLƯU Ý QUAN TRỌNG: Kết quả trả về có thể CHƯA ĐẦY ĐỦ (đang hiển thị ${filteredMatches.length} kết quả). Nếu người dùng muốn xem thêm, hãy gợi ý họ hỏi cụ thể hơn hoặc yêu cầu "liệt kê tất cả" hoặc "xem thêm" để nhận được đầy đủ dữ liệu.`
      : "";

    const systemPrompt = `Bạn là một trợ lý AI hỗ trợ quản lý thông tin của doanh nghiệp. 
Kiến thức của bạn được lấy từ các tệp dữ liệu đã tải lên, bao gồm thông tin khách hàng, công nợ, bảng giá vận chuyển (ví dụ: giá bông), và các tài liệu khác.

Dưới đây là dữ liệu liên quan tìm được từ bộ nhớ kiến thức (context):
${context || "KHÔNG CÓ DỮ LIỆU PHÙ HỢP TRONG NGỮ CẢNH."}${filterContext}${truncationHint}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời dựa TRỰC TIẾP và CHỈ DỰA VÀO ngữ cảnh được cung cấp ở trên.
2. Nếu người dùng hỏi về "cao nhất", "thấp nhất" hoặc yêu cầu so sánh, hãy quét qua tất cả các dòng trong ngữ cảnh và tìm giá trị tương ứng để trả lời.
3. Nếu ngữ cảnh chứa thông tin về giá vận chuyển, hãy cung cấp chính xác con số và địa điểm.
4. Nếu người dùng hỏi về thông tin không có trong ngữ cảnh, hãy thông báo rõ là không tìm thấy.
5. Khi có nhiều thông tin tương tự (ví dụ: cước đi nhiều nơi ở tỉnh đó), hãy liệt kê đầy đủ.
6. Luôn ưu tiên độ chính xác tuyệt đối từ dữ liệu nguồn.
7. Khi tính toán để trả về giá trị, hãy để 2 chữ số thập phân nếu có.
8. QUAN TRỌNG VỀ ĐỊNH DẠNG SỐ: Giữ nguyên các giá trị số ĐÚNG NGUYÊN BẢN từ dữ liệu nguồn. TUYỆT ĐỐI KHÔNG thêm dấu phẩy hoặc dấu chấm vào giữa số. Ví dụ: nếu dữ liệu nguồn là 1.328725 thì phải giữ nguyên là 1.328725, KHÔNG ĐƯỢC viết thành 1.328,725 hay 1,328.725. Dấu chấm trong số thập phân là dấu phân cách thập phân, KHÔNG phải dấu phân cách hàng nghìn.

ĐỊNH DẠNG TRẢ LỜI (BẮT BUỘC):
7. **LUÔN LUÔN sử dụng BẢNG MARKDOWN** khi liệt kê dữ liệu (từ 2 items trở lên).
   KHÔNG BAO GIỜ dùng bullet points (*), numbered list, hoặc line breaks để liệt kê.
   
8. Format bảng markdown CHÍNH XÁC như sau:
   | Tên cột 1 | Tên cột 2 | Tên cột 3 |
   |-----------|-----------|-----------|
   | Giá trị 1 | Giá trị 2 | Giá trị 3 |
   | Giá trị 1 | Giá trị 2 | Giá trị 3 |
   
   LƯU Ý: 
   - Dòng đầu tiên là header (tên cột)
   - Dòng thứ hai PHẢI có dấu gạch ngang |---|---|
   - Mỗi dòng dữ liệu sau đó là một row

9. Ví dụ CỤ THỂ cho câu hỏi "giá bông":
   
   Dưới đây là các thông tin về giá bông được tìm thấy:
   
   | Loại giá bông | Điều kiện | Giá (VNĐ) |
   |---------------|-----------|-----------|
   | Giá bông theo điều kiện đặt tiền | - | 31000 |
   | Giá bông không đặt tiền | - | 31000 |
   | Giá bông đặt tiền tối thiểu 30 triệu/lần | - | 26700 |
   | Giá bông ghé đặt tiền | - | 27700 |
   | Giá bông đã tính vận chuyển | - | 27200 |
   | Giá bông thạch thất | Đã tính vận chuyển | 27200 |

10. TUYỆT ĐỐI KHÔNG trả lời dạng này:
    ❌ "Giá bông theo điều kiện đặt tiền: 31000"
    ❌ "- Giá bông không đặt tiền là 31000"
    ❌ "Giá bông đặt tiền tối thiểu 30 triệu/lần là 26700"
    
    ✅ Chỉ trả lời dạng BẢNG MARKDOWN như ví dụ trên.
11. Luôn ưu tiên tìm giá có sẵn kể cả với câu hỏi tính giá, khi không tìm thấy thì mới dùng công thức hoặc ví dụ để thực hiện tính giá
`;

    // 4. Generate response with Gemini
    const model = genAI.getGenerativeModel({
      model: "models/gemini-3-flash-preview",
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    });

    // Convert history to Gemini format
    let geminiHistory = history.slice(-5).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // CRITICAL: Gemini requires the first message in history to be from 'user'
    while (geminiHistory.length > 0 && geminiHistory[0].role === "model") {
      geminiHistory.shift();
    }

    let result;
    try {
      const chatInstance = model.startChat({
        history: geminiHistory,
      });

      result = await chatInstance.sendMessage(message);
    } catch (genError) {
      console.error("Gemini Generation Error:", genError);
      if (genError.status === 429 || genError.message?.includes("quota")) {
        return res.status(429).json({
          message: "Giới hạn chat (ElanX) đã đạt. Vui lòng thử lại sau.",
          error: genError.message,
          source: "generation",
        });
      }
      throw new Error(`Generation failed: ${genError.message}`);
    }

    const reply = result.response.text();
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat error details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      details: error.details,
      stack: error.stack,
    });

    // Check if it's a rate limit error
    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      return res.status(429).json({
        message: "Đã vượt quá giới hạn request. Vui lòng thử lại sau vài giây.",
        error: error.message,
        isRateLimit: true,
      });
    }

    res.status(500).json({
      message: "Lỗi khi xử lý chat",
      error: error.message,
    });
  }
};

export const deleteKnowledgeBase = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ message: "Filename is required" });
    }

    const index = pc.index(indexName);

    // 1. Delete from Pinecone
    await index.deleteMany({ source: { $eq: filename } });

    // 2. Delete from MongoDB
    await KnowledgeBaseFile.findOneAndDelete({ filename: filename });

    res
      .status(200)
      .json({ message: `Successfully deleted knowledge base for ${filename}` });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ message: "Error deleting knowledge base", error: error.message });
  }
};

export const getKnowledgeSources = async (req, res) => {
  try {
    const files = await KnowledgeBaseFile.find().sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (error) {
    console.error("List sources error:", error);
    res
      .status(500)
      .json({ message: "Error fetching sources", error: error.message });
  }
};
