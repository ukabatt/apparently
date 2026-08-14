import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Bubble, TypingIndicator } from "./Bubbles.jsx";

const FALLBACK_TEXT =
  "sorry don't have anything right now. Either dying at work or living my best life";

function etDateString(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function etTimeString(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function Feed() {
  const [stories, setStories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(true);
  const [flashTyping, setFlashTyping] = useState(false);
  const scrollRef = useRef(null);
  const storiesRef = useRef([]);

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  async function fetchStories() {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("position", { ascending: true });

    if (!error && data && data.length > 0) {
      const today = etDateString(new Date());
      const mostRecent = data.reduce((latest, s) =>
        new Date(s.created_at) > new Date(latest.created_at) ? s : latest
      );
      const isFromToday = etDateString(new Date(mostRecent.created_at)) === today;
      return isFromToday
        ? data
        : [{ id: "fallback", text: FALLBACK_TEXT, time: etTimeString(new Date()) }];
    }
    return [{ id: "fallback", text: FALLBACK_TEXT, time: etTimeString(new Date()) }];
  }

  // Initial load: fetch and type everything in from scratch
  async function loadInitial() {
    const newStories = await fetchStories();
    setStories(newStories);
    setLoaded(true);
    setVisibleCount(0);
  }

  // Refresh: fetch fresh data, but keep existing bubbles as-is.
  // Only newly added stories get typed in; if nothing changed, just a quick typing flash.
  async function refreshStories() {
    const newStories = await fetchStories();
    const prevList = storiesRef.current;
    const isSameContent = JSON.stringify(prevList) === JSON.stringify(newStories);

    setStories(newStories);

    if (isSameContent) {
      setFlashTyping(true);
      setTimeout(() => setFlashTyping(false), 900);
    } else {
      // Keep whatever was already shown; clamp in case the list got shorter
      setVisibleCount((c) => Math.min(c, newStories.length));
    }
  }

  useEffect(() => {
    loadInitial();

    const channel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => {
          refreshStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (visibleCount >= stories.length) return;
    setTyping(true);
    const revealDelay = visibleCount === 0 ? 500 : 900;
    const timer = setTimeout(() => {
      setTyping(false);
      setVisibleCount((c) => c + 1);
    }, revealDelay);
    return () => clearTimeout(timer);
  }, [visibleCount, loaded, stories]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount, typing, flashTyping]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        height: "100vh",
        background: "#ececec",
        display: "flex",
        justifyContent: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        html, body, #root { height: 100%; margin: 0; overflow: hidden; }
        .message-thread {
          scrollbar-width: thin;
          scrollbar-color: #111111 transparent;
        }
        .message-thread::-webkit-scrollbar {
          width: 8px;
        }
        .message-thread::-webkit-scrollbar-track {
          background: transparent;
        }
        .message-thread::-webkit-scrollbar-thumb {
          background-color: #111111;
          border-radius: 2px;
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            borderBottom: "2.5px solid #111111",
            padding: "16px 18px 14px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: -0.3,
                color: "#111111",
              }}
            >
              Apparently Daily
            </div>
            <div style={{ fontSize: 12.5, color: "#8a8a8a", fontWeight: 500 }}>
              {today}
            </div>
          </div>
          <button
            onClick={refreshStories}
            title="Refresh feed"
            style={{
              border: "2px solid #111111",
              background: "#fff",
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>

        <div
          ref={scrollRef}
          className="message-thread"
          style={{ flex: 1, padding: "18px 16px 24px", overflowY: "auto" }}
        >
          {!loaded && (
            <div style={{ color: "#9a9a9a", fontSize: 14 }}>Loading...</div>
          )}
          {stories.slice(0, visibleCount).map((msg) => (
            <Bubble key={msg.id} text={msg.text} time={msg.time} visible={true} />
          ))}
          {((typing && visibleCount < stories.length) || flashTyping) && (
            <TypingIndicator />
          )}
        </div>

        <div style={{ borderTop: "2.5px solid #111111", padding: "12px 16px" }}>
          <div
            style={{
              border: "2px solid #d8d8d8",
              borderRadius: 18,
              padding: "9px 14px",
              fontSize: 14,
              color: "#b4b4b4",
            }}
          >
            news, but make it texting
          </div>
        </div>
      </div>
    </div>
  );
}
