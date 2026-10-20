/**
 * Netflix viewing-history parser (client-side, no upload).
 * Handles the instant per-profile export (netflix.com/viewingactivity -> Download all)
 * and the richer GDPR ViewingActivity.csv.
 *
 * Two hard problems it solves:
 *  1. Titles concatenate show/season/episode by colon ("Show: Season 1: Ep"),
 *     but real movie titles also contain colons ("Mission: Impossible").
 *  2. Every viewing session is its own row, so a binged series appears many times.
 */

// CSV parser that respects quoted fields and escaped quotes.
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

const SEASON_MARKER = /^(Season\s+\d+|Limited Series|Miniseries|Series\s+\d+|Part\s+\d+|Chapter\s+\d+|Book\s+\d+)$/i;
const TRAILER = /\((Trailer|Hook|Teaser|Recap|Preview)\)\s*$/i;

// Reduce a raw Netflix title to its show/film name.
export function extractBaseTitle(raw) {
  const parts = raw.split(":").map((s) => s.trim());
  // TV episodes have 3+ colon segments: "Show: Season 1: Episode Title"
  if (parts.length >= 3) return parts[0];
  // 2 segments: only strip if the 2nd is clearly a season/series marker.
  // Protects movie subtitles ("Mission: Impossible", "Kill Bill: Vol. 1").
  if (parts.length === 2 && SEASON_MARKER.test(parts[1])) return parts[0];
  return raw.trim();
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

  const map = new Map();
  let trailersSkipped = 0;

  for (let i = start; i < rows.length; i++) {
    const raw = (rows[i][titleIdx] || "").trim();
    if (!raw) continue;
    if ((suppIdx !== -1 && (rows[i][suppIdx] || "").trim()) || TRAILER.test(raw)) {
      trailersSkipped++;
      continue;
    }
    const base = extractBaseTitle(raw);
    if (!base) continue;
    const key = base.toLowerCase();
    const date = dateIdx !== -1 ? (rows[i][dateIdx] || "").trim() : "";
    const existing = map.get(key);
    if (existing) {
      existing.plays++;
      if (date && date > existing.lastWatched) existing.lastWatched = date;
    } else {
      map.set(key, { title: base, plays: 1, lastWatched: date });
    }
  }

  const titles = [...map.values()].sort((a, b) => b.plays - a.plays);
  return { titles, stats: { rawRows: rows.length - start, unique: titles.length, trailersSkipped } };
}
