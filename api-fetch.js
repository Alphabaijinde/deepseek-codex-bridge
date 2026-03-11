const OpenAI = require("openai");

const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModels: {
      reasoning: "deepseek/deepseek-r1",
      fast: "deepseek/deepseek-v3.2",
      free: "openrouter/free",
    },
    supportsReasoning: true,
  },
  openai: {
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModels: {
      reasoning: "o1",
      fast: "gpt-4o-mini",
    },
    supportsReasoning: false,
  },
  anthropic: {
    name: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    defaultModels: {
      reasoning: "claude-3-opus-20240229",
      fast: "claude-3-haiku-20240307",
    },
    supportsReasoning: false,
  },
};

function getProvider() {
  const providerName = process.env.API_PROVIDER || "openrouter";
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}

function getModel(provider) {
  const role = process.env.API_ROLE || "fast";
  const envModel = process.env.API_MODEL;
  
  if (envModel) return envModel;
  
  const defaultModel = provider.defaultModels[role];
  if (!defaultModel) {
    throw new Error(`Unknown role: ${role}. Available: ${Object.keys(provider.defaultModels).join(", ")}`);
  }
  return defaultModel;
}

function getApiKey(providerName) {
  const keyMap = {
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
  };
  
  const key = process.env[keyMap[providerName]];
  if (!key) {
    throw new Error(`${keyMap[providerName]} not set for provider: ${providerName}`);
  }
  return key;
}

async function apiFetch(prompt) {
  const provider = getProvider();
  const model = getModel(provider);
  const apiKey = getApiKey(provider.name.toLowerCase());
  const includeReasoning = process.env.INCLUDE_REASONING !== "false";

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });

  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const extraParams = {};
  if (includeReasoning && provider.supportsReasoning && model.includes("deepseek")) {
    extraParams.reasoning = { effort: "high" };
  }

  const response = await client.chat.completions.create({
    model,
    messages,
    ...extraParams,
  });

  const answer = response.choices[0].message.content;
  let thinking = "";

  if (response.choices[0].message.reasoning) {
    thinking = response.choices[0].message.reasoning;
  }

  return { answer, thinking, model, provider: provider.name };
}

module.exports = { apiFetch, PROVIDERS };
