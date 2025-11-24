import React, { useState, useEffect } from "react";
import Modal from "react-modal";

const API_BASE = "http://localhost:8000/api";

Modal.setAppElement("#root");

function ReviewModal({
  isOpen,
  onClose,
  reviewType = "service",        // "service" | "direct"
  service = null,                // for service reviews
  providerId = null,             // for direct reviews
  existingReview = null,         // for editing
  onReviewUpdated = () => {},
  onReviewDeleted = () => {},
}) {
  const token = localStorage.getItem("access");

  // ⭐ If editing, load existing rating/comment
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || "");

  // Reset fields when modal opens/closes
  useEffect(() => {
    setRating(existingReview?.rating || 5);
    setComment(existingReview?.comment || "");
  }, [existingReview, isOpen]);

  // ======================
  // ⭐ SUBMIT REVIEW
  // ======================
  const handleSubmit = async () => {
    try {
      let url = "";
      let method = existingReview ? "PUT" : "POST";
      let payload = { rating, comment };

      if (existingReview) {
        // Editing a review
        url = `${API_BASE}/review/${existingReview.id}/update/`;
      } else if (reviewType === "service") {
        // New service review
        if (!service?.id) return alert("Missing service_request ID");
        url = `${API_BASE}/review/create/`;
        payload.service_request = service.id;
      } else {
        // New direct review
        if (!providerId) return alert("Missing provider ID");
        url = `${API_BASE}/review/direct/create/`;
        payload.provider_id = providerId;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit review");

      onReviewUpdated(data);
      onClose();
      alert(existingReview ? "Review updated!" : "Review submitted!");
    } catch (err) {
      alert(err.message);
    }
  };

  // ======================
  // ⭐ DELETE REVIEW
  // ======================
  const handleDelete = async () => {
    if (!existingReview) return;
    if (!window.confirm("Delete this review?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/review/${existingReview.id}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      onReviewDeleted(existingReview.id);
      onClose();
      alert("Review deleted.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        overlay: { backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1000 },
        content: {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#111",
          color: "#fff",
          borderRadius: "10px",
          border: "1px solid #ffc107",
          maxWidth: "420px",
          width: "92%",
          padding: "20px",
        },
      }}
    >
      <h3 className="text-warning text-center mb-3">
        {existingReview
          ? "Edit Review"
          : reviewType === "service"
          ? `Review Service - ${service?.service_category}`
          : "Review Provider"}
      </h3>

      {/* ⭐ Star Rating */}
      <div className="d-flex justify-content-center mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            style={{
              fontSize: "30px",
              cursor: "pointer",
              color: star <= rating ? "#ffc107" : "#444",
              marginRight: "8px",
            }}
          >
            {star <= rating ? "★" : "☆"}
          </span>
        ))}
      </div>

      {/* ⭐ Comment */}
      <textarea
        className="form-control bg-dark text-white border-warning mb-3"
        rows="3"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your feedback..."
        style={{ borderColor: "#ffc107" }}
      />

      {/* ⭐ Buttons */}
      <div className="text-center">
        <button onClick={handleSubmit} className="btn btn-warning me-2">
          {existingReview ? "Update" : "Submit"}
        </button>

        <button onClick={onClose} className="btn btn-secondary me-2">
          Close
        </button>

        {existingReview && (
          <button onClick={handleDelete} className="btn btn-danger">
            Delete
          </button>
        )}
      </div>
    </Modal>
  );
}

export default ReviewModal;
