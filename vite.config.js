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
                ...userFavorites.map((f) => "- " + f),
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
                headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
              });
              if (!response.ok) {
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ reasoning: null, fallback: true }));
              }
              const data = await response.json();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reasoning: data.content?.[0]?.text || null }));
            } catch (err) {
              console.error("Bridge proxy error:", err);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reasoning: null, fallback: true }));
            }
          });
        },
      },
      {
        name: "summary-api-proxy",
        configureServer(server) {
          server.middlewares.use("/api/summary", async (req, res) => {
            res.setHeader("Content-Type", "application/json");
            if (req.method !== "POST") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "Method not allowed" }));
            }
            const apiKey = env.LLM_API_KEY;
            if (!apiKey) return res.end(JSON.stringify({ summary: null, fallback: true }));
            try {
              let body = "";
              for await (const chunk of req) body += chunk;
              const { titleCount, topGenres = [], topDecade, language } = JSON.parse(body || "{}");
              const genreLine = topGenres.map((g) => g.name + " " + g.pct + "%").join(", ");
              const prompt = [
                "You describe a person's streaming taste as a single vivid one-line identity.",
                "",
                "DATA:",
                "- Titles watched: " + titleCount,
                "- Top genres: " + genreLine,
                "- Dominant decade: " + (topDecade || "unknown"),
                "- Language: " + (language ? language.pct + "% " + language.name : "unknown"),
                "",
                "Write ONE sentence, max 18 words, describing them (e.g. 'A prestige-crime loyalist with a 2010s streak').",
                "Be specific and a little playful, but accurate to the data. No preamble, no quotation marks.",
              ].join("\n");
              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 60, messages: [{ role: "user", content: prompt }] }),
              });
              if (!response.ok) return res.end(JSON.stringify({ summary: null, fallback: true }));
              const data = await response.json();
              res.end(JSON.stringify({ summary: data.content?.[0]?.text || null }));
            } catch (err) {
              console.error("Summary proxy error:", err);
              res.end(JSON.stringify({ summary: null, fallback: true }));
            }
          });
        },
      },
      {
        name: "tmdb-api-proxy",
        configureServer(server) {
          const TMDB_BASE = "https://api.themoviedb.org/3";
          const ALLOWED_PREFIXES = ["/search", "/movie", "/tv", "/discover", "/trending", "/genre"];
          server.middlewares.use("/api/tmdb", async (req, res) => {
            res.setHeader("Content-Type", "application/json");
            if (req.method !== "GET") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "Method not allowed" }));
            }
            const apiKey = env.TMDB_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: "TMDB key not configured (set TMDB_KEY in .env)" }));
            }
            const qIndex = req.url.indexOf("?");
            const search = qIndex >= 0 ? req.url.slice(qIndex + 1) : "";
            const params = new URLSearchParams(search);
            const path = params.get("path");
            if (!path || !path.startsWith("/")) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: "Missing or invalid 'path' param" }));
            }
            if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: "Path not allowed" }));
            }
            const target = new URL(TMDB_BASE + path);
            params.forEach((v, k) => { if (k !== "path") target.searchParams.set(k, v); });
            target.searchParams.set("api_key", apiKey);
            try {
              const r = await fetch(target);
              const data = await r.json();
              res.statusCode = r.status;
              res.end(JSON.stringify(data));
            } catch (err) {
              console.error("TMDB proxy error:", err);
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "TMDB request failed" }));
            }
          });
        },
      },
    ],
  };
});
