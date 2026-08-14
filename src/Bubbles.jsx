import { useState, useEffect } from "react";

export function Bubble({ text, time, visible }) {
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShowTime(true), 260);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        marginBottom: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(8px)",
        transition: "opacity 220ms ease, transform 220ms ease",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          border: "2.5px solid #111111",
          borderRadius: "20px 20px 20px 6px",
          padding: "10px 15px",
          background: "#ffffff",
          color: "#111111",
          fontSize: 15.5,
          lineHeight: 1.38,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {text}
      </div>
      {time && (
        <div
          style={{
            fontSize: 11,
            color: "#9a9a9a",
            marginTop: 4,
            marginLeft: 6,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            opacity: showTime ? 1 : 0,
            transition: "opacity 200ms ease",
            letterSpacing: 0.2,
          }}
        >
          {time}
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        border: "2.5px solid #111111",
        borderRadius: "20px 20px 20px 6px",
        padding: "12px 16px",
        width: "fit-content",
        marginBottom: 10,
        background: "#ffffff",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#111111",
            display: "inline-block",
            animation: `bounce 1.1s infinite ${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
