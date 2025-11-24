import React, { useEffect, useState, useRef } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api";
const WS_BASE = "ws://localhost:8000/ws/requests/provider/";

function ProviderRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access");
  const providerId = localStorage.getItem("provider_id");

  const wsRef = useRef(null);
  const navigate = useNavigate();

  // 🔁 Fetch provider requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      let endpoint = "";

      if (filter === "pending") {
        endpoint = `${API_BASE}/provider/requests/`;
      } else {
        endpoint = `${API_BASE}/providers/requests/?status=${filter}`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      console.log("📦 Provider requests:", data);

      setRequests(data.results || data);
      setMessage("");
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("⚠️ Failed to load requests. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch list when filter changes
  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // ⚡ FIXED WebSocket setup (TOKEN included)
  useEffect(() => {
    if (!providerId || !token) return;

    const ws = new WebSocket(
      `${WS_BASE}${providerId}/?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;

    ws.onopen = () => console.log("✅ Provider WebSocket connected");
    ws.onclose = (e) => console.log("❌ Provider WS closed:", e.reason);
    ws.onerror = (err) => console.error("⚡ WS Error:", err);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📨 WS message:", data);

      if (data.type === "new_request" || data.type === "request_update") {
        fetchRequests();
      }
    };

    return () => ws.close();
  }, [providerId, token, filter]);

  // Accept Request
  const acceptRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/provider/requests/${id}/accept/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to accept");

      alert("✅ Request accepted!");
      fetchRequests();

      if (data.chatroom_id) navigate(`/chat/${data.chatroom_id}`);
    } catch (err) {
      console.error("Accept error:", err);
      alert("❌ Failed to accept request.");
    }
  };

  // Reject Request
  const rejectRequest = async (id) => {
    if (!window.confirm("Reject this request?")) return;

    try {
      const res = await fetch(`${API_BASE}/provider/requests/${id}/reject/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reject");

      alert("🚫 Request rejected.");
      fetchRequests();
    } catch (err) {
      console.error("Reject error:", err);
      alert("❌ Failed to reject.");
    }
  };

  // Mark Request as Complete
  const completeRequest = async (id) => {
    if (!window.confirm("Complete this request?")) return;

    try {
      const res = await fetch(`${API_BASE}/provider/requests/${id}/complete/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to complete");

      alert("🎉 Request completed!");
      fetchRequests();
    } catch (err) {
      console.error("Complete error:", err);
      alert("❌ Failed to complete request.");
    }
  };

  // 🎨 Status Badges
  const renderStatus = (status) => {
    switch (status) {
      case "accepted":
        return (
          <span className="badge bg-secondary d-flex align-items-center gap-1">
            <CheckCircle size={14} /> Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="badge bg-danger d-flex align-items-center gap-1">
            <XCircle size={14} /> Rejected
          </span>
        );
      case "completed":
        return (
          <span className="badge bg-success d-flex align-items-center gap-1">
            <ThumbsUp size={14} /> Completed
          </span>
        );
      default:
        return (
          <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-black">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-warning">⚙️ Provider Work Requests</h3>
        <div>
          <button
            className={`btn btn-sm me-2 ${
              filter === "pending" ? "btn-warning" : "btn-outline-warning"
            }`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>

          <button
            className={`btn btn-sm me-2 ${
              filter === "accepted" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setFilter("accepted")}
          >
            Accepted
          </button>

          <button
            className={`btn btn-sm me-2 ${
              filter === "rejected" ? "btn-danger" : "btn-outline-danger"
            }`}
            onClick={() => setFilter("rejected")}
          >
            Rejected
          </button>

          <button
            className={`btn btn-sm me-2 ${
              filter === "completed" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>

          <button className="btn btn-outline-primary btn-sm me-2" onClick={fetchRequests}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Spinner */}
      {loading && (
        <div className="text-center text-light">
          <div className="spinner-border text-warning"></div>
          <p className="mt-2">Loading {filter} requests...</p>
        </div>
      )}

      {/* Messages */}
      {!loading && message && (
        <div className="alert alert-dark text-warning text-center">{message}</div>
      )}

      {/* No Data */}
      {!loading && requests.length === 0 && (
        <div className="alert alert-secondary text-center">
          No {filter} requests found.
        </div>
      )}

      {/* Requests */}
      {!loading && requests.length > 0 && (
        <div className="list-group p-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="list-group-item bg-black text-light d-flex justify-content-between align-items-center "
            >
              <div>
                <div className="small text-light">
                  User: {req.user || "DoerHub User"}
                </div>

                <div className="small text-light">
                  Location: {req.location_address || "Undefined"}
                </div>

                <div className="small text-secondary col-md-4">
                  {req.notes ? `“${req.notes.slice(0, 60)}”` : "No notes"}
                  {renderStatus(req.status)}
                </div>
              </div>

              {filter === "pending" && (
                <div className="d-flex gap-2">
                  <button
                    onClick={() => acceptRequest(req.id)}
                    className="btn btn-success btn-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Reject
                  </button>
                </div>
              )}

              {filter === "accepted" && (
                <div className="d-flex gap-2">
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => completeRequest(req.id)}
                    className="btn btn-success btn-sm"
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProviderRequests;
