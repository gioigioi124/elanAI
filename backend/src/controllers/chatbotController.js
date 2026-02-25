import { genAI } from "../config/ai.js";
import { supabase } from "../config/supabase.js";
import xlsx from "xlsx";
import KnowledgeBaseFile from "../models/KnowledgeBaseFile.js";
import Conversation from "../models/Conversation.js";

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

        // 1. Clear old data from Supabase pgvector
        const { error: deleteError } = await supabase
          .from("documents")
          .delete()
          .eq("source", filename);

        if (deleteError) {
          console.warn("Delete old data warning:", deleteError.message);
        }

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

                // Insert into Supabase pgvector
                const rows = chunk.map((doc, idx) => ({
                  id: doc.id,
                  content: doc.content,
                  embedding: JSON.stringify(
                    batchEmbeddings.embeddings[idx].values,
                  ),
                  metadata: doc.metadata,
                  source: doc.metadata.source,
                }));

                // Supabase batch insert (upsert to handle potential ID conflicts)
                const { error: upsertError } = await supabase
                  .from("documents")
                  .upsert(rows);

                if (upsertError) {
                  throw new Error(
                    `Supabase upsert failed: ${upsertError.message}`,
                  );
                }

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
    const { message, history = [], conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // 1. Create embedding + prefetch metadata in PARALLEL
    const looksLikeFilterQuery = FILTER_KEYWORDS_REGEX.test(message);

    // Prefetch metadata if needed (runs in parallel with embedding)
    const metadataPrefetch =
      looksLikeFilterQuery && !cachedNumericFields
        ? supabase.from("documents").select("metadata").limit(3)
        : null;

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

    if (looksLikeFilterQuery) {
      try {
        // Use cached metadata fields if available, or resolve the prefetched promise
        let numericFields = cachedNumericFields;

        if (!numericFields && metadataPrefetch) {
          const { data: sampleData } = await metadataPrefetch;

          const allFieldsMap = new Map();
          (sampleData || []).forEach((row) => {
            if (!row.metadata) return;
            Object.entries(row.metadata).forEach(([k, v]) => {
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
                  field: matchedField.name,
                  operator: filterInfo.operator,
                  value: filterInfo.value,
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

    // 3. Main pgvector query (with or without metadata filter)
    const isListQuery = LIST_KEYWORDS_REGEX.test(message);
    const regularTopK = isListQuery ? 20 : 10;
    const topK = isFilterQuery ? 100 : regularTopK;

    let matches;
    try {
      const rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: topK,
      };

      if (metadataFilter) {
        rpcParams.filter_field = metadataFilter.field;
        rpcParams.filter_operator = metadataFilter.operator;
        rpcParams.filter_value = metadataFilter.value;
      }

      const { data, error } = await supabase.rpc("match_documents", rpcParams);

      if (error) {
        throw new Error(error.message);
      }

      matches = (data || []).map((row) => ({
        score: row.similarity,
        metadata: {
          ...row.metadata,
          text: row.metadata?.text || row.content,
          source: row.source,
        },
      }));

      // Fallback: if filter returned no results, retry without filter
      if (isFilterQuery && matches.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "match_documents",
          {
            query_embedding: JSON.stringify(queryEmbedding),
            match_count: regularTopK,
          },
        );

        if (fallbackError) {
          throw new Error(fallbackError.message);
        }

        matches = (fallbackData || []).map((row) => ({
          score: row.similarity,
          metadata: {
            ...row.metadata,
            text: row.metadata?.text || row.content,
            source: row.source,
          },
        }));
        isFilterQuery = false;
      }
    } catch (dbError) {
      console.error("pgvector Query Error:", dbError);
      throw new Error(`pgvector query failed: ${dbError.message}`);
    }

    // For filter queries, skip score threshold (results are already pre-filtered)
    // For regular queries, use a lower threshold (0.15) so that queries with Vietnamese
    // accents can still match data stored with no-accent filenames (e.g. "Dũng Thanh Trì" vs "Dung Thanh Tri")
    const threshold = isFilterQuery ? 0 : 0.15;
    const filteredMatches = matches.filter((match) => match.score >= threshold);

    const context = filteredMatches
      .map((match) => {
        // Keep the "Nguồn dữ liệu" prefix so the AI knows which file each row comes from,
        // which is critical when the user queries by filename (e.g. "báo giá Dũng Thanh Trì").
        const text = match.metadata.text || "";
        return text;
      })
      .join("\n");

    const filterHint = isFilterQuery
      ? ` Dữ liệu đã lọc theo điều kiện số, liệt kê tất cả.`
      : "";

    const systemPrompt = `Trợ lý AI tra cứu dữ liệu doanh nghiệp. Trả lời CHỈ dựa vào context dưới đây.${filterHint}

Context:
${context || "Không có dữ liệu."}

Quy tắc:
- Dùng BẢNG MARKDOWN khi liệt kê (≥2 items), tính giá, so sánh. Không dùng bullet/numbered list.
- Giữ nguyên số từ dữ liệu nguồn, không format lại.
- Không có thông tin → nói rõ không tìm thấy.
- Ưu tiên giá có sẵn, chỉ tính khi không tìm thấy.
- luôn trả về giá 1cm chiều cao khi tính giá mút.
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

    let resultStream;
    try {
      const chatInstance = model.startChat({
        history: geminiHistory,
      });

      resultStream = await chatInstance.sendMessageStream(message);
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

    // Prepare response headers for SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setTimeout(0); // Disable socket timeout for long replies

    try {
      let fullReply = "";

      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        fullReply += chunkText;
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }

      // Streaming finished: Append messages to the conversation automatically (Data Loss safe)
      if (conversationId && req.user?._id) {
        try {
          await Conversation.findOneAndUpdate(
            { _id: conversationId, userId: req.user._id },
            {
              $push: {
                messages: {
                  $each: [
                    { role: "user", content: message },
                    { role: "assistant", content: fullReply },
                  ],
                },
              },
            },
          );
        } catch (dbErr) {
          console.error("Error saving conversation to DB:", dbErr);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (streamError) {
      console.error("Stream generation error:", streamError);
      res.write(
        `data: ${JSON.stringify({ error: "Lỗi khi tạo stream phản hồi" })}\n\n`,
      );
      res.end();
    }
  } catch (error) {
    console.error("Chat error:", error.message);

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

    // 1. Delete from Supabase pgvector
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("source", filename);

    if (deleteError) {
      throw new Error(`Supabase delete failed: ${deleteError.message}`);
    }

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
