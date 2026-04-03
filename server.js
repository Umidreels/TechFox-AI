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

const API_KEY = process.env.MISTRAL_API_KEY;

app.post("/chat", async (req, res) => {
  try {

    if (!API_KEY) {
      return res.json({ reply: "API KEY yo‘q ❌" });
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
        inputs: [
          { role: "user", content: req.body.message }
        ]
      })
    });

    // 🔥 MUHIM: har doim text qilib olamiz
    const raw = await apiRes.text();

    console.log("RAW RESPONSE:", raw);

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.json({ reply: "API JSON error ❌" });
    }

    let reply = "";

    if (data.reply) {
      reply = data.reply;
    }

    else if (data.outputs?.length) {

      const content = data.outputs[0].content;

      // 🔥 ARRAY bo‘lsa
      if (Array.isArray(content)) {
        reply = content.map(i => i.text || "").join("");
      }

      // 🔥 STRING bo‘lsa
      else if (typeof content === "string") {
        reply = content;
      }
    }

    if (!reply) {
      reply = "No response";
    }

    res.json({ reply });

  } catch (e) {
    console.error("SERVER ERROR:", e);
    res.json({ reply: "Server error ❌" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
