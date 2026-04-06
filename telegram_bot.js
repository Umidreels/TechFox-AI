import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

// ==========================
// CONFIG
// ==========================
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL || "https://techfox-ai.up.railway.app/chat";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN yo‘q ❌");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==========================
// SIMPLE STATE (in-memory)
// ==========================
const lastRequestTime = {};   // anti-spam
const userStats = {};         // usage stats

function isLimited(userId) {
  const now = Date.now();
  if (lastRequestTime[userId] && now - lastRequestTime[userId] < 1500) {
    return true;
  }
  lastRequestTime[userId] = now;
  return false;
}

function incUserStat(userId) {
  if (!userStats[userId]) {
    userStats[userId] = { messages: 0 };
  }
  userStats[userId].messages++;
}

// ==========================
// UTILS
// ==========================
async function sendTyping(chatId, ms = 2000) {
  try {
    await bot.sendChatAction(chatId, "typing");
    if (ms) {
      await new Promise(r => setTimeout(r, ms));
    }
  } catch {}
}

async function sendLongMessage(chatId, text, extra = {}) {
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
  for (const part of chunks) {
    await bot.sendMessage(chatId, part, extra);
  }
}

function mainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 New Chat", callback_data: "new_chat" },
          { text: "📊 Stats", callback_data: "stats" }
        ],
        [
          { text: "❓ Help", callback_data: "help" }
        ]
      ]
    }
  };
}

// ==========================
// COMMANDS
// ==========================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const text = `🦊 *TechFox AI*

Men sizga:
- Dasturlashni o‘rgataman
- Kod yozishda yordam beraman
- AI va IT savollarga javob beraman

Savolingizni yozing 👇`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    ...mainKeyboard()
  });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const text = `ℹ️ *Yordam*

- Oddiy savol yozing
- Kod yuborsangiz tahlil qilaman
- 🔄 New Chat — history tozalaydi
- 📊 Stats — sizning statistikangiz`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    ...mainKeyboard()
  });
});

bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "__clear__",       // backendda optional handle qilsa bo‘ladi
        user_id: chatId.toString()
      })
    });
  } catch {}

  await bot.sendMessage(chatId, "🧹 Chat tozalandi", mainKeyboard());
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const stat = userStats[chatId]?.messages || 0;

  await bot.sendMessage(chatId, `📊 Siz yuborgan xabarlar: *${stat} ta*`, {
    parse_mode: "Markdown",
    ...mainKeyboard()
  });
});

// ==========================
// INLINE BUTTON HANDLER
// ==========================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try {
    if (data === "new_chat") {
      // server tarafda alohida clear endpoint bo‘lmasa, oddiy xabar beramiz
      await bot.sendMessage(chatId, "🧹 Yangi chat boshlandi", mainKeyboard());
    }

    if (data === "stats") {
      const stat = userStats[chatId]?.messages || 0;
      await bot.sendMessage(chatId, `📊 Siz yuborgan xabarlar: *${stat} ta*`, {
        parse_mode: "Markdown",
        ...mainKeyboard()
      });
    }

    if (data === "help") {
      await bot.sendMessage(chatId, "❓ Savolingizni yozing — men yordam beraman.", mainKeyboard());
    }

    await bot.answerCallbackQuery(query.id);
  } catch (e) {
    console.error("CALLBACK ERROR:", e);
  }
});

// ==========================
// MAIN MESSAGE HANDLER
// ==========================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // commandlarni skip
  if (!text || text.startsWith("/")) return;

  // anti-spam
  if (isLimited(chatId)) {
    return bot.sendMessage(chatId, "Sekinroq yozing 🙂");
  }

  incUserStat(chatId);

  try {
    await sendTyping(chatId, 800);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        user_id: chatId.toString()
      })
    });

    if (!res.ok) {
      return bot.sendMessage(chatId, "Server xatolik ❌", mainKeyboard());
    }

    const data = await res.json();
    const reply = data.reply || "Javob yo‘q ❌";

    await sendLongMessage(chatId, reply, mainKeyboard());

  } catch (e) {
    console.error("BOT ERROR:", e);

    await bot.sendMessage(chatId, "Xatolik yuz berdi ❌", mainKeyboard());
  }
});

// ==========================
// GLOBAL ERROR
// ==========================
bot.on("polling_error", (err) => {
  console.error("POLLING ERROR:", err);
});

console.log("🤖 TechFox Telegram Bot ishga tushdi");