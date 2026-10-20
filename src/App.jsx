import { useState, useEffect, useCallback } from "react";
import LandingScreen from "./screens/LandingScreen";
import InputScreen from "./screens/InputScreen";
import BubbleScreen from "./screens/BubbleScreen";
import BlindSpotsScreen from "./screens/BlindSpotsScreen";
import BridgeScreen from "./screens/BridgeScreen";
import DetailScreen from "./screens/DetailScreen";
import { getWatched, addWatched, removeWatched, updateWatchedKeywords, setProfile, setWatchedList } from "./utils/storage";
import { getKeywords } from "./services/tmdbApi";
import { buildTasteProfile } from "./services/tasteProfiler";

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [watched, setWatched] = useState([]);
  const [profile, setProfileState] = useState(null);
  const [selectedBlindSpot, setSelectedBlindSpot] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    setWatched(getWatched());
  }, []);

  useEffect(() => {
    if (watched.length >= 3) {
      const p = buildTasteProfile(watched);
      setProfileState(p);
      setProfile(p);
    }
  }, [watched]);

  const handleAddTitle = useCallback(async (title) => {
    const updated = addWatched(title);
    setWatched([...updated]);
    try {
      const kws = await getKeywords(title.id, title.media_type);
      const withKws = updateWatchedKeywords(title.id, title.media_type, kws);
      setWatched([...withKws]);
    } catch (err) {
      console.warn("Keyword fetch failed for", title.title, err);
    }
  }, []);

  const handleBulkImport = useCallback((titles) => {
    const current = getWatched();
    const seen = new Set(current.map((t) => t.id + ":" + t.media_type));
    const merged = [...current];
    for (const t of titles) {
      const k = t.id + ":" + t.media_type;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(t);
      }
    }
    setWatchedList(merged);
    setWatched([...merged]);
    (async () => {
      const top = [...titles].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 20);
      for (const t of top) {
        try {
          const kws = await getKeywords(t.id, t.media_type);
          const upd = updateWatchedKeywords(t.id, t.media_type, kws);
          setWatched([...upd]);
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  const handleRemoveTitle = useCallback((id, mediaType) => {
    const updated = removeWatched(id, mediaType);
    setWatched([...updated]);
  }, []);

  const nav = useCallback((s) => setScreen(s), []);

  const handleExploreBlindSpot = useCallback((blindSpot) => {
    setSelectedBlindSpot(blindSpot);
    setScreen("bridges");
  }, []);

  const handleViewDetail = useCallback((movie) => {
    setSelectedMovie(movie);
    setScreen("detail");
  }, []);

  const handleMarkWatched = useCallback(async (movie) => {
    const title = {
      id: movie.id,
      media_type: movie.media_type || "movie",
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date || "",
      genre_ids: movie.genre_ids || [],
      original_language: movie.original_language || "en",
      vote_average: movie.vote_average || 0,
      vote_count: movie.vote_count || 0,
      overview: movie.overview || "",
      keywords: movie.keywords || [],
    };
    const updated = addWatched(title);
    setWatched([...updated]);
    setScreen("bubble");
  }, []);

  // Single design system — every screen renders full-bleed.
  switch (screen) {
    case "input":
      return (
        <InputScreen
          watched={watched}
          onAdd={handleAddTitle}
          onRemove={handleRemoveTitle}
          onAnalyze={() => nav("bubble")}
          onImportMany={handleBulkImport}
          profile={profile}
        />
      );
    case "bubble":
      return (
        <BubbleScreen
          profile={profile}
          watched={watched}
          onViewBlindSpots={() => nav("blindspots")}
          onGoBack={() => nav("input")}
        />
      );
    case "blindspots":
      return (
        <BlindSpotsScreen
          profile={profile}
          onExplore={handleExploreBlindSpot}
          onGoBack={() => nav("bubble")}
        />
      );
    case "bridges":
      return (
        <BridgeScreen
          profile={profile}
          watched={watched}
          blindSpot={selectedBlindSpot}
          onViewDetail={handleViewDetail}
          onGoBack={() => nav("blindspots")}
        />
      );
    case "detail":
      return (
        <DetailScreen
          movie={selectedMovie}
          watched={watched}
          onMarkWatched={handleMarkWatched}
          onGoBack={() => nav("bridges")}
        />
      );
    default:
      return <LandingScreen onStart={() => nav("input")} />;
  }
}
