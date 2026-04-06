import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import TelegramBot from "node-telegram-bot-api";

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.MISTRAL_API_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

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
// RATE LIMIT
// ==========================
const rateLimit = {};

function isLimited(id) {
  const now = Date.now();

  if (rateLimit[id] && now - rateLimit[id] < 1500) {
    return true;
  }

  rateLimit[id] = now;
  return false;
}

// ==========================
// AI REQUEST FUNCTION
// ==========================
async function askAI(history) {

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

  if (!apiRes.ok) return "API xatolik ❌";

  let data;

  try {
    data = await apiRes.json();
  } catch {
    return "API parse error ❌";
  }

  let reply = "";

  if (data.outputs?.length) {
    const content = data.outputs[0].content;

    if (typeof content === "string") {
      reply = content;
    } else if (Array.isArray(content)) {
      reply = content.map(i => i.text || "").join("");
    }
  }

  return reply || "AI javob bermadi ❌";
}

// ==========================
// CHAT (TELEGRAM / JSON)
// ==========================
app.post("/chat", async (req, res) => {
  try {

    const userId = req.body.user_id || "telegram";
    const message = req.body.message;

    if (isLimited(userId)) {
      return res.json({ reply: "Sekinroq yozing 🙂" });
    }

    if (!API_KEY) {
      return res.json({ reply: "API KEY yo‘q ❌" });
    }

    if (!message) {
      return res.json({ reply: "Xabar bo‘sh ❌" });
    }

    const history = getHistory(userId);
    history.push({ role: "user", content: message });

    if (history.length > 10) {
      userHistories[userId] = history.slice(-10);
    }

    const reply = await askAI(history);

    history.push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (e) {
    console.error("CHAT ERROR:", e);
    res.json({ reply: "Server xatolik ❌" });
  }
});

// ==========================
// CHAT STREAM (WEB)
// ==========================
app.post("/chat-stream", async (req, res) => {

  let interval;

  try {

    const userId = req.body.user_id || "web";
    const message = req.body.message;

    if (isLimited(userId)) {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
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

    const reply = await askAI(history);

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
    console.error("STREAM ERROR:", e);
    res.end();
  }
});

// ==========================
// TELEGRAM BOT
// ==========================
if (BOT_TOKEN) {

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🦊 TechFox AI ga xush kelibsiz!");
  });

  bot.on("message", async (msg) => {

    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/") || msg.from.is_bot) return;

    const typing = setInterval(() => {
      bot.sendChatAction(chatId, "typing");
    }, 4000);

    try {

      const res = await fetch(`http://127.0.0.1:${PORT}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          user_id: chatId.toString()
        })
      });

      const data = await res.json();

      clearInterval(typing);

      bot.sendMessage(chatId, data.reply);

    } catch (e) {
      clearInterval(typing);
      bot.sendMessage(chatId, "Xatolik ❌");
    }
  });

  console.log("🤖 Telegram bot ishga tushdi");
}

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});