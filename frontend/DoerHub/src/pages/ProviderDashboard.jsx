import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CheckCircle, XCircle, Clock, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WebinarSlider from "./WebinarSlide";
import "../css/ProviderDashboard.css";

const API_BASE = "http://localhost:8000/api";
const WS_BASE = "ws://localhost:8000/ws/requests/provider/";

const ProviderDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [providerLocation, setProviderLocation] = useState(null);
  const [lines, setLines] = useState([]);
  const [userMarkers, setUserMarkers] = useState([]); // Track pending request markers
  const token = localStorage.getItem("access");
  const [providerId, setProviderId] = useState(localStorage.getItem("provider_id"));

  const wsRef = useRef(null);
  const watchId = useRef(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const navigate = useNavigate();

  // ── Profile & WebSocket (unchanged) ─────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/provider/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const freshId = data.id || data.provider_id || data.pk;
        if (freshId) {
          setProviderId(freshId.toString());
          localStorage.setItem("provider_id", freshId.toString());
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, [token]);

  const initWebSocket = () => {
    if (!providerId || !token) return;
    if (wsRef.current && wsRef.current.readyState < 2) return;

    const ws = new WebSocket(`${WS_BASE}${providerId}/?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("WS Connected");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (["new_request", "update_request"].includes(data.type)) fetchRequests();
      } catch {
        console.warn("Invalid WS message");
      }
    };
    ws.onclose = () => setTimeout(initWebSocket, 3000);
  };

  useEffect(() => {
    if (providerId && token && !wsRef.current) initWebSocket();
  }, [providerId, token]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close(1000, "unmount");
    };
  }, []);

  // ── Fetch Requests ─────────────────────────────────────────────────────
  const fetchRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/provider/requests/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error("Fetch requests error:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  // ── Map Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    leafletMap.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
      }
    ).addTo(leafletMap.current);


    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        L.marker([latitude, longitude], { icon: yellowIcon })
          .addTo(leafletMap.current)
          .bindPopup("You are here")
          .openPopup();
        leafletMap.current.setView([latitude, longitude], 13);
        setProviderLocation([latitude, longitude]);
      });
    }

    return () => leafletMap.current?.remove();
  }, []);

  const yellowIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });



  // ── Live Location Tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || !token) return;
    let lastSent = 0;
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setProviderLocation([latitude, longitude]);
        const now = Date.now();
        if (now - lastSent < 5000) return;
        lastSent = now;
        try {
          await fetch(`${API_BASE}/provider/update-location/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ latitude, longitude }),
          });
        } catch (err) {
          console.error("Location update failed:", err);
        }
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [token]);

  // ── Helper Icons ───────────────────────────────────────────────────────
  const getUserIcon = () => {
    return L.divIcon({
      html: `<div style="background:#ff4444; width:12px; height:12px; border-radius:50%; border:3px solid white; animation: pulse 2s infinite;"></div>`,
      className: "custom-div-icon",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  };

  // ── Distance Calculator ───────────────────────────────────────────────
  const calcDistance = (loc1, loc2) => {
    const R = 6371;
    const dLat = ((loc2[0] - loc1[0]) * Math.PI) / 180;
    const dLon = ((loc2[1] - loc1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((loc1[0] * Math.PI) / 180) *
        Math.cos((loc2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ── Show ALL pending request locations immediately ─────────────────────
  useEffect(() => {
    if (!leafletMap.current || !providerLocation) return;

    // Clear old pending markers
    userMarkers.forEach((m) => leafletMap.current.removeLayer(m));
    setUserMarkers([]);

    const pendingMarkers = [];

    requests
      .filter((r) => r.status === "pending" && r.location_lat && r.location_lon)
      .forEach((req) => {
        const userLoc = [req.location_lat, req.location_lon];
        const distance = calcDistance(providerLocation, userLoc).toFixed(2);

        const marker = L.marker(userLoc, { icon: yellowIcon })
          .addTo(leafletMap.current)
          .bindPopup(
            `<b>New Request</b><br>${req.service_category}<br>${distance} km away<br><small>${req.notes || "No notes"}</small>`
          )
          .openPopup();

        pendingMarkers.push(marker);
      });

    setUserMarkers(pendingMarkers);
  }, [requests, providerLocation]);

  // ── Draw line ONLY for accepted request ───────────────────────────────
  useEffect(() => {
    // Clear any existing line
    lines.forEach((line) => leafletMap.current?.removeLayer(line));
    setLines([]);

    if (!providerLocation) return;

    const accepted = requests.find((r) => r.status === "accepted");

    if (accepted?.location_lat && accepted?.location_lon) {
      const userLoc = [accepted.location_lat, accepted.location_lon];
      const distance = calcDistance(providerLocation, userLoc).toFixed(2);

      const line = L.polyline([providerLocation, userLoc], {
        color: "#00ff00",
        weight: 5,
        opacity: 0.9,
        dashArray: "10, 15",
      }).addTo(leafletMap.current);

      L.marker(userLoc, { icon: getUserIcon() })
        .addTo(leafletMap.current)
        .bindPopup(`<b>Customer (Accepted)</b><br>${distance} km away`)
        .openPopup();

      leafletMap.current.fitBounds(L.latLngBounds([providerLocation, userLoc]), { padding: [80, 80] });
      setLines([line]);
    }
  }, [providerLocation, requests]);

  // ── Handle Actions ─────────────────────────────────────────────────────
  const handleAction = async (id, action) => {
    const url = `${API_BASE}/provider/requests/${id}/${action}/`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Clear line on complete/reject
      if (action === "complete" || action === "reject") {
        lines.forEach((l) => leafletMap.current?.removeLayer(l));
        setLines([]);
      }

      if (action === "accept") {
        const chatroomId = data.chatroom_id || data.chatroom;
        if (chatroomId) {
          localStorage.setItem("active_chatroom_id", chatroomId);
          navigate(`/chat/${chatroomId}`);
          return;
        }
      }

      await fetchRequests();
    } catch (err) {
      console.error(`Error on ${action}:`, err);
    }
  };

  // ── Badge Renderer ─────────────────────────────────────────────────────
  const renderBadge = (status) => {
    switch (status) {
      case "accepted":
        return <span className="badge bg-success"><CheckCircle size={16}/> Accepted</span>;
      case "pending":
        return <span className="badge bg-warning text-dark"><Clock size={16}/> Pending</span>;
      case "rejected":
        return <span className="badge bg-danger"><XCircle size={16}/> Rejected</span>;
      case "completed":
        return <span className="badge bg-primary"><ThumbsUp size={16}/> Completed</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="provider-dashboard">
      <div className="container-fluid py-4">

        <section className="mb-5">
          <WebinarSlider />
        </section>

        <div className="bg-clear" ref={mapRef} style={{ height: "300px", borderRadius: "10px", marginBottom: "20px" }}></div>

        <div className="grid bg-dark border-warning shadow-lg">
          <div className="card-header  text-yellow-400 fw-bold">
            Service Requests
          </div>
          <ul className="list-group list-group-flush">
            {requests.length === 0 ? (
              <li className="list-group-item text-center text-light bg-black py-4">
                No requests yet.
              </li>
            ) : (
              requests.map((r) => (
                <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center bg-black p-3">
                  <div>
                    <small className="text-light">User: {r.username || "Doerhub User"}</small><br />
                    <small className="text-light">Notes: {r.notes || "—"}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {renderBadge(r.status)}
                    {r.status === "pending" && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleAction(r.id, "accept")}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setRequests(prev => prev.filter(req => req.id !== r.id))}
                        >
                          Ignore
                        </button>
                      </>
                    )}
                    {r.status === "accepted" && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleAction(r.id, "complete")}>
                          Mark Complete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <section className="py-5 text-center bg-black mt-4" id='about'>
        <h2 className="fw-bold mb-4 text-warning">About DoerHub</h2>
        <p className="mx-auto text-light" style={{ maxWidth: "720px" }}>
          DoerHub unites service providers and learners under one roof.
          DoerHub connects people who need services with skilled providers in their local area.
          We make it simple for users to request help and easy for providers to offer their expertise.
          Whether it's repairs, home assistance, or skill-based services, DoerHub ensures fast, reliable, 
          and real-time connections powered by live tracking and instant communication.
          Our mission is to build a trusted community where people help people, quickly and transparently.
        </p>
      </section>
    </div>
  );
};

export default ProviderDashboard;