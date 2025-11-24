import React, { createContext, useContext, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const WebSocketContext = createContext(null);
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const listeners = useRef(new Set());

  const connect = async () => {
    const token = localStorage.getItem("access");
    const userId = localStorage.getItem("user_id");
    const isProvider = localStorage.getItem("is_provider") === "true";

    if (!token || !userId) return;

    let role = isProvider ? "provider" : "user";
    let id = userId;

    // For provider: get real provider.id
    if (isProvider) {
      try {
        const res = await fetch("http://localhost:8000/api/provider/profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          id = profile.id.toString();
          localStorage.setItem("provider_id", id);
        } else {
          console.error("Failed to get provider profile");
          return;
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        return;
      }
    }

    const base = role === "provider"
      ? "ws://localhost:8000/ws/requests/provider/"
      : "ws://localhost:8000/ws/requests/user/";

    const url = `${base}${id}/?token=${token}`;
    console.log("WS Connecting:", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WS Connected: ${role} ${id}`);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      broadcast({ type: "connect", role, id });
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("WS Message:", data);

        // Toast for new request
        if (data.type === "new_request" && role === "provider") {
          toast.success(`New Request: ${data.service_category}`, {
            duration: 6000,
            icon: "New",
          });
        }

        broadcast({ ...data, role, id });
      } catch (err) {
        console.warn("Invalid WS message:", e.data);
      }
    };

    ws.onerror = (err) => console.error("WS Error:", err);

    ws.onclose = () => {
      console.log(`WS Closed: ${role} ${id}`);
      broadcast({ type: "disconnect", role, id });

      reconnectTimeout.current = setTimeout(connect, 3000);
    };
  };

  const broadcast = (data) => {
    listeners.current.forEach((cb) => cb(data));
  };

  const subscribe = (callback) => {
    listeners.current.add(callback);
    return () => listeners.current.delete(callback);
  };

  const send = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    wsRef.current?.close();
    wsRef.current = null;
  };

  useEffect(() => {
    connect();
    return disconnect;
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe, send, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};