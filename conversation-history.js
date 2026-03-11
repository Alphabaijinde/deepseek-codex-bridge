const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, ".conversation_history.json");

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch {}
  return [];
}

function saveHistory(messages) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(messages, null, 2));
}

function addToHistory(role, content) {
  const history = loadHistory();
  history.push({ role, content, timestamp: Date.now() });
  saveHistory(history);
}

function clearHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE);
  }
}

function getHistory() {
  return loadHistory();
}

module.exports = { loadHistory, saveHistory, addToHistory, clearHistory, getHistory };
