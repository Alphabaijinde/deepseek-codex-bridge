const { chromium } = require("playwright");
const readline = require("node:readline");

async function waitForEnter(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => rl.question(message, resolve));
  rl.close();
}

(async () => {
  console.log('[DeepSeek Session Saver] Starting browser...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Browser]:', msg.text());
    }
  });

  console.log('[DeepSeek Session Saver] Opening DeepSeek chat...');
  await page.goto("https://chat.deepseek.com/", { waitUntil: 'networkidle', timeout: 60000 });

  console.log('[DeepSeek Session Saver] Please log in manually.');
  console.log('[DeepSeek Session Saver] After logging in, press Enter to save session...');
  
  await waitForEnter('> ');

  const storagePath = process.env.STORAGE_STATE || "deepseek.storage.json";
  await context.storageState({ path: storagePath });
  
  console.log(`[DeepSeek Session Saver] Session saved to: ${storagePath}`);
  
  await browser.close();
  process.exit(0);
})();
