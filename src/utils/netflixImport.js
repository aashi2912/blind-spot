/**
 * Netflix viewing-history parser (client-side, no upload).
 *
 * Handles the three real-world title shapes in a Netflix export:
 *  - Movie: "40 Dates and 40 Nights"            -> kept
 *  - Movie with subtitle: "The Lost World: Jurassic Park" -> kept (unique prefix)
 *  - TV, 3+ segments: "Show: Season 1: Episode" -> "Show"
 *  - TV, 2 segments with marker: "Chumbak: Episode 16" -> "Chumbak"
 *  - TV, 2 segments with episode NAME: "Musafir Cafe: Arrival" -> "Musafir Cafe"
 *    (detected because the "Musafir Cafe" prefix recurs across rows)
 *
 * Every viewing session is its own row, so titles are collapsed by name and a
 * play count is kept.
 */

function parseCsvRows(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Second segment that clearly marks a series structure.
const EPISODE_MARKER = /^(Season\s+\d+|Limited Series|Miniseries|Series\s+\d+|Part\s+\d+|Chapter\s+\d+|Book\s+\d+|Episode\s+\d+)/i;
const TRAILER = /\((Trailer|Hook|Teaser|Recap|Preview)\)\s*$/i;

// prefixCount: how many rows share the pre-colon prefix (lets us detect shows
// whose episodes are named, not numbered).
export function extractBaseTitle(raw, prefixCount = {}) {
  const parts = raw.split(":").map((s) => s.trim());
  if (parts.length === 1) return raw.trim();
  if (parts.length >= 3) return parts[0];           // Show: Season: Episode
  if (EPISODE_MARKER.test(parts[1])) return parts[0]; // Show: Episode 16 / Season 1
  const p = parts[0].toLowerCase();
  if ((prefixCount[p] || 0) >= 2) return parts[0];  // prefix recurs -> it's a show
  return raw.trim();                                 // unique 2-seg -> movie subtitle
}

export function parseNetflixCsv(text) {
  const rows = parseCsvRows(text).filter((r) => r.some((c) => c && c.trim()));
  if (!rows.length) return { titles: [], stats: { rawRows: 0, unique: 0, trailersSkipped: 0 } };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  let titleIdx = header.indexOf("title");
  if (titleIdx === -1) titleIdx = 0;
  const suppIdx = header.indexOf("supplemental video type");
  const dateIdx = header.findIndex((h) => h === "date" || h === "start time");
  const hasHeader = header.includes("title") || header.includes("date");
  const start = hasHeader ? 1 : 0;

  // Pass 1: collect content rows (skip trailers), and count colon-prefixes.
  const raws = [];
  const dates = [];
  let trailersSkipped = 0;
  for (let i = start; i < rows.length; i++) {
    const raw = (rows[i][titleIdx] || "").trim();
    if (!raw) continue;
    if ((suppIdx !== -1 && (rows[i][suppIdx] || "").trim()) || TRAILER.test(raw)) {
      trailersSkipped++;
      continue;
    }
    raws.push(raw);
    dates.push(dateIdx !== -1 ? (rows[i][dateIdx] || "").trim() : "");
  }

  const prefixCount = {};
  for (const raw of raws) {
    const ci = raw.indexOf(":");
    if (ci > 0) {
      const p = raw.slice(0, ci).trim().toLowerCase();
      prefixCount[p] = (prefixCount[p] || 0) + 1;
    }
  }

  // Pass 2: reduce to base titles, collapse by name.
  const map = new Map();
  raws.forEach((raw, idx) => {
    const base = extractBaseTitle(raw, prefixCount);
    if (!base) return;
    const key = base.toLowerCase();
    const date = dates[idx];
    const existing = map.get(key);
    if (existing) {
      existing.plays++;
      if (date && date > existing.lastWatched) existing.lastWatched = date;
    } else {
      map.set(key, { title: base, plays: 1, lastWatched: date });
    }
  });

  const titles = [...map.values()].sort((a, b) => b.plays - a.plays);
  return { titles, stats: { rawRows: raws.length, unique: titles.length, trailersSkipped } };
}
