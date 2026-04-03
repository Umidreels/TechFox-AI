import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

// 🔐 ENV
const API_KEY = process.env.MISTRAL_API_KEY;

// 🧠 MEMORY
let history = [];

function addToHistory(role, content) {
  history.push({ role, content });

  if (history.length > 10) {
    history = history.slice(-10);
  }
}

// 🚫 RATE LIMIT
const rateLimit = {};

app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();

  if (rateLimit[ip] && now - rateLimit[ip] < 1500) {
    return res.json({ reply: "Sekinroq yozing 🙂" });
  }

  rateLimit[ip] = now;
  next();
});

// 🧪 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("TechFox AI backend ishlayapti 🚀");
});

// 💬 CHAT
app.post("/chat", async (req, res) => {
  try {

    if (!API_KEY) {
      return res.json({ reply: "API KEY yo‘q ❌" });
    }

    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ reply: "Xabar bo‘sh ❌" });
    }

    // user history
    addToHistory("user", userMessage);

    const apiRes = await fetch("https://api.mistral.ai/v1/conversations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: "ag_019d4568d82d75a9b13d78ecbecf09a6",
        agent_version: 1,
        inputs: history
      })
    });

    // ❌ API ERROR
    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error("API ERROR:", err);

      return res.json({
        reply: "Serverda muammo ⚠️"
      });
    }

    // 🔍 RAW
    const raw = await apiRes.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.json({ reply: "JSON parse xato ❌" });
    }

    // ✅ EXTRACT (SIZNING FORMATGA MOS)
    let reply = "";

    if (data.outputs && data.outputs.length > 0) {
      reply = data.outputs[0].content || "";
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

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running:", PORT);
});
