import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const indexName = process.env.PINECONE_INDEX_NAME || "chatbot";
