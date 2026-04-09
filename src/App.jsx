import { useState, useEffect, useCallback } from "react";
import InputScreen from "./screens/InputScreen";
import BubbleScreen from "./screens/BubbleScreen";
import BlindSpotsScreen from "./screens/BlindSpotsScreen";
import BridgeScreen from "./screens/BridgeScreen";
import DetailScreen from "./screens/DetailScreen";
import { getWatched, addWatched, removeWatched, updateWatchedKeywords, setProfile } from "./utils/storage";
import { getKeywords } from "./services/tmdbApi";
import { buildTasteProfile } from "./services/tasteProfiler";

const SCREENS = ["input", "bubble", "blindspots", "bridges", "detail"];
const SCREEN_LABELS = ["Add Titles", "Your Bubble", "Blind Spots", "Bridges", "Detail"];

function NavBar({ screen, onNav }) {
  return (
    <div className="flex gap-0.5 bg-spot-card p-1.5 rounded-2xl mb-5">
      {SCREENS.map((s, i) => (
        <button
          key={s}
          onClick={() => onNav(s)}
          className={`flex-1 py-2.5 px-1 rounded-xl text-xs font-bold font-body transition-all ${
            screen === s
              ? "bg-spot-red text-white"
              : "text-spot-muted hover:text-white"
          }`}
        >
          {SCREEN_LABELS[i]}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("input");
  const [watched, setWatched] = useState([]);
  const [profile, setProfileState] = useState(null);
  const [selectedBlindSpot, setSelectedBlindSpot] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  // Load watched from localStorage on mount
  useEffect(() => {
    setWatched(getWatched());
  }, []);

  // Rebuild profile whenever watched list changes
  useEffect(() => {
    if (watched.length >= 3) {
      const p = buildTasteProfile(watched);
      setProfileState(p);
      setProfile(p);
    }
  }, [watched]);

  // Add a title to watched list + fetch keywords async
  const handleAddTitle = useCallback(async (title) => {
    const updated = addWatched(title);
    setWatched([...updated]);

    // Fetch keywords in background
    try {
      const kws = await getKeywords(title.id, title.media_type);
      const withKws = updateWatchedKeywords(title.id, title.media_type, kws);
      setWatched([...withKws]);
    } catch (err) {
      console.warn("Keyword fetch failed for", title.title, err);
    }
  }, []);

  // Remove a title
  const handleRemoveTitle = useCallback((id, mediaType) => {
    const updated = removeWatched(id, mediaType);
    setWatched([...updated]);
  }, []);

  // Navigate
  const nav = useCallback((s) => setScreen(s), []);

  // Navigate to bridges for a specific blind spot
  const handleExploreBlindSpot = useCallback((blindSpot) => {
    setSelectedBlindSpot(blindSpot);
    setScreen("bridges");
  }, []);

  // Navigate to detail for a specific movie
  const handleViewDetail = useCallback((movie) => {
    setSelectedMovie(movie);
    setScreen("detail");
  }, []);

  // Mark as watched from detail screen
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

  return (
    <div className="max-w-md mx-auto px-5 py-5 min-h-screen bg-spot-dark">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🎬</span>
        <span className="text-lg font-extrabold font-body text-white">Blind Spot</span>
        <span className="text-[9px] font-bold text-spot-red bg-spot-red/10 px-2 py-0.5 rounded-md font-body ml-1">BETA</span>
      </div>

      <NavBar screen={screen} onNav={nav} />

      <div className="animate-fade-in">
        {screen === "input" && (
          <InputScreen
            watched={watched}
            onAdd={handleAddTitle}
            onRemove={handleRemoveTitle}
            onAnalyze={() => nav("bubble")}
            profile={profile}
          />
        )}
        {screen === "bubble" && (
          <BubbleScreen
            profile={profile}
            watched={watched}
            onViewBlindSpots={() => nav("blindspots")}
            onGoBack={() => nav("input")}
          />
        )}
        {screen === "blindspots" && (
          <BlindSpotsScreen
            profile={profile}
            onExplore={handleExploreBlindSpot}
            onGoBack={() => nav("bubble")}
          />
        )}
        {screen === "bridges" && (
          <BridgeScreen
            profile={profile}
            watched={watched}
            blindSpot={selectedBlindSpot}
            onViewDetail={handleViewDetail}
            onGoBack={() => nav("blindspots")}
          />
        )}
        {screen === "detail" && (
          <DetailScreen
            movie={selectedMovie}
            watched={watched}
            onMarkWatched={handleMarkWatched}
            onGoBack={() => nav("bridges")}
          />
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-spot-border">
        <p className="text-[10px] text-spot-muted/50 text-center font-body">
          Blind Spot — See your Netflix filter bubble. Data from TMDB.
        </p>
      </div>
    </div>
  );
}
