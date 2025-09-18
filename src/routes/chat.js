// backend/src/routes/chat.js

const express = require("express");
const router = express.Router();
const { embedText } = require("../services/embeddings");
const { queryVectors } = require("../services/vectorStore");
const { callGeminiStream } = require("../services/geminiClient");

// GET version for SSE + streaming
router.get("/stream", async (req, res) => {
  const { sessionId, message } = req.query;
  if (!sessionId || !message) {
    return res.status(400).send("sessionId and message query params required");
  }

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  try {
    // 1) embed the user message
    const embedding = await embedText(message);

    // 2) retrieve nearest passages
    const passages = await queryVectors(embedding, 5);

    let prompt;
    if (passages.length === 0) {
      // Fallback to Gemini's own knowledge
      prompt = `The user asked: "${message}". Please answer from your own knowledge.`;
    } else {
      // Build context text from passages
      const contextText = passages
        .map((p, idx) => `Passage ${idx + 1}:\n${p.text}`)
        .join("\n\n");

      prompt = `You are a helpful assistant. Use the following context passages to answer the user. Be factual, cite only from passages.\n\n${contextText}\n\nUser: ${message}\nAssistant:`;
    }

    // 3) stream Gemini output
    await callGeminiStream(prompt, (chunk) => {
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    });

    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (err) {
    console.error("Error in GET /stream:", err);
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
    );
    res.end();
  }
});

// POST version (same change)
router.post("/stream", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res
      .status(400)
      .json({ error: "sessionId and message are required" });
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  try {
    const embedding = await embedText(message);
    const passages = await queryVectors(embedding, 5);

    let prompt;
    if (passages.length === 0) {
      prompt = `The user asked: "${message}". Please answer from your own knowledge.`;
    } else {
      const contextText = passages
        .map((p, idx) => `Passage ${idx + 1}:\n${p.text}`)
        .join("\n\n");

      prompt = `You are a helpful assistant. Use the following context passages to answer the user. Be factual, cite only from passages.\n\n${contextText}\n\nUser: ${message}\nAssistant:`;
    }

    await callGeminiStream(prompt, (chunk) => {
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    });

    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (err) {
    console.error("Error in POST /stream:", err);
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
    );
    res.end();
  }
});

module.exports = router;
