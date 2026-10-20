/**
 * localStorage wrapper for Blind Spot
 * All user data stored client-side. No backend, no account.
 */

const KEYS = {
  watched: "blind-spot:watched",
  profile: "blind-spot:profile",
  genreCache: "blind-spot:genre-cache",
  bridges: "blind-spot:bridges",
};

function get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage write failed:", e);
  }
}

// --- Watched titles ---
export function getWatched() {
  return get(KEYS.watched) || [];
}

export function addWatched(title) {
  const current = getWatched();
  if (current.find((t) => t.id === title.id && t.media_type === title.media_type)) {
    return current; // Already added
  }
  const updated = [...current, title];
  set(KEYS.watched, updated);
  return updated;
}

export function removeWatched(id, mediaType) {
  const current = getWatched();
  const updated = current.filter(
    (t) => !(t.id === id && t.media_type === mediaType)
  );
  set(KEYS.watched, updated);
  return updated;
}

export function updateWatchedKeywords(id, mediaType, keywords) {
  const current = getWatched();
  const updated = current.map((t) =>
    t.id === id && t.media_type === mediaType
      ? { ...t, keywords }
      : t
  );
  set(KEYS.watched, updated);
  return updated;
}

// --- Taste profile ---
export function getProfile() {
  return get(KEYS.profile);
}

export function setProfile(profile) {
  set(KEYS.profile, profile);
}

// --- Genre cache (24h TTL) ---
export function getGenreCache() {
  const cached = get(KEYS.genreCache);
  if (!cached) return null;
  // Check TTL — 24 hours
  if (Date.now() - cached.timestamp > 86400000) return null;
  return cached.data;
}

export function setGenreCache(data) {
  set(KEYS.genreCache, { timestamp: Date.now(), data });
}

// --- Bridges ---
export function getBridges(genreId) {
  const all = get(KEYS.bridges) || {};
  return all[genreId] || null;
}

export function setBridges(genreId, bridges) {
  const all = get(KEYS.bridges) || {};
  all[genreId] = bridges;
  set(KEYS.bridges, all);
}

// --- Reset ---
export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// --- Bulk set (used by Netflix CSV import) ---
export function setWatchedList(list) {
  set(KEYS.watched, list);
  return list;
}

// --- Watchlist (saved / dismissed bridge recs) ---
const WATCHLIST_KEY = "blind-spot:watchlist";

export function getWatchlist() {
  return get(WATCHLIST_KEY) || {};
}

export function getWatchlistStatus(id, mediaType) {
  const all = getWatchlist();
  return all[id + ":" + (mediaType || "movie")]?.status || null;
}

export function setWatchlistStatus(item, status) {
  const all = getWatchlist();
  const key = item.id + ":" + (item.media_type || "movie");
  if (!status) {
    delete all[key];
  } else {
    all[key] = {
      id: item.id,
      media_type: item.media_type || "movie",
      title: item.title,
      poster_path: item.poster_path,
      release_date: item.release_date || "",
      status,
      ts: Date.now(),
    };
  }
  set(WATCHLIST_KEY, all);
  return all;
}

export function getSaved() {
  return Object.values(getWatchlist()).filter((x) => x.status === "saved").sort((a, b) => b.ts - a.ts);
}
