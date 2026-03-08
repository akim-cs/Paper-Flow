import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function geminiText(prompt: string) {
  const res = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });
  return res.text;
}