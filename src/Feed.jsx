// Feed.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Bubble, TypingIndicator } from "./Bubbles.jsx";

const FALLBACK_TEXT =
  "sorry don't have anything right now. Either dying at work or living my best life";
const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

function etDateString(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDisplayTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function withGroupedTimes(list) {
  let lastShown = null;
  return list.map((s) => {
    const created = new Date(s.created_at || Date.now());
    let time = "";
    if (!lastShown || created - lastShown >= GROUP_THRESHOLD_MS) {
      time = formatDisplayTime(created);
      lastShown = created;
    }
    return { ...s, time };
  });
}

export default function Feed() {
  const [stories, setStories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(true);
  const [flashTyping, setFlashTyping] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const scrollRef = useRef(null);
  const storiesRef = useRef([]);
  const initialAnimationDone = useRef(false);

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
      const todaysRows = data.filter(
        (s) => etDateString(new Date(s.created_at)) === today
      );
      if (todaysRows.length > 0) {
        return withGroupedTimes(todaysRows);
      }
    }
    return [
      { id: "fallback", text: FALLBACK_TEXT, time: formatDisplayTime(new Date()) },
    ];
  }

  async function loadInitial() {
    const newStories = await fetchStories();
    setStories(newStories);
    setLoaded(true);
    setVisibleCount(0);
  }

  async function refreshStories() {
    const newStories = await fetchStories();
    const prevList = storiesRef.current;
    const isSameContent = JSON.stringify(prevList) === JSON.stringify(newStories);

    setStories(newStories);

    if (isSameContent) {
      setFlashTyping(true);
      setTimeout(() => setFlashTyping(false), 900);
    } else {
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
    if (visibleCount >= stories.length) {
      initialAnimationDone.current = true;
      return;
    }
    setTyping(true);
    const revealDelay = visibleCount === 0 ? 500 : 900;
    const timer = setTimeout(() => {
      setTyping(false);
      setVisibleCount((c) => c + 1);
    }, revealDelay);
    return () => clearTimeout(timer);
  }, [visibleCount, loaded, stories]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!initialAnimationDone.current) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
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
        height: "100dvh",
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
          height: "100dvh",
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
              borderRadius: 10,
              width: 44,
              height: 44,
              padding: 0,
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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

        <div
          style={{
            borderTop: "2.5px solid #111111",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "2px solid #d8d8d8",
              borderRadius: 18,
              padding: "9px 14px",
              fontSize: 14,
              color: "#b4b4b4",
            }}
          >
            news, but make it texting
          </div>
          <button
            onClick={() => setAboutOpen(true)}
            title="What is this?"
            style={{
              border: "none",
              background: "#111111",
              color: "#ffffff",
              borderRadius: "50%",
              width: 32,
              height: 32,
              padding: 0,
              fontSize: 14,
              lineHeight: 1,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ?
          </button>
        </div>

        {aboutOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setAboutOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 420,
                background: "#ffffff",
                borderTop: "2.5px solid #111111",
                borderRadius: "16px 16px 0 0",
                padding: "18px 18px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 15, lineHeight: 1.55, color: "#111111" }}>
                news feed via texting for those who get a dopamine hit from seeing
                new text messages and want to know what's happening around the
                world but don't want to click headlines or subscribe to a
                newsletter bc that's still too much
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.55, color: "#111111" }}>
                i haven't thought about what type of news i want to summarize so
                it'll be whatever i want for now
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.55, color: "#111111" }}>
                this refreshes every morning at 12am ET
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                style={{
                  border: "2px solid #111111",
                  background: "#111111",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "10px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
