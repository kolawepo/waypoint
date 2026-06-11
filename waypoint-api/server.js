import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/summarize", async (req, res) => {
  try {
    const { platform, text } = req.body;

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Not enough text to summarize" });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: `
You summarize AI work sessions for handoff into a new AI chat.

Return only this format:

What we were doing:
<1-2 sentence summary>

Current state:
• <completed/current fact>
• <completed/current fact>
• <blocked issue if any>

Next step:
<clear next action>

Rules:
- Do not include UI text.
- Do not include "ChatGPT can make mistakes."
- Do not mention this summary request.
- Be specific enough that another AI can continue the work.

Platform: ${platform}

Conversation:
${text.slice(-12000)}
`,
    });

    res.json({ summary: response.output_text });
  } catch (err) {
    console.error("Summary failed:", err);
    res.status(500).json({ error: "Summary failed" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Waypoint API running on port", process.env.PORT || 3001);
});