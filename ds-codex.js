const { spawn } = require("node:child_process");
const { deepseekFetch } = require("./deepseek-fetch");
const { apiFetch } = require("./api-fetch");
const { reverseFetch } = require("./reverse-fetch");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    
    process.stdin.on("data", (chunk) => (data += chunk));
    
    process.stdin.on("end", () => resolve(data.trim()));
    
    // Also handle case where stdin closes immediately (pipe mode)
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
  const userQuestion = await readStdin();
  if (!userQuestion) {
    process.stderr.write("No input provided on stdin.\n");
    process.exit(1);
  }

  const useMode = process.env.USE_MODE || "reverse";
  let answer, thinking, model, provider;

  if (useMode === "web") {
    const result = await deepseekFetch(userQuestion);
    answer = result.answer;
    thinking = result.thinking;
    provider = "DeepSeek Web";
  } else if (useMode === "reverse") {
    const result = await reverseFetch(userQuestion);
    answer = result.answer;
    thinking = result.thinking;
    model = result.model;
    provider = result.provider;
  } else {
    const result = await apiFetch(userQuestion);
    answer = result.answer;
    thinking = result.thinking;
    model = result.model;
    provider = result.provider;
  }

  const parts = [
    `User question:`,
    userQuestion,
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
