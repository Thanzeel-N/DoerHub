// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import "../css/ServiceRequestPage.css";

// function ServiceRequestPage() {
//   const [categories, setCategories] = useState([]);
//   const [formData, setFormData] = useState({
//     service_category: "",
//     location_address: "",
//     location_lat: null,
//     location_lon: null,
//     notes: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//   const [timeLeft, setTimeLeft] = useState(0);
//   const [activeRequestId, setActiveRequestId] = useState(null);
//   const [locationStatus, setLocationStatus] = useState("");
//   const navigate = useNavigate();
//   const token = localStorage.getItem("access");
//   const checkStatusInterval = useRef(null);

//   // ------------------------------
//   // Fetch categories
//   // ------------------------------
//   useEffect(() => {
//     const fetchCategories = async () => {
//       try {
//         const res = await fetch("http://localhost:8000/api/provider/service-categories/");
//         if (!res.ok) throw new Error("Failed to fetch categories");
//         const data = await res.json();
//         setCategories(data);
//       } catch (err) {
//         console.error("Category fetch error:", err);
//         setMessage("⚠️ Failed to load categories.");
//       }
//     };
//     fetchCategories();
//   }, []);

//   // ------------------------------
//   // GPS Location
//   // ------------------------------
//   const handleUseMyLocation = () => {
//     if (!navigator.geolocation) {
//       setLocationStatus("❌ Geolocation not supported in this browser.");
//       return;
//     }

//     setLocationStatus("📡 Fetching location...");

//     navigator.geolocation.getCurrentPosition(
//       async ({ coords }) => {
//         try {
//           const res = await fetch(
//             `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
//           );
//           const data = await res.json();

//           setFormData((prev) => ({
//             ...prev,
//             location_address: data.display_name || "Unknown location",
//             location_lat: coords.latitude,
//             location_lon: coords.longitude,
//           }));

//           setLocationStatus("✅ Location fetched successfully!");
//         } catch {
//           setLocationStatus("⚠️ Could not fetch address from GPS.");
//         }
        
//       },
//       (error) => {
//         if (error.code === 1)
//           setLocationStatus("⚠️ Permission denied. Please allow location access.");
//         else if (error.code === 3)
//           setLocationStatus("⚠️ Timeout expired. Try again.");
//         else setLocationStatus(`⚠️ ${error.message}`);
//       },
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
//     );
//   };

//   const handleChange = (e) =>
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

//   // ------------------------------
//   // Cancel
//   // ------------------------------
//   const handleCancel = async () => {
//     if (checkStatusInterval.current) clearInterval(checkStatusInterval.current);
//     setLoading(false);
//     setTimeLeft(0);

//     if (!activeRequestId) return;

//     try {
//       const res = await fetch(
//         `http://localhost:8000/api/service-requests/${activeRequestId}/cancel/`,
//         {
//           method: "POST",
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );
//       setMessage(res.ok ? "⏰ Request cancelled." : "Failed to cancel request.");
//       setActiveRequestId(null);
//     } catch {
//       setMessage("Error cancelling request.");
//     }
//   };

//   // ------------------------------
//   // Submit Request
//   // ------------------------------
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setMessage("");
//     setLoading(true);

//     try {
//       // Fallback to geocode if lat/lon missing
//       if (!formData.location_lat || !formData.location_lon) {
//         if (formData.location_address.trim()) {
//           const geoRes = await fetch(
//             `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//               formData.location_address
//             )}`
//           );
//           const geoData = await geoRes.json();
//           if (geoData.length > 0) {
//             const { lat, lon } = geoData[0];
//             formData.location_lat = parseFloat(lat);
//             formData.location_lon = parseFloat(lon);
//           } else {
//             setMessage("⚠️ Address not found. Try again.");
//             setLoading(false);
//             return;
//           }
//         } else {
//           setMessage("⚠️ Please provide an address or use your location.");
//           setLoading(false);
//           return;
//         }
//       }

//       const res = await fetch("http://localhost:8000/api/service-requests/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(formData),
//       });

//       if (!res.ok) throw new Error("Server error");
//       const data = await res.json();

//       setActiveRequestId(data.id);
//       setLoading(true);
//       setTimeLeft(180);
//       setMessage("⏳ Waiting for provider response...");

//       // Poll status
//       checkStatusInterval.current = setInterval(async () => {
//         try {
//           const statusRes = await fetch(
//             `http://localhost:8000/api/service-requests/${data.id}/status/`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           );
//           const statusData = await statusRes.json();

//           // ACCEPTED
//           if (statusData.status === "accepted" && statusData.chatroom_id) {
//             clearInterval(checkStatusInterval.current);
//             setLoading(false);
//             setTimeLeft(0);
//             setMessage("✅ Provider accepted! Redirecting...");
//             return navigate(`/chat/${statusData.chatroom_id}`);
//           }

//           // REJECTED
//           if (statusData.status === "rejected") {
//             clearInterval(checkStatusInterval.current);
//             setLoading(false);
//             setTimeLeft(0);
//             setMessage("❌ Provider rejected your request.");
//           }

//         } catch (e) {}
//       }, 5000);

//     } catch (err) {
//       console.error(err);
//       setMessage("⚠️ Something went wrong.");
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!loading || timeLeft <= 0) return;
//     const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
//     return () => clearInterval(timer);
//   }, [loading, timeLeft]);

//   useEffect(() => {
//     if (timeLeft === 0 && loading) handleCancel();
//   }, [timeLeft]);

//   // ------------------------------
//   // UI
//   // ------------------------------
//   return (
//     <div
      
//       style={{ backgroundColor: "#020202ff", color: "#ffc107", minHeight: "100vh" }}
//     >
//       <div className="text-center mb-4">
//         <h2>Request a Service</h2>
//       </div>

//       {message && <div className="alert alert-warning text-center">{message}</div>}
//       <center>
//       <div
//         className="card justify-content-center  shadow-sm mb-5"
//         style={{ backgroundColor: "#3d3c3cff", border: "2px solid #fdca32ff" }}
//       >
//         <div className="card-body">
//           {!loading && (
//             <form onSubmit={handleSubmit}>
//               <div className="mb-5">
//                 <label className="form-label fw-semibold">Service Category</label>
//                 <select
//                   name="service_category"
//                   className="form-select"
//                   value={formData.service_category}
//                   onChange={handleChange}
//                   style={{
//                     backgroundColor: "#111",
//                     color: "#ffc107",
//                     border: "1px solid #ffc107",
//                   }}
//                   required
//                 >
//                   <option value="">Select a category</option>
//                   {categories.map((cat) => (
//                     <option key={cat.value} value={cat.value}>
//                       {cat.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="input-group mb-3">
//                 <input
//                   type="text"
//                   name="location_address"
//                   className="form-control"
//                   value={formData.location_address}
//                   onChange={handleChange}
//                   placeholder="Enter address or use current location"
//                   style={{
//                     backgroundColor: "#111",
//                     color: "#ffc107",
//                     border: "1px solid #ffc107",
//                   }}
//                 />
//                 <button
//                   type="button"
//                   className="btn"
//                   style={{ backgroundColor: "#ffc107", color: "#111" }}
//                   onClick={handleUseMyLocation}
//                 >
//                   Use My Location
//                 </button>
//               </div>

//               {locationStatus && (
//                 <p className="text-warning small text-center mb-3">
//                   {locationStatus}
//                 </p>
//               )}

//               <div className="mb-3">
//                 <label className="form-label fw-semibold">Issue</label>
//                 <textarea
//                   name="notes"
//                   className="form-control"
//                   rows="3"
//                   value={formData.notes}
//                   onChange={handleChange}
//                   style={{
//                     backgroundColor: "#111",
//                     color: "#ffc107",
//                     border: "1px solid #ffc107",
//                   }}
//                 ></textarea>
//               </div>

//               <button
//                 type="submit"
//                 className="btn w-100 mt-5 btn-secondary"
//                 style={{
//                   fontWeight: "bold",
//                 }}
//               >
//                  Send Request
//               </button>
//             </form>
//           )}

//           {loading && (
//             <div className="text-center py-4">
//               <div className="spinner-border text-warning mb-3"></div>
//               <p>
//                 Waiting... ⏳ {Math.floor(timeLeft / 60)}:
//                 {(timeLeft % 60).toString().padStart(2, "0")}
//               </p>
//               <button
//                 className="btn btn-outline-danger"
//                 style={{ backgroundColor: "#ff3b3b", color: "#fff" }}
//                 onClick={handleCancel}
//               >
//                 ❌ Cancel
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//       </center>
//     </div>
//   );
// }

// export default ServiceRequestPage;



import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ServiceRequestPage.css";

function ServiceRequestPage() {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    service_category: "",
    location_address: "",
    location_lat: null,
    location_lon: null,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const ws = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // ------------------------------
  // Fetch Categories
  // ------------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/provider/service-categories/");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        setMessage("Failed to load categories.");
      }
    };
    fetchCategories();
  }, []);

  // ------------------------------
  // GPS Location
  // ------------------------------
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation not supported.");
      return;
    }

    setLocationStatus("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await res.json();

          setFormData((prev) => ({
            ...prev, 
            location_address: data.display_name || "Unknown",
            location_lat: coords.latitude,
            location_lon: coords.longitude,
          }));
          setLocationStatus("Location set successfully!");
        } catch {
          setLocationStatus("Could not get address.");
        }
      },
      (err) => {
        if (err.code === 1) setLocationStatus("Location access denied.");
        else if (err.code === 3) setLocationStatus("Location timeout.");
        else setLocationStatus("Location error: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ------------------------------
  // Start 3-minute countdown
  // ------------------------------
  const startCountdown = () => {
    setTimeLeft(180);
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(countdownRef.current);
          handleCancel(); // Auto-cancel after 3 mins
          return('Request timed out.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // ------------------------------
  // Cancel Request
  // ------------------------------
  const handleCancel = async () => {
    // Cleanup everything
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    setLoading(false);
    setTimeLeft(0);

    if (!activeRequestId) {
      setMessage("No active request.");
      return;
    }

    try {
      await fetch(`http://localhost:8000/api/service-requests/${activeRequestId}/cancel/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Request cancelled.");
    } catch {
      setMessage("Failed to cancel.");
    } finally {
      setActiveRequestId(null);
    }
  };

  // ------------------------------
  // Submit + WebSocket Connection
  // ------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Geocode if no lat/lon
    if (!formData.location_lat || !formData.location_lon) {
      if (formData.location_address.trim()) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location_address)}`
          );
          const data = await res.json();
          if (data.length > 0) {
            formData.location_lat = parseFloat(data[0].lat);
            formData.location_lon = parseFloat(data[0].lon);
          } else {
            setMessage("Address not found.");
            setLoading(false);
            return;
          }
        } catch {
          setMessage("Geocoding failed.");
          setLoading(false);
          return;
        }
      } else {
        setMessage("Enter address or use location.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("http://localhost:8000/api/service-requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setActiveRequestId(data.id);
      setMessage("Waiting for provider...");
      startCountdown();

      // CONNECT TO WEBSOCKET
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      ws.current = new WebSocket(
        `${protocol}://localhost:8000/ws/service-request/${data.id}/?token=${token}`
      );

      ws.current.onopen = () => {
        console.log("WebSocket connected for request:", data.id);
      };

      ws.current.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "request.accepted" && msg.chatroom_id) {
          // INSTANT STOP EVERYTHING
          if (ws.current) ws.current.close();
          if (countdownRef.current) clearInterval(countdownRef.current);

          setLoading(false);
          setTimeLeft(0);
          setMessage("Provider accepted! Redirecting...");
          
          timerRef.current = setTimeout(() => {
            navigate(`/chat/${msg.chatroom_id}`);
          }, 1500);
        }

        if (msg.type === "request.rejected") {
          if (ws.current) ws.current.close();
          if (countdownRef.current) clearInterval(countdownRef.current);

          setLoading(false);
          setTimeLeft(0);
          setMessage("Provider rejected your request.");
          setActiveRequestId(null);
        }
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      ws.current.onclose = () => {
        console.log("WebSocket closed");
      };

    } catch (err) {
      console.error(err);
      setMessage("Failed to send request.");
      setLoading(false);
    }
  };

  // ------------------------------
  // Cleanup on unmount
  // ------------------------------
  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Format timer
  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = (timeLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ------------------------------
  // UI Render
  // ------------------------------
  return (
    <div style={{ backgroundColor: "#020202ff", color: "#ffc107", minHeight: "100vh", padding: "20px" }}>
      <div className="text-center mb-4">
        <h2>Request a Service</h2>
      </div>

      {message && <div className="alert alert-warning text-center">{message}</div>}

      <center>
        <div
          className="card shadow-sm mb-5"
          style={{ maxWidth: "500px", backgroundColor: "#3d3c3cff", border: "2px solid #fdca32ff" }}
        >
          <div className="card-body p-4">

            {!loading && (
              <form onSubmit={handleSubmit}>

                <div className="mb-4">
                  <label className="form-label fw-bold">Service Category</label>
                  <select
                    name="service_category"
                    className="form-select"
                    value={formData.service_category}
                    onChange={handleChange}
                    style={{ backgroundColor: "#111", color: "#ffc107", border: "1px solid #ffc107" }}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group mb-3">
                  <input
                    type="text"
                    name="location_address"
                    className="form-control"
                    placeholder="Enter address"
                    value={formData.location_address}
                    onChange={handleChange}
                    style={{ backgroundColor: "#111", color: "#ffc107", border: "1px solid #ffc107" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ backgroundColor: "#ffc107", color: "#111" }}
                    onClick={handleUseMyLocation}
                  >
                    Use My Location
                  </button>
                </div>
                {locationStatus && <p className="small text-center text-warning">{locationStatus}</p>}

                <div className="mb-4">
                  <label className="form-label fw-bold">Describe the issue</label>
                  <textarea
                    name="notes"
                    className="form-control"
                    rows="4"
                    value={formData.notes}
                    onChange={handleChange}
                    style={{ backgroundColor: "#111", color: "#ffc107", border: "1px solid #ffc107" }}
                    placeholder="e.g., AC not cooling, water leakage, etc."
                  />
                </div>

                <button
                  type="submit"
                  className="btn w-100"
                  style={{ backgroundColor: "#ffc107", color: "#111", fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  Send Request
                </button>
              </form>
            )}

            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-warning mb-4" style={{ width: "2rem", height: "2rem" }}></div>
                <h2>Waiting for a provider...</h2>
                <p>
                Waiting... ⏳ {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
                <button
                  className="btn btn-danger mt-3"
                  onClick={handleCancel}
                >
                  Cancel Request
                </button>
              </div>
            )}

          </div>
        </div>
      </center>
    </div>
  );
}

export default ServiceRequestPage;