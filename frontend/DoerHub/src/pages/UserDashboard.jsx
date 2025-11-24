// import React, { useState, useEffect, useRef } from "react";
// import { CheckCircle, Clock, XCircle, HelpCircle, Search, Star, ThumbsUp } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import "../css/UserDashboard.css";
// import WebinarSlider from "./WebinarSlide";
// import Modal from "react-modal";

// const API_BASE = "http://localhost:8000/api";
// const WS_BASE = "ws://localhost:8000/ws/requests/user"; // ✅ correct path

// Modal.setAppElement("#root");

// function UserDashboard() {
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("");
//   const [showReviewModal, setShowReviewModal] = useState(false);
//   const [selectedService, setSelectedService] = useState(null);
//   const [rating, setRating] = useState(5);
//   const [comment, setComment] = useState("");
//   const [latestReviews, setLatestReviews] = useState([]);
//   const [categories, setCategories] = useState([]); // <- Added for service category cards
//   const token = localStorage.getItem("access");
//   const userId = localStorage.getItem("user_id");
//   const navigate = useNavigate();
//   const wsRef = useRef(null);

//   // ====== Fetch User's Service Requests ======
//   const fetchRequests = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/service-requests/`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (!res.ok) throw new Error("Failed to fetch requests");
//       const data = await res.json();

//       console.log("📦 User requests:", data);
//       setRequests(data);
//       setMessage("");
//     } catch (err) {
//       console.error("Error fetching requests:", err);
//       setMessage("⚠️ Failed to load your requests. Please try again later.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ====== Fetch categories for cards (NEW) ======
//   const fetchCategories = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/provider/service-categories/`);
//       if (!res.ok) throw new Error("Failed to load categories");
//       const data = await res.json();
//       // keep first 6 for compact display
//       setCategories(Array.isArray(data) ? data.slice(0, 6) : []);
//     } catch (err) {
//       console.error("Error fetching categories:", err);
//     }
//   };

//   // ====== Fetch latest 4 reviews ======
//   const fetchLatestReviews = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/review/latest/`, {
//         headers: token ? { Authorization: `Bearer ${token}` } : {},
//       });
//       if (!res.ok) throw new Error("Failed to load reviews");
//       const data = await res.json();
//       setLatestReviews(data);
//     } catch (err) {
//       console.error("Error fetching latest reviews:", err);
//     }
//   };

//   useEffect(() => {
//     fetchRequests();
//     fetchLatestReviews();
//     fetchCategories(); // <- fetch categories on mount
//   }, []);

//   // ====== Session WebSocket Connection Setup ======
//   useEffect(() => {
//     if (!userId) return;

//     if (!window.sessionWS || window.sessionWS.readyState === WebSocket.CLOSED) {
//       window.sessionWS = new WebSocket(`${WS_BASE}/${userId}/`);
//       console.log(`🌐 Created new session WebSocket for user ${userId}`);
//     } else {
//       console.log(`♻️ Reusing existing session WebSocket for user ${userId}`);
//     }

//     const ws = window.sessionWS;
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log("✅ Session WebSocket connected (User side)");
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log("📨 Message received (User):", data);

//       if (data.type === "request_update") {
//         setRequests((prev) =>
//           prev.map((req) =>
//             req.id === data.request.id ? { ...req, ...data.request } : req
//           )
//         );
//       }

//       if (data.type === "new_request_status") {
//         setMessage(data.message || "Request status updated!");
//       }
//     };

//     ws.onerror = (err) => {
//       console.error("⚡ Session WebSocket error:", err);
//     };

//     ws.onclose = (e) => {
//       console.log("❌ Session WebSocket closed:", e.reason);
//     };

//     return () => {
//       console.log("👋 Leaving page, keeping session WebSocket open");
//     };
//   }, [userId]);

//   // ====== Cancel a Request (User Side) ======
//   const cancelRequest = async (id) => {
//     if (!window.confirm("Are you sure you want to cancel this request?")) return;

//     try {
//       const res = await fetch(`${API_BASE}/service-requests/${id}/cancel/`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       const data = await res.json();

//       if (!res.ok) throw new Error(data.error || "Cancellation failed");
//       setMessage("✅ Request cancelled successfully.");

//       setRequests((prev) =>
//         prev.map((req) =>
//           req.id === id ? { ...req, status: "cancelled", cancelled_by: "user" } : req
//         )
//       );

//       if (window.sessionWS && window.sessionWS.readyState === WebSocket.OPEN) {
//         window.sessionWS.send(
//           JSON.stringify({
//             action: "request_cancelled",
//             request_id: id,
//             cancelled_by: "user",
//           })
//         );
//       }
//     } catch (err) {
//       console.error("Cancel request error:", err);
//       setMessage("⚠️ Failed to cancel the request. Please try again later.");
//     }
//   };

//   // ====== Submit Review ======
//   const submitReview = async () => {
//     if (!selectedService?.id) {
//       alert("Invalid service selected.");
//       return;
//     }

//     try {
//       console.log("Submitting review for ID:", selectedService.id);

//       const res = await fetch(`${API_BASE}/review/create/`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           service_request: selectedService.id,  // ← must be valid integer
//           rating,
//           comment: comment.trim(),
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         // Show specific error from backend
//         throw new Error(data.service_request?.[0] || data.detail || "Failed to submit review");
//       }

//       alert("Review submitted successfully!");
//       setShowReviewModal(false);
//       setRating(5);
//       setComment("");
//       setSelectedService(null);
//       fetchRequests();
//       fetchLatestReviews();
//     } catch (err) {
//       console.error("Review submit error:", err);
//       alert(err.message || "Failed to submit review.");
//     }
//   };

//   // ====== Status Badge Renderer ======
//   const renderStatusBadge = (status) => {
//     switch (status) {
//       case "accepted":
//         return (
//           <span className="badge badge-accepted d-flex align-items-center gap-1">
//             <CheckCircle size={16} /> Accepted
//           </span>
//         );
//       case "pending":
//         return (
//           <span className="badge badge-pending d-flex align-items-center gap-1">
//             <Clock size={16} /> Pending
//           </span>
//         );
//       case "cancelled":
//         return (
//           <span className="badge badge-cancelled d-flex align-items-center gap-1">
//             <XCircle size={16} /> Cancelled
//           </span>
//         );
//       case "completed":
//         return (
//           <span className="badge badge-completed d-flex align-items-center gap-1 text-success">
//             <ThumbsUp size={16} /> Completed
//           </span>
//         );
//       default:
//         return (
//           <span className="badge badge-other d-flex align-items-center gap-1">
//             <HelpCircle size={16} /> {status}
//           </span>
//         );
//     }
//   };

//   return (
//     <div className="dashboard-container py-4">
//       <section className="mt-6">
//         <h2 className="text-xl font-bold mb-2">Upcoming Webinars & Workshops</h2>
//         <WebinarSlider />
//       </section>

//       {/* ===== New: Service Category Cards (horizontal, 5 items + arrow) ===== */}
//       <section className="my-4">
//         <h3 className="text-warning text-center mb-3">Explore Services</h3>
//         <div className="">
//           <div
//             className="d-flex align-items-stretch"
//             style={{
//               gap: "1rem",
//               overflowX: "auto",
//               padding: "0.5rem",
//               WebkitOverflowScrolling: "touch",
//             }}
//           >
//             {categories.length === 0 ? (
//               <div className="text-muted text-center">No categories to show.</div>
//             ) : (
//               <>
//                 {categories.slice(0, 5).map((cat) => (
//                   <div
//                     key={cat.value}
//                     className="card bg-dark border-warning p-3"
//                     style={{
//                       minWidth: "200px",      // keeps cards straight
//                       maxWidth: "320px",
//                       cursor: "pointer",
//                       display: "flex",
//                       flexDirection: "column",
//                       justifyContent: "space-between",
//                     }}
//                     onClick={() => navigate(`/user/browse-services/${cat.value}`)}
//                   >
//                     <div>
//                       <strong className="text-warning mb-1 d-block">{cat.label}</strong>
//                       <small className="text-light">Click to browse providers</small>
//                     </div>

//                     <div className="mt-3 d-flex justify-content-between align-items-center">
//                       <button className="btn btn-sm btn-outline-warning">Browse</button>
//                       {/* optional provider count if present */}
//                       {cat.providerCount !== undefined && (
//                         <small className="text-secondary">{cat.providerCount}</small>
//                       )}
//                     </div>
//                   </div>
//                 ))}

//                 {/* Arrow / See more card */}
//                 <div
//                   key="see-more"
//                   className="card bg-dark border-warning p-3 d-flex justify-content-center align-items-center"
//                   style={{
//                     minWidth: "120px",
//                     maxWidth: "140px",
//                     cursor: "pointer",
//                   }}
//                   onClick={() => navigate("/user/browse-services")}
//                   aria-label="See all services"
//                   title="See all services"
//                 >
//                   <div className="text-center">
//                     <div
//                       style={{
//                         fontSize: "1.6rem",
//                         lineHeight: 1,
//                         color: "#ffc107",
//                         fontWeight: "700",
//                       }}
//                     >
//                       →
//                     </div>
//                     <small className="text-light">More</small>
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </section>

//       {loading && (
//         <div className="text-center my-5 text-light">
//           <div className="spinner-border text-warning" role="status"></div>
//           <p className="mt-2">Loading your requests...</p>
//         </div>
//       )}

//       {!loading && message && (
//         <div className="alert alert-dark border-warning text-warning text-center">
//           {message}
//         </div>
//       )}

//       {!loading && requests.length === 0 && (
//         <div className="alert alert-dark border-warning text-warning text-center">
//           You haven’t made any service requests yet.
//         </div>
//       )}

//       {!loading && requests.length > 0 && (
//         <div className="card dashboard-card shadow-lg border-0">
//           <div className="card-header bg-black text-warning fw-bold">
//             Your Requests
//           </div>
//           <ul className="list-group list-group-flush">
//             {requests.map((req) => (
//               <li
//                 key={req.id}
//                 className="list-group-item dashboard-item d-flex justify-content-between align-items-center"
//               >
//                 <div>
//                   <strong className="text-warning">
//                     {req.service_category}
//                   </strong>
//                   <div className="small text-light">
//                     Status:{" "}
//                     {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
//                     {" | "}
//                     {req.status === "cancelled" ? (
//                       req.cancelled_by === "provider" && req.provider_name ? (
//                         <>Cancelled by {req.provider_name}</>
//                       ) : (
//                         <>Cancelled by you</>
//                       )
//                     ) : req.provider_name ? (
//                       <>Provider: {req.provider_name}</>
//                     ) : (
//                       "No provider assigned"
//                     )}
//                   </div>

//                   {req.notes && (
//                     <div className="small text-secondary fst-italic">
//                       “{req.notes.slice(0, 60)}
//                       {req.notes.length > 60 ? "..." : ""}”
//                     </div>
//                   )}
//                 </div>

//                 <div className="d-flex align-items-center gap-3">
//                   {renderStatusBadge(req.status)}
//                   {req.status === "pending" && (
//                     <button
//                       onClick={() => cancelRequest(req.id)}
//                       className="btn btn-sm btn-outline-danger"
//                     >
//                       Cancel
//                     </button>
//                   )}
//                   {req.status === "completed" && !req.review && (
//                     <button
//                       onClick={() => {
//                         setSelectedService(req);
//                         setShowReviewModal(true);
//                       }}
//                       className="btn btn-sm btn-outline-warning"
//                     >
//                       <Star size={14} /> Review
//                     </button>
//                   )}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {/* ✅ Latest 4 Reviews Section */}
//       <div className="mt-5">
//         <h3 className="text-warning text-center mb-4">⭐ Latest Reviews</h3>
//         <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
//           {latestReviews.length === 0 ? (
//             <p className="text-secondary text-center">No reviews yet.</p>
//           ) : (
//             latestReviews.map((rev) => (
//               <div key={rev.id} className="col">
//                 <div className="card bg-dark text-light border-warning p-3 h-100">
//                   <div className="d-flex justify-content-between align-items-center mb-2">
//                     <strong>{rev.user_name}</strong>
//                     <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
//                   </div>
//                   <p className="small text-light">
//                     {rev.comment || "No comment provided."}
//                   </p>
//                   <span className="text-muted small">
//                     {new Date(rev.created_at).toLocaleDateString()}
//                   </span>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* ===== Review Modal ===== */}
//       <Modal
//         isOpen={showReviewModal}
//         onRequestClose={() => setShowReviewModal(false)}
//         style={{
//           overlay: {
//             backgroundColor: "rgba(0, 0, 0, 0.7)",
//             zIndex: 1000,
//           },
//           content: {
//             top: "50%",
//             left: "50%",
//             right: "auto",
//             bottom: "auto",
//             marginRight: "-50%",
//             transform: "translate(-50%, -50%)",
//             backgroundColor: "#111",
//             color: "#fff",
//             borderRadius: "10px",
//             border: "1px solid #ffc107",
//             maxWidth: "420px",
//             width: "92%",
//             padding: "20px",
//           },
//         }}
//         closeTimeoutMS={200}
//       >
//         <h4 className="text-warning mb-3 text-center">
//           Review Service - {selectedService?.service_category}
//         </h4>

//         {/* STAR RATING SELECTOR */}
//         <div className="mb-4">
//           <label className="d-block mb-2">Rating:</label>
//           <div className="d-flex justify-content-center gap-2">
//             {[1, 2, 3, 4, 5].map((star) => (
//               <span
//                 key={star}
//                 onClick={() => setRating(star)}
//                 className="cursor-pointer transition-all duration-200"
//                 style={{
//                   fontSize: "28px",
//                   color: star <= rating ? "#ffc107" : "#444",
//                   filter: star <= rating ? "drop-shadow(0 0 4px #ffc107)" : "none",
//                   transform: star <= rating ? "scale(1.1)" : "scale(1)",
//                 }}
//               >
//                 {star <= rating ? "★" : "☆"}
//               </span>
//             ))}
//           </div>
//           <small className="text-center d-block mt-1 text-muted">
//             {rating} out of 5 stars
//           </small>
//         </div>

//         <label>Comment:</label>
//         <textarea
//           className="form-control mb-3 bg-dark text-white border-warning"
//           rows="3"
//           value={comment}
//           onChange={(e) => setComment(e.target.value)}
//           placeholder="Share your experience..."
//           style={{ borderColor: "#ffc107" }}
//         ></textarea>

//         <div className="text-center">
//           <button onClick={submitReview} className="btn btn-success me-2">
//             Submit
//           </button>
//           <button
//             onClick={() => setShowReviewModal(false)}
//             className="btn btn-secondary"
//           >
//             Close
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// export default UserDashboard;

// import React, { useState, useEffect, useRef } from "react";
// import { CheckCircle, Clock, XCircle, HelpCircle, Star, ThumbsUp } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import "../css/UserDashboard.css";
// import WebinarSlider from "./WebinarSlide";
// import ReviewModal from "./ReviewModal";  // ⭐ NEW IMPORT
// import Modal from "react-modal";

// const API_BASE = "http://localhost:8000/api";
// const WS_BASE = "ws://localhost:8000/ws/requests/user";

// Modal.setAppElement("#root");

// function UserDashboard() {
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("");
//   const [showReviewModal, setShowReviewModal] = useState(false);
//   const [selectedService, setSelectedService] = useState(null);
//   const [latestReviews, setLatestReviews] = useState([]);
//   const [categories, setCategories] = useState([]);

//   const token = localStorage.getItem("access");
//   const userId = localStorage.getItem("user_id");
//   const navigate = useNavigate();
//   const wsRef = useRef(null);

//   // ================== FETCH REQUESTS ==================
//   const fetchRequests = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/service-requests/`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (!res.ok) throw new Error("Failed to fetch requests");
//       const data = await res.json();

//       setRequests(data);
//       setMessage("");
//     } catch (err) {
//       console.error("Error fetching requests:", err);
//       setMessage("⚠️ Failed to load your requests.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ================== FETCH CATEGORIES ==================
//   const fetchCategories = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/provider/service-categories/`);
//       if (!res.ok) throw new Error("Failed to load categories");
//       const data = await res.json();
//       setCategories(data.slice(0, 6));
//     } catch (err) {
//       console.error("Error fetching categories:", err);
//     }
//   };

//   // ================== FETCH LATEST REVIEWS ==================
//   const fetchLatestReviews = async () => {
//     try {
//       const res = await fetch(`${API_BASE}/review/latest/`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json"
//         }
//       });
//       const data = await res.json();
//       setLatestReviews(data);
//     } catch (err) {
//       console.error("Error fetching latest reviews:", err);
//     }
//   };

//   useEffect(() => {
//     fetchRequests();
//     fetchCategories();
//     fetchLatestReviews();
//   }, []);

//   // ================== WEBSOCKET ==================
//   useEffect(() => {
//     if (!userId) return;

//     const ws = new WebSocket(`${WS_BASE}/${userId}/`);
//     wsRef.current = ws;

//     ws.onopen = () => console.log("WS connected");
//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       if (data.type === "request_update") {
//         setRequests((prev) =>
//           prev.map((req) =>
//             req.id === data.request.id ? { ...req, ...data.request } : req
//           )
//         );
//       }
//     };

//     return () => ws.close();
//   }, [userId]);

//   // ================== CANCEL REQUEST ==================
//   const cancelRequest = async (id) => {
//     if (!window.confirm("Cancel this request?")) return;

//     try {
//       const res = await fetch(`${API_BASE}/service-requests/${id}/cancel/`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Cancel failed");

//       setRequests((prev) =>
//         prev.map((req) => (req.id === id ? { ...req, status: "cancelled" } : req))
//       );
//     } catch (err) {
//       alert(err.message);
//     }
//   };

//   // ================== STATUS BADGE ==================
//   const renderStatusBadge = (status) => {
//     switch (status) {
//       case "accepted":
//         return <span className="badge badge-accepted text-secondary"><CheckCircle size={16} /> Accepted</span>;
//       case "pending":
//         return <span className="badge badge-pending text-warning"><Clock size={16} /> Pending</span>;
//       case "cancelled":
//         return <span className="badge badge-cancelled text-danger"><XCircle size={16} /> Cancelled</span>;
//       case "completed":
//         return <span className="badge badge-completed text-success"><ThumbsUp size={16} /> Completed</span>;
//       default:
//         return <span className="badge badge-other"><HelpCircle size={16} /> {status}</span>;
//     }
//   };

//   return (
//     <div className="dashboard-container py-4">
//       {/* ===== Webinars ===== */}
//       <section className="mt-6">
//         <h2 className="text-xl font-bold mb-2">Upcoming Webinars & Workshops</h2>
//         <WebinarSlider />
//       </section>

//       {/* ===== Categories ===== */}
//       <section className="my-4">
//         <h3 className="text-warning text-center mb-3">Explore Services</h3>
//         <div className="d-flex gap-3 overflow-auto">
//           {categories.map((cat) => (
//             <div
//               key={cat.value}
//               className="card bg-dark border-warning p-3"
//               style={{ minWidth: "200px", cursor: "pointer" }}
//               onClick={() => navigate(`/user/browse-services/${cat.value}`)}
//             >
//               <strong className="text-warning">{cat.label}</strong>
//               <small className="text-light d-block">Click to browse providers</small>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* ===== Requests ===== */}
//       {!loading && requests.length > 0 && (
//         <div className="card dashboard-card">
//           <div className="card-header bg-black text-warning fw-bold">
//             Your Requests
//           </div>

//           <ul className="list-group list-group-flush bg-black">
//             {requests.map((req) => (
//               <li
//                 key={req.id}
//                 className="list-group-item d-flex justify-content-between align-items-center"
//               >
//                 <div>
//                   <strong className="text-warning">{req.service_category}</strong>
//                   <div className="small text-light">
//                     Status: {req.status} | Provider: {req.provider_name || "None"}
//                   </div>
//                 </div>

//                 <div className="d-flex gap-2">
//                   {renderStatusBadge(req.status)}

//                   {req.status === "pending" && (
//                     <button className="btn btn-sm btn-outline-danger" onClick={() => cancelRequest(req.id)}>
//                       Cancel
//                     </button>
//                   )}

//                   {/* ⭐ Open Review Modal */}
//                   {req.status === "completed" && !req.review && (
//                     <button
//                       className="btn btn-sm btn-outline-warning"
//                       onClick={() => {
//                         setSelectedService(req);
//                         setShowReviewModal(true);
//                       }}
//                     >
//                       <Star size={14} /> Review
//                     </button>
//                   )}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {/* ===== Latest Reviews ===== */}
//       <div className="mt-5">
//         <h3 className="text-warning text-center mb-4">⭐ Latest Reviews</h3>

//         <div className="row g-3">
//           {latestReviews.map((rev) => (
//             <div key={rev.id} className="col-md-3">
//               <div className="card bg-dark text-light border-warning p-3">
//                 <strong>{rev.username}</strong>
//                 <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
//                 <p className="small">{rev.comment}</p>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* ⭐ Use External ReviewModal Component */}
//       <ReviewModal
//         isOpen={showReviewModal}
//         onClose={() => setShowReviewModal(false)}
//         service={selectedService}
//         onReviewSubmitted={() => {
//           setShowReviewModal(false);
//           fetchRequests();
//           fetchLatestReviews();
//         }}
//       />
//     </div>
//   );
// }

// export default UserDashboard;


import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Star,
  ThumbsUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../css/UserDashboard.css";
import WebinarSlider from "./WebinarSlide";
import ReviewModal from "./ReviewModal";   // External Review Modal
import Modal from "react-modal";

const API_BASE = "http://localhost:8000/api";
const WS_BASE = "ws://localhost:8000/ws/requests/user";

Modal.setAppElement("#root");

function UserDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [latestReviews, setLatestReviews] = useState([]);
  const [categories, setCategories] = useState([]);

  const token = localStorage.getItem("access");
  const userId = localStorage.getItem("user_id");
  const navigate = useNavigate();
  const wsRef = useRef(null);

  // ================== FETCH REQUESTS ==================
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/service-requests/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();

      const latestFive = [...data]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

      setRequests(latestFive);
      // setRequests(data);
      // setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Failed to load your requests.");
    } finally {
      setLoading(false);
    }
  };

  // ================== FETCH CATEGORIES ==================
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/provider/service-categories/`);
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data.slice(0, 6) : []);
    } catch (err) {
      console.error(err);
    }
  };

  // ================== FETCH LATEST REVIEWS ==================
  const fetchLatestReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/review/latest/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load reviews");
      const data = await res.json();
      setLatestReviews(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
  const loadAndSchedule = async () => {
    await fetchLatestReviews();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLatestReviews();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  };

  loadAndSchedule();
}, [token]);

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  // ================== SESSION WEBSOCKET (reused across dashboard visits) ==================
  useEffect(() => {
    if (!userId) return;

    if (!window.sessionWS || window.sessionWS.readyState === WebSocket.CLOSED) {
      window.sessionWS = new WebSocket(`${WS_BASE}/${userId}/`);
    }
    const ws = window.sessionWS;
    wsRef.current = ws;

    ws.onopen = () => console.log("Session WS connected (User)");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "request_update") {
        setRequests((prev) =>
          prev.map((req) =>
            req.id === data.request.id ? { ...req, ...data.request } : req
          )
        );
      }
    };

    // Keep connection alive across dashboard navigation
    return () => {
      console.log("Leaving dashboard – keeping session WS open");
    };
  }, [userId]);

  // ================== CANCEL REQUEST ==================
  const cancelRequest = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;

    try {
      const res = await fetch(`${API_BASE}/service-requests/${id}/cancel/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "cancelled" } : req
        )
      );
      setMessage("Request cancelled successfully.");
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      alert(err.message);
    }
  };

  // ================== STATUS BADGE ==================
  const renderStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return (
          <span className="badge badge-accepted d-flex align-items-center gap-1">
            <CheckCircle size={16} /> Accepted
          </span>
        );
      case "pending":
        return (
          <span className="badge badge-pending d-flex align-items-center gap-1">
            <Clock size={16} /> Pending
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-cancelled d-flex align-items-center gap-1">
            <XCircle size={16} /> Cancelled
          </span>
        );
      case "rejected":
        return (
          <span className="badge badge-rejected d-flex align-items-center gap-1">
            <XCircle size={16} /> Rejected
          </span>
        );
      case "completed":
        return (
          <span className="badge badge-completed d-flex align-items-center gap-1 text-success">
            <ThumbsUp size={16} /> Completed
          </span>
        );
      default:
        return (
          <span className="badge badge-other d-flex align-items-center gap-1">
            <HelpCircle size={16} /> {status}
          </span>
        );
    }
  };

  return (
    <div className="dashboard-container py-4">
      {/* Webinars */}
      <section className="mt-6 ">
        <WebinarSlider />
      </section>

      {/* Service Categories */}
      <section className="my-4">
        <h3 className="text-warning text-center mb-3">Explore Services</h3>
        {/* CTA Button */}
          <div className="text-center">
            <button
              className="btn draw-border mt-5 mb-5"
              onClick={() => navigate("/user/service-request")}
              style={{
                background: "#ffc107",
                color: "#f4f3f0ff",
                fontWeight: "bold",
                padding: "0.85rem 2.2rem",
                fontSize: "1.1rem",
                letterSpacing: "0.5px",
                border: "2px solid #ffc107",
                borderRadius: "10px",
              }}
            >
              Request Service
            </button>
          </div>
        <div className="d-flex align-items-stretch" style={{ gap: "1rem", overflowX: "auto", padding: "0.5rem" }}>
          {categories.slice(0, 5).map((cat) => (
            <div
              key={cat.value}
              className="card bg-dark border-warning p-3"
              style={{ minWidth: "200px", cursor: "pointer" }}
              onClick={() => navigate(`/user/browse-services/${cat.value}`)}
            >
              <strong className="text-warning d-block">{cat.label}</strong>
              <small className="text-light">Click to browse providers</small>
            </div>
          ))}
          <div
            className="card bg-dark border-warning p-3 d-flex justify-content-center align-items-center"
            style={{ minWidth: "120px", cursor: "pointer" }}
            onClick={() => navigate("/user/browse-services")}
          >
            <div className="text-center">
              <div style={{ fontSize: "1.8rem", color: "#ffc107" }}>→</div>
              <small className="text-light">More</small>
            </div>
          </div>
        </div>
      </section>

      {/* Loading / Empty / Message */}
      {loading && (
        <div className="text-center my-5 text-light">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-2">Loading your requests...</p>
        </div>
      )}
      {message && (
        <div className="alert alert-dark border-warning text-warning text-center">
          {message}
        </div>
      )}
      {!loading && requests.length === 0 && (
        <div className="alert alert-dark border-warning text-warning text-center">
          You haven’t made any service requests yet.
        </div>
      )}

      {/* Requests List */}
      {!loading && requests.length > 0 && (
        <div className="grid dashboard-card shadow-lg border-0">
          <div className="card-header bg-black text-warning fw-bold">
            Your Requests
          </div>
          <ul className="list-group list-group-flush">
            {requests.map((req) => (
              <li
                key={req.id}
                className="list-group-item dashboard-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong className="text-warning">{req.service_category_name}</strong>
                  <div className="small text-light">
                    Status: {req.status.charAt(0).toUpperCase() + req.status.slice(1)} |{" "}
                    {req.provider_name || "No provider assigned"}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {renderStatusBadge(req.status)}
                  {req.status === "pending" && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => cancelRequest(req.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {req.status === "completed" && !req.review && (
                    <button
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => {
                        setSelectedService(req);
                        setShowReviewModal(true);
                      }}
                    >
                      <Star size={14} /> Review
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Latest Reviews */}
      <div className="mt-5">
        <h3 className="text-warning text-center mb-4">Latest Reviews</h3>
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
          {latestReviews.length === 0 ? (
            <p className="text-secondary text-center">No reviews yet.</p>
          ) : (
            latestReviews.map((rev) => (
              <div key={rev.id} className="col">
                <div className="card bg-dark text-light border-warning p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>{rev.username || "DoerHub User"}</strong>
                    <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
                  </div>
                  <p className="small text-light">
                    {rev.comment || "No comment provided."}
                  </p>
                  <small className="text-secondary">
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <section className="py-5 text-center bg-black mt-4 mb-4" id='about'>
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

      {/* External Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        service={selectedService}
        onReviewSubmitted={() => {
          setShowReviewModal(false);
          fetchRequests();
          fetchLatestReviews();
        }}
      />
    </div>
  );
}

export default UserDashboard;