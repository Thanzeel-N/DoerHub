import { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import ChatToast from "./ChatToast";

/**
 * Notifications Component
 * Polls notifications API, shows toasts,
 * and exposes window.__notifications for Navbar.
 */
function Notifications() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [lastUnread, setLastUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // --------------------------------------------------------------
  // Helper: mark one or all notifications as read
  // --------------------------------------------------------------
  const markRead = async (id) => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      await fetch(`http://127.0.0.1:8000/api/notifications/${id}/read/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.__notifications = notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
    } catch (e) {
      console.error("markRead error:", e);
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      await fetch("http://127.0.0.1:8000/api/notifications/mark-all-read/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.recipient === user.id ? { ...n, is_read: true } : n))
      );
      window.__notifications = notifications.map((n) =>
        n.recipient === user.id ? { ...n, is_read: true } : n
      );
      setLastUnread(0);
      toast.success("All notifications marked as read", { duration: 3000 });
    } catch (e) {
      console.error("markAllRead error:", e);
    }
  };

  // --------------------------------------------------------------
  // Poll loop
  // --------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLastUnread(0);
      return;
    }

    const fetchNotifs = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/api/notifications/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const unread = data.filter((n) => !n.is_read && n.recipient === user.id);
        const unreadCount = unread.length;

        if (unreadCount > lastUnread && unread.length) {
          const newOnes = unread.slice(0, unreadCount - lastUnread);

          newOnes.forEach((n) => {
            // 🔵 1. Chat message toast
            if (n.type === "chat" && n.extra_data?.chatroom_id) {
              toast.custom(
                (t) => (
                  <ChatToast
                    sender={n.extra_data.sender}
                    message={n.message}
                    onClick={(n) => {
                      console.log("[ChatToast Clicked]", n.id);
                      markRead(n.id);
                      if (user.is_provider) {
                        window.location.href = `/chat/${n.extra_data.chatroom_id}`;
                      } else {
                        navigate(`/chat/${n.extra_data.chatroom_id}`);
                      }
                      toast.dismiss(t.id);
                    }}
                  />
                ),
                {
                  duration: 2000,
                  position: "top-right",
                  id: `chat-toast-${n.id}`,
                  containerStyle: { pointerEvents: "auto" },
                }
              );
            }

            // 🟢 2. Service request (provider only)
            else if (n.type === "request" && user.is_provider) {
              toast.success(`New Request: ${n.extra_data.service_category}`, {
                duration: 2000,
                icon: "💼",
              });
            }

            // 🟣 3. New service category
            else if (n.type === "new_category") {
              toast(
                <div
                  onClick={() => navigate("/user/browse-services")}
                  style={{
                    cursor: "pointer",
                    pointerEvents: "auto",
                    background: "#f3e5f5",
                    padding: "12px 16px",
                    borderLeft: "5px solid #7b1fa2",
                    borderRadius: "8px",
                  }}
                >
                  <strong>New Service Category</strong>
                  <div style={{ marginTop: 4 }}>{n.message}</div>
                  <small style={{ color: "#555" }}>Click to browse</small>
                </div>,
                { duration: 2000 }
              );
            }

            // 🔴 4. Admin broadcast
            else if (n.recipient === null) {
              toast(
                <div>
                  <div style={{ fontWeight: "bold", color: "#d32f2f" }}>
                    Admin Broadcast
                  </div>
                  <div style={{ marginTop: 4 }}>{n.message}</div>
                </div>,
                {
                  duration: 2000,
                  style: {
                    background: "#ffebee",
                    borderLeft: "5px solid #d32f2f",
                  },
                }
              );
            }

            // ⚪ 5. Generic fallback
            else {
              toast.success(n.message, { duration: 2000 });
            }
          });
        }

        setLastUnread(unreadCount);
        setNotifications(data);
      } catch (e) {
        console.error("Notification poll error:", e);
      }
    };

    fetchNotifs();
    const id = setInterval(fetchNotifs, 2000);
    return () => clearInterval(id);
  }, [user, lastUnread, navigate]);

  // --------------------------------------------------------------
  // Expose globals for Navbar
  // --------------------------------------------------------------
  useEffect(() => {
    window.__notifications = notifications;
    window.__markAllRead = markAllRead;
  }, [notifications]);

  return null;
}

export default Notifications;
