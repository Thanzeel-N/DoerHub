import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReviewModal from "./ReviewModal";

function ProviderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);

  // ⭐ REVIEW MODAL STATES
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState("direct"); // always direct for profile page
  const [existingReview, setExistingReview] = useState(null);

  const token = localStorage.getItem("access");

  // ================================
  // ⭐ Fetch provider data
  // ================================
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/provider/${id}/`);
        if (!res.ok) throw new Error("Failed to fetch provider details");

        const data = await res.json();
        setProvider(data);
      } catch (err) {
        setError("⚠️ Unable to load provider details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  // ================================
  // ⭐ Fetch provider reviews
  // ================================
  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/review/provider/${id}/`);
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  // ================================
  // ⭐ Chat Handler
  // ================================
  const handleChat = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/chat/start/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider_id: id }),
      });

      const data = await res.json();
      if (data.chatroom_id) navigate(`/chat/${data.chatroom_id}`);
    } catch {
      alert("Unable to start chat");
    }
  };

  // ================================
  // ⭐ When review is created or updated
  // ================================
  const handleReviewUpdated = () => {
    fetchReviews();
    setExistingReview(null);
  };

  // ================================
  // ⭐ When review is deleted
  // ================================
  const handleReviewDeleted = () => {
    fetchReviews();
    setExistingReview(null);
  };

  // ================================
  // ⭐ UI
  // ================================
  if (loading)
    return (
      <div className="text-center text-warning mt-5">
        <div className="spinner-border text-warning"></div>
        <p>Loading provider details...</p>
      </div>
    );

  if (error)
    return (
      <div className="text-center text-danger mt-5">
        <p>{error}</p>
      </div>
    );

  return (
    <div
      className="py-5 text-warning"
      style={{ backgroundColor: "#111", minHeight: "100vh" }}
    >
      <button className="btn btn-outline-warning mb-4" onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      {/* =========================== */}
      {/* ⭐ PROVIDER CARD */}
      {/* =========================== */}
      {provider && (
        <div
          className="card bg-dark border-warning p-4 text-center mx-auto"
          style={{ maxWidth: "500px" }}
        >
          <img
            src={provider.profile_pic || "/default-profile.png"}
            alt={provider.username}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 15px",
            }}
          />

          <h3>{provider.user_name}</h3>
          <p>🛠 {provider.category_name}</p>
          <p>📍 {provider.location}</p>
          <p>⭐ {provider.experience} years experience</p>

          <p>
            {provider.is_online ? (
              <span className="text-success">🟢 Online</span>
            ) : (
              <span className="text-secondary">⚫ Offline</span>
            )}
          </p>

          <hr className="border-warning" />

          <p>{provider.bio || "No description available."}</p>

          <div className="d-flex flex-column gap-3 mt-3">
            <button className="btn btn-outline-warning" onClick={handleChat}>
              💬 Chat with Provider
            </button>

            {/* ⭐ REVIEW BUTTON */}
            <button
              className="btn btn-warning fw-bold text-dark"
              onClick={() => {
                setReviewType("direct");
                setExistingReview(null);
                setShowReviewModal(true);
              }}
            >
              ⭐ Review Provider
            </button>
          </div>
        </div>
      )}

      {/* =========================== */}
      {/* ⭐ REVIEWS LIST */}
      {/* =========================== */}
      <div className="mt-5">
        <h3 className="text-warning text-center mb-3">⭐ Customer Reviews</h3>

        {reviews.length === 0 ? (
          <p className="text-secondary text-center">No reviews yet.</p>
        ) : (
          <div className="list-group mb-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="list-group-item bg-dark text-light border-warning mb-2 rounded"
              >
                <div className="d-flex justify-content-between">
                  <strong>{rev.username}</strong>
                  <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
                </div>

                <p className="small text-light mb-1">{rev.comment || "No comment"}</p>

                <span className="text-muted small">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>

                {/* ⭐ Edit/Delete only for current user */}
                {parseInt(rev.user) === parseInt(localStorage.getItem("user_id")) && (
                  <div className="mt-2">
                    <button
                      className="btn btn-sm btn-outline-info me-2"
                      onClick={() => {
                        setExistingReview(rev);
                        setReviewType("direct");
                        setShowReviewModal(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================== */}
      {/* ⭐ REVIEW MODAL */}
      {/* =========================== */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewType={reviewType}
        providerId={id}
        existingReview={existingReview}
        onReviewUpdated={handleReviewUpdated}
        onReviewDeleted={handleReviewDeleted}
      />
    </div>
  );
}

export default ProviderDetailsPage;
