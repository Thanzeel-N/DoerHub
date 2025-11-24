import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "../css/ChatRoom.css";

function ChatRoom() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "You"
  );

  const token = localStorage.getItem("access");
  const userId = localStorage.getItem("user_id");

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // WebSocket setup
  useEffect(() => {
    if (!chatId || !token || !userId) {
      setError("Missing session or chat ID");
      return;
    }

    const wsUrl = `ws://localhost:8000/ws/chat/${chatId}/?token=${encodeURIComponent(
      token
    )}`;

    if (wsRef.current && wsRef.current.readyState < 2) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setError("");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "chat_history" && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (data.type === "chat_message") {
          setMessages((prev) => [
            ...prev,
            {
              sender: data.sender,
              content: data.message,
              timestamp: data.timestamp,
            },
          ]);
        }
      } catch (err) {
        console.warn("Invalid WS message:", e.data);
      }
    };

    ws.onerror = () => setError("Connection failed. Try refreshing.");
    ws.onclose = () => setError("Disconnected. Refresh to reconnect.");

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [chatId, token, userId]);

  // Send message
  const sendMessage = () => {
    if (!input.trim()) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: input.trim() }));
      setInput("");
    }
  };

  // UI
  if (error) {
    return (
      <div className="p-4 mt-5 text-center">
        <p className="text-danger">{error}</p>
        <button
          className="btn btn-warning"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black text-light" style={{ minHeight: "80vh" }}>
      <h4 className="text-warning mb-3">Chat Room</h4>

      <div
        className="messages mb-3 d-flex flex-column"
        style={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <p className="text-secondary">No messages yet.</p>
        ) : (
          messages.map((m, i) => {
            const isMine = m.sender === username;
            return (
              <div
                key={i}
                className={`d-flex mb-2 ${
                  isMine ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  className={`p-2 rounded-3 ${
                    isMine
                      ? "bg-primary text-light align-self-end"
                      : "bg-secondary text-light align-self-start"
                  }`}
                  style={{
                    maxWidth: "75%",
                    wordWrap: "break-word",
                  }}
                >
                  {!isMine && (
                    <small className="fw-bold d-block text-warning">
                      {m.sender}
                    </small>
                  )}
                  {m.content}
                  <div
                    className="text-muted text-end mt-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-group">
        <input
          className="form-control bg-dark text-light border-warning"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="btn btn-warning" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;
