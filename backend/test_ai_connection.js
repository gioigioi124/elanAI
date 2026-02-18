import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("Checking Pinecone...");
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const indexes = await pc.listIndexes();
    console.log("Indexes:", JSON.stringify(indexes, null, 2));

    if (indexes.indexes.length > 0) {
      const indexName = process.env.PINECONE_INDEX_NAME || "chatbot";
      const index = pc.index(indexName);
      const stats = await index.describeIndexStats();
      console.log(`Stats for ${indexName}:`, JSON.stringify(stats, null, 2));
    }
  } catch (err) {
    console.error("Pinecone Error:", err.message);
  }

  console.log("\nChecking Gemini Embedding (text-embedding-004)...");
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent("Hello world");
    console.log("Embedding size:", result.embedding.values.length);
  } catch (err) {
    console.error("Gemini Error:", err.message);
  }
}

test();
