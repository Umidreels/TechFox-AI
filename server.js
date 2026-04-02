import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 ENV dan olamiz
const API_KEY = process.env.O3HREyk24XwldTuzbS9o4Cijskn4MBI0;

app.post("/chat", async (req, res) => {
  try {

    const userMessage = req.body.message;

    const response = await fetch("https://api.mistral.ai/v1/conversations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: "ag_019d4568d82d75a9b13d78ecbecf09a6",
        agent_version: 1,
        inputs: [
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    // 🔥 FULL RESPONSE FIX
    let reply = "";

    if (data.outputs?.length) {
      const content = data.outputs[0].content;

      if (Array.isArray(content)) {
        reply = content.map(i => i.text || "").join("");
      } else {
        reply = content;
      }
    }

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server error ❌" });
  }
});

// 🔥 RAILWAY PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port:", PORT);
});
