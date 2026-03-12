const { spawn } = require("node:child_process");
const { deepseekFetch } = require("./deepseek-fetch");
const { apiFetch } = require("./api-fetch");
const { reverseFetch } = require("./reverse-fetch");
const { loadHistory, addToHistory, clearHistory, getHistory } = require("./conversation-history");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    
    process.stdin.on("data", (chunk) => (data += chunk));
    
    process.stdin.on("end", () => resolve(data.trim()));
    
    setTimeout(() => {
      if (data) resolve(data.trim());
    }, 100);
  });
}

function getCodexArgs() {
  const argsJson = process.env.CODEX_ARGS_JSON;
  if (argsJson) {
    return JSON.parse(argsJson);
  }

  const args = process.env.CODEX_ARGS || "";
  return args ? args.split(" ") : [];
}

(async () => {
  const cliArgs = process.argv.slice(2);
  
  if (cliArgs.includes("--clear-history")) {
    clearHistory();
    console.log("Conversation history cleared.");
    process.exit(0);
  }
  
  if (cliArgs.includes("--show-history")) {
    const history = getHistory();
    console.log("=== Conversation History ===");
    history.forEach((msg, i) => {
      console.log(`\n[${msg.role}] ${msg.content.substring(0, 100)}...`);
    });
    console.log(`\nTotal: ${history.length} messages`);
    process.exit(0);
  }
  
  const userQuestion = await readStdin();
  if (!userQuestion) {
    process.stderr.write("No input provided on stdin.\n");
    process.exit(1);
  }

  const useMode = process.env.USE_MODE || "reverse";
  const includeContext = process.env.INCLUDE_CONTEXT !== "false";
  
  let historyMessages = [];
  if (includeContext) {
    historyMessages = loadHistory();
  }
  
  const useHistory = process.env.USE_HISTORY !== "false";
  let messagesForDeepSeek = [];
  
  if (useHistory && includeContext && historyMessages.length > 0) {
    historyMessages.forEach(msg => {
      if (msg.role === "user") {
        messagesForDeepSeek.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        messagesForDeepSeek.push({ role: "assistant", content: msg.content });
      }
    });
  }
  messagesForDeepSeek.push({ role: "user", content: userQuestion });
  
  let answer, thinking, model, provider;

  if (useMode === "web") {
    const result = await deepseekFetch(messagesForDeepSeek);
    answer = result.answer;
    thinking = result.thinking;
    provider = "DeepSeek Web";
  } else if (useMode === "reverse") {
    const result = await reverseFetch(messagesForDeepSeek);
    answer = result.answer;
    thinking = result.thinking;
    model = result.model;
    provider = result.provider;
  } else {
    const result = await apiFetch(messagesForDeepSeek);
    answer = result.answer;
    thinking = result.thinking;
    model = result.model;
    provider = result.provider;
  }

  if (useHistory) {
    addToHistory("user", userQuestion);
    addToHistory("assistant", answer);
  }
  
  let contextInfo = "";
  if (includeContext && historyMessages.length > 0) {
    // Get configurable number of history messages (default: all)
    const maxHistoryMessages = parseInt(process.env.MAX_HISTORY_MESSAGES || "999", 10);
    const recentHistory = historyMessages.slice(-maxHistoryMessages);
    
    contextInfo = `\n\n[Conversation History (${recentHistory.length} messages)]\n`;
    recentHistory.forEach(msg => {
      // Full content, no truncation - Codex needs complete context
      contextInfo += `${msg.role}: ${msg.content}\n\n`;
    });
  }
  
  const parts = [
    `User question:${contextInfo ? "" : "\n"}${userQuestion}`,
    ``,
    `[${provider}${model ? ` (${model})` : ""}] Response:`,
    answer || "(empty)",
  ];

  if (thinking) {
    parts.push("", "Reasoning/Thinking:", thinking);
  }

  const prompt = parts.join("\n");

  const cmd = process.env.CODEX_CMD || "codex";
  const args = ["exec", "--skip-git-repo-check", prompt];

  const proc = spawn(cmd, args, { stdio: ["inherit", "inherit", "inherit"] });
})().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
