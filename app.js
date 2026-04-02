marked.setOptions({
  gfm: true,
  breaks: true
});

// ==========================
// FORCE CODE
// ==========================
function forceCode(text) {

  if (!text.includes("```")) {

    if (text.includes("<?php")) {
      return "```php\n" + text + "\n```";
    }

    if (text.includes("function") || text.includes("=>")) {
      return "```javascript\n" + text + "\n```";
    }
  }

  return text;
}

// ==========================
// COPY CODE
// ==========================
function addCopyButtons(container) {

  container.querySelectorAll("pre").forEach(pre => {

    if (pre.querySelector(".copy-btn")) return;

    const code = pre.querySelector("code");
    if (!code) return;

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.innerHTML = `<i class="fa-solid fa-copy"></i>`;

    btn.onclick = () => {
      navigator.clipboard.writeText(code.innerText);
      btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
      setTimeout(() => btn.innerHTML = `<i class="fa-solid fa-copy"></i>`, 1000);
    };

    pre.appendChild(btn);
  });
}

// ==========================
// COPY ALL
// ==========================
function addCopyAllButton(bubble) {

  if (bubble.querySelector(".copy-all-btn")) return;

  const btn = document.createElement("button");
  btn.className = "copy-all-btn";
  btn.innerHTML = `<i class="fa-solid fa-copy"></i>`;

  btn.onclick = () => {
    navigator.clipboard.writeText(bubble.innerText);
    btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
    setTimeout(() => btn.innerHTML = `<i class="fa-solid fa-copy"></i>`, 1000);
  };

  bubble.appendChild(btn);
}

// ==========================
// RENDER (🔥 MUHIM)
// ==========================
function renderMessage(bubble, text) {

  text = forceCode(text);

  bubble.innerHTML = marked.parse(text);

  bubble.querySelectorAll("pre code").forEach(block => {
    hljs.highlightElement(block);
  });

  addCopyButtons(bubble);
  addCopyAllButton(bubble);
}

// ==========================
// TYPING (🔥 FIXED)
// ==========================
async function typeMessage(bubble, text) {

  let i = 0;

  while (i < text.length) {
    bubble.textContent = text.slice(0, i);
    i++;
    await new Promise(r => setTimeout(r, 5));
  }

  // 🔥 faqat oxirida render
  renderMessage(bubble, text);
}

// ==========================
// CREATE MESSAGE
// ==========================
function createMessage(text, type, isBot = false) {

  const box = document.getElementById("chat-box");

  const msg = document.createElement("div");
  msg.className = "message " + type;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  msg.appendChild(bubble);
  box.appendChild(msg);

  if (isBot) {
    typeMessage(bubble, text);
  } else {
    bubble.textContent = text;
  }

  box.scrollTop = box.scrollHeight;

  return msg;
}

// ==========================
// RESPONSE PARSER
// ==========================
function extractReply(data) {

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

  if (!reply) reply = "No response";

  return reply;
}

// ==========================
// SEND
// ==========================
async function sendMessage() {

  const input = document.getElementById("user-input");
  const text = input.value.trim();

  if (!text) return;

  createMessage(text, "user");
  input.value = "";

  const loading = createMessage("Typing...", "bot");

  try {

    const res = await fetch("chat.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    loading.remove();

    const reply = extractReply(data);

    createMessage(reply, "bot", true);

  } catch (e) {

    loading.remove();
    createMessage("Server error ❌", "bot", true);
    console.error(e);
  }
}

// ==========================
// ENTER
// ==========================
document.getElementById("user-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });