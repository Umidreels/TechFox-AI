import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ==========================
// 🔐 ENV
// ==========================
const API_KEY = process.env.MISTRAL_API_KEY;

// ==========================
// 🧠 SYSTEM PROMPT
// ==========================
const SYSTEM_PROMPT = `
You are TechFox AI — professional IT tutor.

Rules:
- Always respond in clean Markdown
- Use headings, lists, and code blocks
- Wrap code in triple backticks
- Explain step-by-step
- Be clear and structured
- Answer in Uzbek language
`;

// ==========================
// 🧠 MEMORY (simple)
// ==========================
let history = [];

function addToHistory(role, content) {
  history.push({ role, content });

  // faqat oxirgi 10 ta saqlanadi
  if (history.length > 10) {
    history = history.slice(-10);
  }
}

// ==========================
// 🚫 RATE LIMIT
// ==========================
const rateLimitMap = {};

app.use((req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();

  if (rateLimitMap[ip] && now - rateLimitMap[ip] < 1500) {
    return res.json({ reply: "Sekinroq yozing 🙂" });
  }

  rateLimitMap[ip] = now;
  next();
});

// ==========================
// 🧪 HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("TechFox AI backend ishlayapti 🚀");
});

// ==========================
// 💬 CHAT ENDPOINT
// ==========================
app.post("/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.json({ reply: "API KEY yo‘q ❌" });
    }

    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ reply: "Xabar bo‘sh ❌" });
    }

    // user message history
    addToHistory("user", userMessage);

    const apiRes = await fetch(
      "https://api.mistral.ai/v1/conversations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agent_id: "ag_019d4568d82d75a9b13d78ecbecf09a6",
          agent_version: 1,
          inputs: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history
          ]
        })
      }
    );

    // ==========================
    // ❌ API ERROR
    // ==========================
    if (!apiRes.ok) {
  const errText = await apiRes.text();
  console.error("API ERROR FULL:", errText);

  return res.json({
    reply: "API ERROR: " + errText
  });
    }

    // ==========================
    // 🔍 RAW RESPONSE
    // ==========================
    const raw = await apiRes.text();
    console.log("RAW:", raw);

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.json({
        reply: "API JSON xato ❌"
      });
    }

    // ==========================
    // 🧠 EXTRACT REPLY
    // ==========================
    let reply = "";

    if (data.reply) {
      reply = data.reply;
    }

    else if (data.outputs?.length) {
      const content = data.outputs[0].content;

      if (Array.isArray(content)) {
        reply = content.map(i => i.text || "").join("");
      }

      else if (typeof content === "string") {
        reply = content;
      }
    }

    if (!reply) {
      reply = "No response";
    }

    // assistant history
    addToHistory("assistant", reply);

    res.json({ reply });

  } catch (e) {
    console.error("SERVER ERROR:", e);

    res.json({
      reply: "Server error ❌"
    });
  }
});

// ==========================
// 🚀 START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port:", PORT);
});
