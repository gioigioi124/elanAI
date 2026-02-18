import { genAI } from "./src/config/ai.js";

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();
    if (data.models) {
      data.models.forEach((m) => console.log(m.name));
    } else {
      console.log("Error response:", data);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
