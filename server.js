import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.MISTRAL_API_KEY;

// 🧠 HAR USER UCHUN MEMORY
const userHistories = {};

function getHistory(userId) {
  if (!userHistories[userId]) {
    userHistories[userId] = [];
  }
  return userHistories[userId];
}

// 🚫 RATE LIMIT
const rateLimit = {};

app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();

  if (rateLimit[ip] && now - rateLimit[ip] < 4500) {
    return res.json({ reply: "Sekinroq yozing 🙂" });
  }

  rateLimit[ip] = now;
  next();
});

// 🧪 TEST
app.get("/", (req, res) => {
  res.send("TechFox AI backend ishlayapti 🚀");
});

// 💬 CHAT
app.post("/chat", async (req, res) => {
  try {

    if (!API_KEY) {
      return res.json({ reply: "API KEY yo‘q ❌" });
    }

    const userId = req.body.user_id || "default";
    const message = req.body.message;

    if (!message) {
      return res.json({ reply: "Xabar bo‘sh ❌" });
    }

    const history = getHistory(userId);

    history.push({ role: "user", content: message });

    if (history.length > 10) {
      userHistories[userId] = history.slice(-10);
    }

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

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error(err);
      return res.json({ reply: "Server xatolik ⚠️" });
    }

    const data = await apiRes.json();

    let reply = "";

    if (data.outputs?.length) {
      reply = data.outputs[0].content || "";
    }

    if (!reply) reply = "No response";

    history.push({ role: "assistant", content: reply });

    res.json({ reply });

  } catch (e) {
    console.error(e);
    res.json({ reply: "Server error ❌" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running:", PORT);
});
