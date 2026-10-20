/**
 * Share card — renders the Bubble Score result as a branded 1080x1350 PNG and
 * shares it. Dependency-free (Canvas API). Nothing leaves the browser.
 *
 * Uses the loaded Bricolage/DM Sans web fonts so the image is on-brand.
 */
import { GENRES, GENRE_COLORS } from "./constants";
import { computeBubbleScore } from "../services/bubbleScore";
import { templateSummary } from "../services/tasteSummary";

const SITE = "https://my-blind-spot.vercel.app";
const W = 1080, H = 1350, PAD = 90;

function capture(event, props) {
  try {
    if (typeof window !== "undefined" && window.posthog && window.posthog.capture) {
      window.posthog.capture(event, props);
    }
  } catch { /* ignore */ }
}

async function ensureFonts() {
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load('700 120px "Bricolage Grotesque"'),
        document.fonts.load('700 40px "DM Sans"'),
        document.fonts.load('500 40px "DM Sans"'),
      ]);
      await document.fonts.ready;
    }
  } catch { /* fall back to system fonts */ }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function shareText(profile, { score, band, summary } = {}) {
  const s = score ?? computeBubbleScore(profile).score;
  const b = (band ?? computeBubbleScore(profile).band).toLowerCase();
  const sum = summary ?? templateSummary(profile);
  return `My Netflix Bubble Score is ${s}/100 — ${b}. ${sum} What's yours? ${SITE}`;
}

export async function buildShareCanvas(profile, opts = {}) {
  await ensureFonts();
  const { score, band } = opts.score != null ? opts : computeBubbleScore(profile);
  const summary = opts.summary ?? templateSummary(profile);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background + glow
  ctx.fillStyle = "#0B0D14";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.34, 60, W * 0.5, H * 0.34, 620);
  glow.addColorStop(0, "rgba(124,92,255,0.22)");
  glow.addColorStop(1, "rgba(124,92,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#7C5CFF";
  ctx.fillRect(0, 0, W, 10);

  ctx.textAlign = "center";

  // Wordmark
  ctx.fillStyle = "#A594FF";
  ctx.font = '700 34px "DM Sans", system-ui, sans-serif';
  ctx.fillText("BLIND SPOT", W / 2, 150);

  // Label
  ctx.fillStyle = "#9AA0B4";
  ctx.font = '500 40px "DM Sans", system-ui, sans-serif';
  ctx.fillText("Your Netflix Bubble Score", W / 2, 300);

  // Score
  ctx.fillStyle = "#7C5CFF";
  ctx.font = '700 300px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText(String(score), W / 2, 470);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#9AA0B4";
  ctx.font = '700 48px "DM Sans", system-ui, sans-serif';
  ctx.fillText("out of 100", W / 2, 660);

  // Band
  ctx.fillStyle = "#F2F3F7";
  ctx.font = '700 64px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText(band, W / 2, 750);

  // Summary (wrapped, up to 3 lines)
  ctx.fillStyle = "#9AA0B4";
  ctx.font = '500 38px "DM Sans", system-ui, sans-serif';
  const lines = wrapLines(ctx, summary, W - PAD * 2);
  let y = 830;
  lines.forEach((l) => { ctx.fillText(l, W / 2, y); y += 52; });

  // Top genres (left-aligned bars)
  ctx.textAlign = "left";
  const top = (profile.genreSummary || []).slice(0, 4);
  const maxW = (profile.genreSummary || [])[0]?.weight || 1;
  y = Math.max(y + 40, 1010);
  top.forEach((g) => {
    const name = g.genre?.name || "";
    const pct = Math.round(g.weight * 100);
    ctx.fillStyle = "#E5E7EB";
    ctx.font = '600 30px "DM Sans", system-ui, sans-serif';
    ctx.fillText(name, PAD, y);
    ctx.fillStyle = "#1f2433";
    roundRect(ctx, PAD, y + 14, W - PAD * 2, 22, 11);
    ctx.fill();
    ctx.fillStyle = GENRE_COLORS[g.genre?.id] || "#7C5CFF";
    roundRect(ctx, PAD, y + 14, Math.max(22, (g.weight / maxW) * (W - PAD * 2)), 22, 11);
    ctx.fill();
    ctx.fillStyle = "#9AA0B4";
    ctx.textAlign = "right";
    ctx.font = '600 26px "DM Sans", system-ui, sans-serif';
    ctx.fillText(pct + "%", W - PAD, y + 8);
    ctx.textAlign = "left";
    y += 66;
  });

  // Never touched
  const activeIds = new Set((profile.genreSummary || []).map((g) => g.genre?.id));
  const untouched = GENRES.filter((g) => !activeIds.has(g.id)).slice(0, 4);
  if (untouched.length) {
    y += 14;
    ctx.fillStyle = "#6b7280";
    ctx.font = '700 26px "DM Sans", system-ui, sans-serif';
    ctx.fillText("NEVER TOUCHED", PAD, y);
    y += 46;
    let x = PAD;
    ctx.font = '600 30px "DM Sans", system-ui, sans-serif';
    untouched.forEach((g) => {
      const tw = ctx.measureText(g.name).width;
      const cw = tw + 44;
      if (x + cw > W - PAD) return;
      ctx.strokeStyle = "#FF8A5B";
      ctx.lineWidth = 2;
      roundRect(ctx, x, y - 34, cw, 52, 26);
      ctx.stroke();
      ctx.fillStyle = "#FF8A5B";
      ctx.fillText(g.name, x + 22, y);
      x += cw + 16;
    });
  }

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#6b7280";
  ctx.font = '500 30px "DM Sans", system-ui, sans-serif';
  ctx.fillText("What's your blind spot?", W / 2, H - 90);
  ctx.fillStyle = "#A594FF";
  ctx.font = '700 32px "DM Sans", system-ui, sans-serif';
  ctx.fillText("my-blind-spot.vercel.app", W / 2, H - 48);

  return canvas;
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareProfile(profile, opts = {}) {
  try {
    const canvas = await buildShareCanvas(profile, opts);
    const blob = await toBlob(canvas);
    const file = new File([blob], "blind-spot.png", { type: "image/png" });
    const text = shareText(profile, opts);
    const canShareFiles =
      typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] });
    if (canShareFiles) {
      await navigator.share({ files: [file], text });
      capture("result_shared", { method: "native" });
      return "shared";
    }
    downloadBlob(blob, "blind-spot.png");
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    capture("result_shared", { method: "download" });
    return "downloaded";
  } catch (err) {
    console.error("shareProfile failed:", err);
    return "error";
  }
}
