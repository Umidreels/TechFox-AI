import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.MISTRAL_API_KEY;

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("TechFox AI ishlayapti 🚀");
});

// ==========================
// MEMORY
// ==========================
const userHistories = {};

function getHistory(userId) {
  if (!userHistories[userId]) {
    userHistories[userId] = [];
  }
  return userHistories[userId];
}

// ==========================
// RATE LIMIT (simple)
// ==========================
const rateLimit = {};

function isLimited(ip) {
  const now = Date.now();

  if (rateLimit[ip] && now - rateLimit[ip] < 1500) {
    return true;
  }

  rateLimit[ip] = now;
  return false;
}

// ==========================
// CHAT STREAM
// ==========================
app.post("/chat-stream", async (req, res) => {

  let interval;

  try {

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (isLimited(ip)) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream"
      });

      res.write(`data: ${JSON.stringify("Sekinroq yozing 🙂")}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    if (!API_KEY) {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(`data: ${JSON.stringify("API KEY yo‘q ❌")}\n\n`);
      res.write(`data: [DONE]\n\n`);
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

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
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
      res.write(`data: ${JSON.stringify("API xatolik ❌")}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    const data = await apiRes.json();

    let reply = "";

    if (data.outputs?.length) {
      const content = data.outputs[0].content;

      if (typeof content === "string") {
        reply = content;
      } else if (Array.isArray(content)) {
        reply = content.map(i => i.text || "").join("");
      }
    }

    if (!reply) reply = "AI javob bermadi ❌";

    // STOP handling
    req.on("close", () => {
      if (interval) clearInterval(interval);
    });

    let i = 0;

    interval = setInterval(() => {

      if (i < reply.length) {

        const chunk = reply.slice(i, i + 5);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        i += 5;

      } else {

        clearInterval(interval);

        history.push({
          role: "assistant",
          content: reply
        });

        res.write(`data: [DONE]\n\n`);
        res.end();
      }

    }, 15);

  } catch (e) {
    console.error("SERVER ERROR:", e);
    res.end();
  }
});

// ==========================
// PORT (Railway FIX)
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
