"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface Message {
  sender: "user" | "partner";
  text: string;
  time: string;
}

export function PhoneChatMockup() {
  const pathname = usePathname();
  // Phone is visible ONLY on a match with Priya (user_id 2) — never globally.
  const PRIYA_USER_ID = "2";
  const [visible, setVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "partner",
      text: "Aww, finally! 🤭 Match toh ho gaya... Ab batao pehli chai kab pila rahe ho? 😉",
      time: "Just now"
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check Priya-match state on every mount and route change.
    // Stale "isMatched" without a Priya matchedUserId stays hidden.
    const isPriyaMatch = () =>
      typeof window !== "undefined" &&
      localStorage.getItem("isMatched") === "true" &&
      localStorage.getItem("matchedUserId") === PRIYA_USER_ID;

    const checkMatch = () => {
      setVisible(isPriyaMatch());
      setIsOpen(false);
    };
    checkMatch();

    const onMatch = (e: Event) => {
      const userId = (e as CustomEvent)?.detail?.userId;
      if (String(userId ?? "") === PRIYA_USER_ID) {
        setVisible(true);
        setIsOpen(true); // pop the phone open on a Priya match
      }
    };

    const onReset = () => {
      setVisible(false);
      setIsOpen(false);
    };

    window.addEventListener("heartmate_matched", onMatch);
    window.addEventListener("heartmate_reset", onReset);

    return () => {
      window.removeEventListener("heartmate_matched", onMatch);
      window.removeEventListener("heartmate_reset", onReset);
    };
  }, [pathname ?? ""]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  if (
    !visible ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/create-profile"
  ) {
    return null;
  }

  const showCallToast = (type: "voice" | "video") => {
    setToastMessage(`${type === "voice" ? "📞 VOICE CALL" : "📹 VIDEO CALL"} COMING SOON! 😉`);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMsgList: Message[] = [...messages, { sender: "user", text: userMsgText, time: timeNow }];
    setMessages(newMsgList);
    setInput("");
    setLoading(true);

    try {
      const apiHistory = newMsgList.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistory,
          partnerName: "Priya Patel",
          partnerGender: "Female"
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [
          ...prev,
          { sender: "partner", text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { sender: "partner", text: "Oops, network issue lag raha hai! 😅 Phir se bolo?", time: timeNow }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: "partner", text: "Achha suno, lagta hai signal weak hai! Dobara message karo? 😉", time: timeNow }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, fontFamily: "'Press Start 2P', monospace" }}>
      {/* Floating 8-bit Retro Phone Button when closed */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setHasOpened(true); }}
          className="pixel-button"
          style={{
            background: "var(--pixel-pink)",
            color: "#fff",
            border: "4px solid var(--pixel-pink-deep)",
            boxShadow: "6px 6px 0 var(--pixel-pink-deep)",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.55rem",
            cursor: "pointer",
            animation: hasOpened ? "none" : "chatBuzz 1.5s ease-in-out infinite"
          }}
        >
          <span style={{ fontSize: "1rem" }}>📱</span>
          <span>CHAT *</span>
          <span style={{ width: "8px", height: "8px", background: "#27ae60", border: "2px solid #fff", animation: "blink 1s step-end infinite" }} />
        </button>
      )}

      {/* 8-bit Pixel Smartphone Frame when open */}
      {isOpen && (
        <div
          style={{
            width: "360px",
            height: "580px",
            background: "#fff5ee",
            border: "6px solid var(--pixel-pink-deep)",
            boxShadow: "10px 10px 0 var(--pixel-pink-deep)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            imageRendering: "pixelated"
          }}
        >
          {/* Top Pixel Speaker / Notch Bar */}
          <div style={{ background: "var(--pixel-pink-deep)", height: "24px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: "80px", height: "8px", background: "#fff5ee", border: "2px solid #3d2626" }} />
          </div>

          {/* 8-bit Header Bar */}
          <div style={{ background: "var(--pixel-pink-soft)", borderBottom: "4px solid var(--pixel-pink-deep)", padding: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "36px", height: "36px", border: "3px solid var(--pixel-pink-deep)", background: "#ffe6b0", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Image src="/avatar-girl.png" alt="Priya" width={36} height={36} style={{ imageRendering: "pixelated" }} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "0.55rem", color: "var(--pixel-pink-deep)" }}>Priya Patel</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.45rem", color: "#27ae60" }}>
                  <span>■</span>
                  <span>ONLINE</span>
                </div>
              </div>
            </div>

            {/* 8-bit Retro Action Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button 
                onClick={() => showCallToast("voice")}
                style={{
                  background: "var(--pixel-blue)",
                  color: "#fff",
                  border: "2px solid var(--pixel-ink)",
                  boxShadow: "2px 2px 0 var(--pixel-ink)",
                  padding: "4px 6px",
                  fontSize: "0.45rem",
                  cursor: "pointer",
                  fontFamily: "'Press Start 2P', monospace"
                }}
                title="Voice Call"
              >
                📞 CALL
              </button>
              <button 
                onClick={() => showCallToast("video")}
                style={{
                  background: "var(--pixel-pink)",
                  color: "#fff",
                  border: "2px solid var(--pixel-ink)",
                  boxShadow: "2px 2px 0 var(--pixel-ink)",
                  padding: "4px 6px",
                  fontSize: "0.45rem",
                  cursor: "pointer",
                  fontFamily: "'Press Start 2P', monospace"
                }}
                title="Video Call"
              >
                📹 VIDEO
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  border: "2px solid var(--pixel-ink)",
                  boxShadow: "2px 2px 0 var(--pixel-ink)",
                  padding: "4px 6px",
                  fontSize: "0.45rem",
                  cursor: "pointer",
                  fontFamily: "'Press Start 2P', monospace"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notification Toast */}
          {toastMessage && (
            <div
              style={{
                position: "absolute",
                top: "60px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#ffe6b0",
                color: "var(--pixel-pink-deep)",
                border: "3px solid var(--pixel-pink-deep)",
                boxShadow: "4px 4px 0 var(--pixel-pink-deep)",
                padding: "6px 12px",
                fontSize: "0.42rem",
                zIndex: 10,
                textAlign: "center",
                whiteSpace: "nowrap"
              }}
            >
              {toastMessage}
            </div>
          )}

          {/* 8-bit Chat Messages Scrolling Container */}
          <div
            style={{
              flex: 1,
              background: "#ffd6e233",
              padding: "12px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            <div style={{ textAlign: "center", margin: "4px 0" }}>
              <span style={{ background: "var(--pixel-pink-soft)", border: "2px solid var(--pixel-pink)", color: "var(--pixel-pink-deep)", fontSize: "0.4rem", padding: "4px 8px" }}>
                ♥ MATCHED ON HEARTMATE ♥
              </span>
            </div>

            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%"
                }}
              >
                <div
                  style={{
                    background: m.sender === "user" ? "var(--pixel-pink)" : "#ffffff",
                    color: m.sender === "user" ? "#ffffff" : "var(--pixel-ink)",
                    border: "3px solid var(--pixel-pink-deep)",
                    boxShadow: "3px 3px 0 var(--pixel-pink-deep)",
                    padding: "8px 10px",
                    fontSize: "0.48rem",
                    lineHeight: "1.6"
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: "0.38rem",
                    color: "var(--pixel-pink-deep)",
                    marginTop: "4px",
                    textAlign: m.sender === "user" ? "right" : "left"
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#fff", border: "2px solid var(--pixel-pink-deep)", padding: "6px 10px", fontSize: "0.45rem", color: "var(--pixel-pink-deep)" }}>
                <span>TYPING... 💬</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 8-bit Bottom Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              background: "var(--pixel-pink-soft)",
              borderTop: "4px solid var(--pixel-pink-deep)",
              padding: "8px",
              display: "flex",
              gap: "6px",
              alignItems: "center"
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type in Hinglish..."
              style={{
                flex: 1,
                background: "#fff",
                border: "3px solid var(--pixel-pink-deep)",
                padding: "8px",
                fontSize: "0.45rem",
                fontFamily: "'Press Start 2P', monospace",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: "var(--pixel-pink)",
                color: "#fff",
                border: "3px solid var(--pixel-pink-deep)",
                boxShadow: "2px 2px 0 var(--pixel-pink-deep)",
                padding: "8px 12px",
                fontSize: "0.55rem",
                fontFamily: "'Press Start 2P', monospace",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.6 : 1
              }}
            >
              ➔
            </button>
          </form>

          {/* Phone Bottom Bezel */}
          <div style={{ background: "var(--pixel-pink-deep)", height: "16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: "60px", height: "4px", background: "#fff" }} />
          </div>
        </div>
      )}
    </div>
  );
}
