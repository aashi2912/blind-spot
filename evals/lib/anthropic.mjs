/** Minimal Anthropic Messages client (fetch-based, no dependencies). */
export async function callAnthropic({ apiKey, model, system, prompt, maxTokens = 400, temperature = 0 }) {
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error("Anthropic " + res.status);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error("Anthropic " + res.status + ": " + (await res.text()));
      const data = await res.json();
      return (data.content?.[0]?.text || "").trim();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}
