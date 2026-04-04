import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.MISTRAL_API_KEY;

// 🧠 MULTI USER MEMORY
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

  if (rateLimit[ip] && now - rateLimit[ip] < 1500) {
    return res.json({ reply: "Sekinroq yozing 🙂" });
  }

  rateLimit[ip] = now;
  next();
});

// 🧪 TEST
app.get("/", (req, res) => {
  res.send("TechFox AI backend ishlayapti 🚀");
});

// ==========================
// 🔥 STREAM CHAT
// ==========================
app.post("/chat-stream", async (req, res) => {
  try {

    if (!API_KEY) {
      return res.end();
    }

    const userId = req.body.user_id || "default";
    const message = req.body.message;

    if (!message) return res.end();

    const history = getHistory(userId);

    history.push({ role: "user", content: message });

    if (history.length > 10) {
      userHistories[userId] = history.slice(-10);
    }

    // SSE HEADERS
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

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
      res.write(`data: Xatolik yuz berdi ❌\n\n`);
      return res.end();
    }

    const data = await apiRes.json();

    let reply = "";

    if (data.outputs?.length) {
      reply = data.outputs[0].content || "";
    }

    if (!reply) reply = "No response";

    // 🔥 STREAM (harfma-harf)
    let i = 0;

    const interval = setInterval(() => {

      if (i < reply.length) {
        res.write(`data: ${reply[i]}\n\n`);
        i++;
      } else {

        clearInterval(interval);

        history.push({
          role: "assistant",
          content: reply
        });

        res.write(`data: [DONE]\n\n`);
        res.end();
      }

    }, 8);

  } catch (e) {
    console.error(e);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running:", PORT);
});
