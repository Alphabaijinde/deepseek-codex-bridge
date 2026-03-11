const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = "/home/user/work/workspace/deepseek-codex-bridge/reverse-api.config.json";
const CONTAINER_NAME = "deepseek2api";

async function dockerRun() {
  const configPath = "/home/user/work/workspace/deepseek-codex-bridge/reverse-api.config.json";
  
  return new Promise((resolve, reject) => {
    spawn("docker", ["stop", CONTAINER_NAME], { stdio: "inherit" })
      .on("close", () => {
        spawn("docker", ["rm", CONTAINER_NAME], { stdio: "inherit" })
          .on("close", () => {
            const proc = spawn("docker", [
              "run", "-d",
              "--name", CONTAINER_NAME,
              "-p", "5001:5001",
              "-v", `${configPath}:/app/config.json`,
              "ghcr.io/iidamie/deepseek2api:latest"
            ], { stdio: "inherit" });

            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Docker run failed with code ${code}`));
            });
          });
      });
  });
}

function updateConfig(token) {
  let rawToken = token;
  try {
    const parsed = JSON.parse(token);
    rawToken = parsed.value || token;
  } catch {}
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  config.accounts[0].token = rawToken;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("✓ Updated config file");
  return rawToken;
}

async function testAPI(token) {
  const { spawn: sp } = require("child_process");
  return new Promise((resolve) => {
    const proc = sp("curl", [
      "-s", "http://127.0.0.1:5001/v1/chat/completions",
      "-H", "Content-Type: application/json",
      "-H", `Authorization: Bearer ${token}`,
      "-d", '{"model":"deepseek-reasoner","messages":[{"role":"user","content":"hi"}],"max_tokens":10}'
    ]);
    
    let data = "";
    proc.stdout.on("data", (chunk) => data += chunk);
    proc.on("close", (code) => {
      if (code === 0 && data.includes("content")) {
        console.log("✓ API test passed");
        resolve(true);
      } else {
        console.log("✗ API test failed:", data.substring(0, 100));
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log("=== DeepSeek Token Refresh ===\n");
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("https://chat.deepseek.com/");
  
  const initialToken = await page.evaluate(() => localStorage.getItem("userToken")).catch(() => null);
  console.log("Clearing any existing session...");
  
  try {
    await page.evaluate(() => localStorage.clear());
  } catch {}
  
  console.log("\n=== Please scan WeChat QR code to login ===\n");
  console.log("Waiting for new login...\n");
  
  let token = null;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(5000);
    
    let currentToken = null;
    try {
      currentToken = await page.evaluate(async () => {
        const token = localStorage.getItem("userToken");
        if (token) return token;
        
        const cookies = await document.cookie;
        const userTokenCookie = cookies.split(';').find(c => c.trim().startsWith('userToken='));
        if (userTokenCookie) return userTokenCookie.split('=')[1];
        
        return null;
      });
    } catch {
      continue;
    }
    
    if (currentToken && currentToken !== initialToken) {
      token = currentToken;
      console.log("✓ New token detected after login!\n");
      break;
    }
    
    if (i % 12 === 0) {
      console.log("Waiting for QR scan...");
    }
  }
  
  await browser.close();
  
  if (!token) {
    console.log("✗ No token received. Please try again.");
    process.exit(1);
  }
  
  let rawToken = token;
  try {
    const parsed = JSON.parse(token);
    rawToken = parsed.value || token;
  } catch {}
  
  console.log("Updating config file...");
  updateConfig(rawToken);
  
  const envPath = "/home/user/work/workspace/deepseek-codex-bridge/.env.reverse";
  const envContent = `export USE_MODE=reverse
export REVERSE_API_BASE_URL="http://127.0.0.1:5001/v1"
export REVERSE_API_KEY="${rawToken}"
export REVERSE_API_MODEL="deepseek-reasoner"
`;
  fs.writeFileSync(envPath, envContent);
  console.log("✓ Updated .env.reverse");
  
  console.log("Restarting Docker container...");
  await dockerRun();
  
  // Wait for API to start
  console.log("Waiting for API to start...");
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Testing API...");
  const success = await testAPI(rawToken);
  
  if (success) {
    console.log("\n=== Token refresh complete! ===");
    console.log("DeepSeek reverse API is now running with new token.");
  } else {
    console.log("\n⚠ Token may have been saved but API test failed.");
    console.log("Try again in a few seconds.");
  }
}

main().catch(console.error);
