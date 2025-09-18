// backend/src/services/geminiClient.js

require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function callGemini(context) {
  if (!context) throw new Error("No context provided to Gemini");
  const resp = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: context }] }],
    // optional extra settings
  });
  return resp.text;
}

async function callGeminiStream(context, onChunk) {
  if (!context) throw new Error("No context provided to callGeminiStream");

  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: context }] }],
    // you can add params like temperature, max tokens, etc.
  });

  for await (const part of stream) {
    if (part.text) {
      onChunk(part.text);
    } else if (
      part.candidates &&
      part.candidates[0] &&
      part.candidates[0].text
    ) {
      onChunk(part.candidates[0].text);
    }
    // else skip if no usable chunk
  }
}

module.exports = { callGemini, callGeminiStream };
