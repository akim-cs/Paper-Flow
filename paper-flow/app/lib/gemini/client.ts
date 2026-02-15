import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({})

export async function geminiText(prompt: string) {
  const res = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });
  return res.text;
}

export async function geminiVision(file: Uint8Array, prompt: string) {
  const contents = [
    { text: prompt },
    { inlineData: {
      mimeType: 'application/pdf',
      data: Buffer.from(file).toString("base64")
    }}
  ];
  const res = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents
  });
  return res.text;
}