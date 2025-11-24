import React, { useState } from "react";

function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [statusMsg, setStatusMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:8000/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg(data.message);
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatusMsg("Something went wrong. Please try again.");
      }

      setTimeout(() => setStatusMsg(""), 4000);
    } catch (error) {
      setStatusMsg("Server error. Please try later.");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        backgroundColor: "#050505ff",
        paddingTop: "80px",
        paddingBottom: "40px",
      }}
    >
      <div
        className="card shadow-lg p-4"
        style={{
          backgroundColor: "#1c1c1c",
          border: "2px solid #ffc107",
          width: "100%",
          maxWidth: "600px",
          borderRadius: "14px",
        }}
      >
        <h2 className="text-center text-warning fw-bold mb-3">Contact Us</h2>
        <p className="text-center text-light mb-4">
          Have questions, suggestions, or need help?  
          We’re here for you — send us a message.
        </p>

        {statusMsg && (
          <div className="alert alert-success text-center py-2">{statusMsg}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-warning">Name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              style={{
                backgroundColor: "#111",
                color: "#ffc107",
                border: "1px solid #ffc107",
              }}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-warning">Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              style={{
                backgroundColor: "#111",
                color: "#ffc107",
                border: "1px solid #ffc107",
              }}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-warning">Message</label>
            <textarea
              name="message"
              className="form-control"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              style={{
                backgroundColor: "#111",
                color: "#ffc107",
                border: "1px solid #ffc107",
              }}
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn w-100"
            style={{
              backgroundColor: "#ffc107",
              color: "#111",
              fontWeight: "bold",
              padding: "12px",
              borderRadius: "10px",
            }}
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

export default ContactPage;
