function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

async function reverseFetch(prompt) {
  const baseUrl =
    process.env.REVERSE_API_BASE_URL || "http://127.0.0.1:5001/v1";
  const apiKey = process.env.REVERSE_API_KEY || "local-key";
  const model = process.env.REVERSE_API_MODEL || "deepseek-reasoner";

  let response;

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach reverse API at ${baseUrl}: ${reason}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reverse API ${response.status}: ${text}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;

  if (!message) {
    throw new Error("Reverse API returned no assistant message");
  }

  return {
    answer: normalizeContent(message.content),
    thinking: normalizeContent(message.reasoning_content),
    model: data.model || model,
    provider: "DeepSeek Reverse API",
  };
}

module.exports = { reverseFetch };
