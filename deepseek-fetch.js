const { chromium } = require("playwright");

const DEFAULT_INPUT_SELECTOR = 'textarea';
const DEFAULT_ASSISTANT_SELECTOR = '.message-content, [class*="message"]';
const DEFAULT_THINKING_SELECTOR = '[class*="think"], [class*="reasoning"]';

async function waitForStableText(locator, maxMs, intervalMs) {
  let last = "";
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    try {
      const text = await locator.innerText();
      if (text === last && text.trim().length > 0) {
        return text;
      }
      last = text;
    } catch (e) {
      break;
    }
    await locator.page().waitForTimeout(intervalMs);
  }

  return last;
}

async function deepseekFetch(promptOrMessages) {
  let prompt;
  if (Array.isArray(promptOrMessages)) {
    prompt = promptOrMessages.map(m => `${m.role}: ${m.content}`).join("\n");
  } else {
    prompt = promptOrMessages;
  }
  const inputSelector = process.env.DEEPSEEK_INPUT_SELECTOR || DEFAULT_INPUT_SELECTOR;
  const assistantSelector = process.env.DEEPSEEK_ASSISTANT_SELECTOR || DEFAULT_ASSISTANT_SELECTOR;
  const thinkingSelector = process.env.DEEPSEEK_THINKING_SELECTOR || DEFAULT_THINKING_SELECTOR;

  console.log('[DeepSeek] Launching browser...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const context = await browser.newContext({
    storageState: process.env.STORAGE_STATE || "deepseek.storage.json",
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    permissions: ['geolocation', 'notifications'],
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log('[Browser Console]:', msg.text());
  });

  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  console.log('[DeepSeek] Opening chat page...');
  
  try {
    await page.goto("https://chat.deepseek.com/", { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });
    
    await page.waitForTimeout(5000);
    
    console.log('[DeepSeek] Checking for Cloudflare...');
    await page.waitForFunction(() => {
      return !document.title.includes('Cloudflare') && !document.body.innerText.includes('Cloudflare');
    }, { timeout: 30000 }).catch(() => {});
    
    console.log('[DeepSeek] Waiting for input box...');
    
    const inputSelectors = [
      'textarea',
      'textarea[placeholder*="问题"]',
      'textarea[placeholder*="输入"]',
      'div[contenteditable="true"]',
    ];
    
    let input = null;
    for (const sel of inputSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 5000 });
        input = el;
        console.log(`[DeepSeek] Found input: ${sel}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!input) {
      throw new Error('Could not find input box');
    }

    console.log('[DeepSeek] Typing prompt...');
    await input.click();
    await page.waitForTimeout(500);
    await input.fill(prompt);
    await page.waitForTimeout(500);
    await input.press('Enter');

    console.log('[DeepSeek] Waiting for response...');
    await page.waitForTimeout(10000);

    const messages = page.locator(assistantSelector);
    let count = await messages.count();
    
    let attempts = 0;
    while (count === 0 && attempts < 30) {
      await page.waitForTimeout(3000);
      count = await messages.count();
      attempts++;
      console.log(`[DeepSeek] Waiting for message... (attempt ${attempts})`);
    }
    
    if (count === 0) {
      await browser.close();
      throw new Error('No response messages found');
    }

    const lastMessage = messages.last();
    console.log('[DeepSeek] Waiting for stable response...');
    const answer = await waitForStableText(lastMessage, 180000, 3000);

    let thinking = "";
    try {
      const thinkingBlocks = page.locator(thinkingSelector);
      const thinkCount = await thinkingBlocks.count();
      if (thinkCount > 0) {
        thinking = await thinkingBlocks.last().innerText();
      }
    } catch (e) {
      console.log('[DeepSeek] No thinking block found');
    }

    await browser.close();

    return { answer, thinking };
  } catch (error) {
    console.error('[DeepSeek] Error:', error.message);
    await browser.close();
    throw error;
  }
}

module.exports = { deepseekFetch };
