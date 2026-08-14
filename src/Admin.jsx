import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

function etDateString(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseAdminText(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [adminText, setAdminText] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [loadingStories, setLoadingStories] = useState(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("position", { ascending: true });

      if (!error && data) {
        // Only show today's stories — anything from a previous day starts blank
        const today = etDateString(new Date());
        const todaysStories = data.filter(
          (s) => etDateString(new Date(s.created_at)) === today
        );
        setAdminText(todaysStories.map((s) => s.text).join("\n"));
      }
      setLoadingStories(false);
    })();
  }, [session]);

  // Auto-grow the textarea to fit its content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [adminText, loadingStories]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function saveStories() {
    const newLines = parseAdminText(adminText);
    setSaveStatus("Saving...");

    // Pull whatever's currently in the table so we can preserve original
    // send times for lines that already existed today.
    const { data: existing, error: fetchError } = await supabase
      .from("stories")
      .select("*");
    if (fetchError) {
      setSaveStatus("Save failed: " + fetchError.message);
      return;
    }

    const today = etDateString(new Date());
    const existingToday = (existing || []).filter(
      (s) => etDateString(new Date(s.created_at)) === today
    );
    const existingByText = new Map(existingToday.map((s) => [s.text, s]));

    // Clear everything (including any stale rows from a previous day)
    const { error: delError } = await supabase.from("stories").delete().neq("id", 0);
    if (delError) {
      setSaveStatus("Save failed: " + delError.message);
      return;
    }

    if (newLines.length === 0) {
      setSaveStatus("Cleared! Feed will show the fallback message.");
      return;
    }

    // Lines that already existed today keep their original timestamp;
    // brand new lines get "sent" right now.
    const finalRows = newLines.map((text, i) => {
      const match = existingByText.get(text);
      return {
        text,
        position: i,
        created_at: match ? match.created_at : new Date().toISOString(),
      };
    });

    const { error: insError } = await supabase.from("stories").insert(finalRows);
    if (insError) {
      setSaveStatus("Save failed: " + insError.message);
      return;
    }
    setSaveStatus("Saved! Live on the feed now.");
  }

  if (checkingSession) {
    return <Centered>Loading...</Centered>;
  }

  if (!session) {
    return (
      <Centered>
        <form
          onSubmit={handleLogin}
          style={{
            width: "100%",
            maxWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            Apparently Daily — Admin
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          {loginError && (
            <div style={{ color: "#c0392b", fontSize: 13 }}>{loginError}</div>
          )}
          <button type="submit" style={primaryButtonStyle}>
            Log in
          </button>
        </form>
      </Centered>
    );
  }

  return (
    <Frame>
      <div
        style={{
          borderBottom: "2.5px solid #111111",
          padding: "16px 18px 14px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>
          Edit today's stories
        </div>
        <button onClick={handleLogout} style={secondaryButtonStyle}>
          Log out
        </button>
      </div>

      <div
        className="message-thread"
        style={{ flex: 1, overflowY: "auto", padding: "18px 16px 24px" }}
      >
        <div style={{ fontSize: 12, color: "#8a8a8a", lineHeight: 1.4, marginBottom: 12 }}>
          One message per line. Timestamps are automatic — new lines get
          today's current time when you publish; lines you keep as-is hold
          onto their original send time.
        </div>
        {loadingStories ? (
          <div>Loading stories...</div>
        ) : (
          <textarea
            ref={textareaRef}
            value={adminText}
            onChange={(e) => setAdminText(e.target.value)}
            style={{
              width: "100%",
              minHeight: 120,
              border: "2px solid #111111",
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              resize: "none",
              overflow: "hidden",
              color: "#111111",
              boxSizing: "border-box",
              display: "block",
            }}
          />
        )}
        {saveStatus && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111111", marginTop: 12 }}>
            {saveStatus}
          </div>
        )}
      </div>

      <div style={{ borderTop: "2.5px solid #111111", padding: "12px 16px" }}>
        <button onClick={saveStories} style={{ ...primaryButtonStyle, width: "100%" }}>
          Save & publish
        </button>
      </div>
    </Frame>
  );
}

function Frame({ children }) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#ececec",
        display: "flex",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
        {children}
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#ececec",
      }}
    >
      {children}
    </div>
  );
}

const inputStyle = {
  border: "2px solid #111111",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
};

const primaryButtonStyle = {
  border: "2px solid #111111",
  background: "#111111",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 0",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "2px solid #111111",
  background: "#fff",
  color: "#111111",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
