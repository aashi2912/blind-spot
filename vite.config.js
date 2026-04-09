import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "bridge-api-proxy",
        configureServer(server) {
          server.middlewares.use("/api/bridge", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "Method not allowed" }));
            }

            const apiKey = env.LLM_API_KEY;
            if (!apiKey) {
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ reasoning: null, fallback: true }));
            }

            try {
              let body = "";
              for await (const chunk of req) body += chunk;
              const { userFavorites, candidate } = JSON.parse(body);

              const prompt = [
                "You are a film expert helping someone discover movies outside their comfort zone.",
                "",
                "USER'S FAVORITE TITLES AND THEMES:",
                ...userFavorites.map(f => "- " + f),
                "",
                "CANDIDATE MOVIE (from a genre they have never watched):",
                "- Title: " + candidate.title + " (" + candidate.year + ")",
                "- Genres: " + candidate.genres,
                "- Keywords: " + candidate.keywords,
                "- Synopsis: " + candidate.overview,
                "- Rating: " + candidate.rating + "/10",
                "",
                "Write 2-3 sentences explaining WHY this person would enjoy this movie.",
                "Focus on THEMATIC connections to their existing taste.",
                "Do NOT invent facts. Only reference data provided above.",
                'If no genuine connection exists, respond with exactly: NO_BRIDGE',
              ].join("\n");

              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": apiKey,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-haiku-4-5-20251001",
                  max_tokens: 200,
                  messages: [{ role: "user", content: prompt }],
                }),
              });

              if (!response.ok) {
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ reasoning: null, fallback: true }));
              }

              const data = await response.json();
              const reasoning = data.content?.[0]?.text || null;

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reasoning }));
            } catch (err) {
              console.error("Bridge proxy error:", err);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reasoning: null, fallback: true }));
            }
          });
        },
      },
    ],
  };
});
