// Admin.jsx
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

function formatDisplayTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [todayStories, setTodayStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef(null);

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
    loadTodayStories();
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [todayStories]);

  async function loadTodayStories() {
    setLoadingStories(true);
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      setLoadingStories(false);
      return;
    }

    const today = etDateString(new Date());
    const todays = (data || []).filter(
      (s) => etDateString(new Date(s.created_at)) === today
    );

    if (todays.length === 0 && data && data.length > 0) {
      await supabase.from("stories").delete().neq("id", 0);
    }

    setTodayStories(todays);
    setLoadingStories(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setErrorMsg("");

    const nextPosition = todayStories.length;
    const { data, error } = await supabase
      .from("stories")
      .insert({ text, position: nextPosition })
      .select()
      .single();

    setSending(false);

    if (error) {
      setErrorMsg("Couldn't send: " + error.message);
      return;
    }

    setTodayStories((prev) => [...prev, data]);
    setInputText("");
  }

  function requestDelete(id) {
    const confirmed = window.confirm("Delete this message? This can't be undone.");
    if (confirmed) {
      deleteMessage(id);
    }
  }

  async function deleteMessage(id) {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (!error) {
      setTodayStories((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(id) {
    const newText = editText.trim();
    if (!newText) {
      cancelEdit();
      return;
    }
    const { error } = await supabase
      .from("stories")
      .update({ text: newText })
      .eq("id", id);

    if (!error) {
      setTodayStories((prev) =>
        prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
      );
    }
    setEditingId(null);
    setEditText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>
            Apparently Daily
          </div>
          <div style={{ fontSize: 12.5, color: "#8a8a8a", fontWeight: 500 }}>
            Admin
          </div>
        </div>
        <button onClick={handleLogout} style={secondaryButtonStyle}>
          Log out
        </button>
      </div>

      <div
        ref={scrollRef}
        className="message-thread"
        style={{ flex: 1, padding: "18px 16px 24px", overflowY: "auto" }}
      >
        {loadingStories && (
          <div style={{ color: "#9a9a9a", fontSize: 14 }}>Loading...</div>
        )}
        {!loadingStories && todayStories.length === 0 && (
          <div style={{ color: "#9a9a9a", fontSize: 14, textAlign: "center", marginTop: 40 }}>
            Nothing sent yet today. Type below to publish your first story.
          </div>
        )}
        {todayStories.map((msg) =>
          editingId === msg.id ? (
            <EditingBubble
              key={msg.id}
              text={editText}
              onChange={setEditText}
              onSave={() => saveEdit(msg.id)}
              onCancel={cancelEdit}
            />
          ) : (
            <SentBubble
              key={msg.id}
              text={msg.text}
              time={formatDisplayTime(new Date(msg.created_at))}
              onEdit={() => startEdit(msg)}
              onDelete={() => requestDelete(msg.id)}
            />
          )
        )}
        {errorMsg && (
          <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{errorMsg}</div>
        )}
      </div>

      <div
        style={{
          borderTop: "2.5px solid #111111",
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a story..."
          rows={1}
          style={{
            flex: 1,
            border: "2px solid #d8d8d8",
            borderRadius: 18,
            padding: "9px 14px",
            fontSize: 14,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            resize: "none",
            maxHeight: 120,
            color: "#111111",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !inputText.trim()}
          style={{
            border: "none",
            background: inputText.trim() ? "#111111" : "#d8d8d8",
            color: "#ffffff",
            borderRadius: "50%",
            width: 40,
            height: 40,
            fontSize: 18,
            lineHeight: 1,
            cursor: inputText.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </Frame>
  );
}

function SentBubble({ text, time, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        marginBottom: 10,
      }}
    >
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          border: "1px solid #d8d8d8",
          background: "#fff",
          color: "#9a9a9a",
          borderRadius: "50%",
          width: 22,
          height: 22,
          fontSize: 12,
          lineHeight: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <div
        onClick={onEdit}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          maxWidth: "78%",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            border: "2.5px solid #111111",
            borderRadius: "20px 20px 6px 20px",
            padding: "10px 15px",
            background: "#111111",
            color: "#ffffff",
            fontSize: 15.5,
            lineHeight: 1.38,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {text}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#9a9a9a",
            marginTop: 4,
            marginRight: 6,
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

function EditingBubble({ text, onChange, onSave, onCancel }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        marginBottom: 10,
      }}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "78%",
          border: "2.5px solid #111111",
          borderRadius: "20px 20px 6px 20px",
          padding: "10px 15px",
          background: "#ffffff",
          color: "#111111",
          fontSize: 15.5,
          lineHeight: 1.38,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          resize: "none",
          minHeight: 60,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
        <button onClick={onSave} style={primaryButtonStyle}>
          Save
        </button>
      </div>
    </div>
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
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "2px solid #111111",
  background: "#fff",
  color: "#111111",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
