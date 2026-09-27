import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static("."));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "AI CodeX API" }));

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, language, currentCode = "" } = req.body || {};
    if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Prompt is required." });
    if (prompt.length > 8000) return res.status(400).json({ error: "Prompt is too long." });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI service is not configured." });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions: "You are AI CodeX, a coding assistant. Return only the requested source code, with no Markdown fences or commentary. Produce clear, maintainable code. For HTML requests, return a complete self-contained HTML document when practical.",
      input: `Language/stack: ${language || "Auto"}\nUser request: ${prompt}\n${currentCode ? `Existing code to modify:\n${currentCode.slice(0, 20000)}` : ""}`
    });

    res.json({ code: response.output_text || "", model: process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (error) {
    console.error("AI generation failed:", error);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

app.listen(port, () => console.log(`AI CodeX running on http://localhost:${port}`));