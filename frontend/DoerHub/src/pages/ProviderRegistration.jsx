import React, { useState, useEffect } from "react";
import { useNavigate,Link } from "react-router-dom";
import "../css/ProviderRegistration.css";

function ProviderRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    location: "",
    location_lat: "",
    location_lon: "",
    phone: "",
    email: "",
    service_category: "",
    aadhaar_number: "",
    experience: "",
    aadhaar_document: null,
    documents: null,
    password: "",
    confirm_password: "",
    verified: false,
    availability: true,
    rejection_reason: "",
    email_verified: false,
  });

  const [categories, setCategories] = useState([]);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); // ✅ added error state

  // Fetch service categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/provider/service-categories/");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setMessage("⚠️ Unable to load service categories.");
      }
    };
    fetchCategories();
  }, []);

  // Geocode location
  const geocodeLocation = async (location) => {
    if (!location) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          location_lat: data[0].lat,
          location_lon: data[0].lon,
        }));
        setMessage("✅ Location geocoded successfully.");
      } else {
        setMessage("⚠️ Unable to geocode location.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setMessage("⚠️ Error geocoding location.");
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));

    if (name === "location") geocodeLocation(value);
  };

  // ✅ Validation function
  const validateForm = () => {
    const newErrors = {};

    // Username: only letters and spaces, min 3 chars
    if (!/^[A-Za-z\s]{3,}$/.test(formData.username))
      newErrors.username = "Name must have at least 3 letters and contain only alphabets.";

    // Email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email address.";

    // Phone number: 10 digits only
    if (!/^[0-9]{10}$/.test(formData.phone))
      newErrors.phone = "Phone number must be exactly 10 digits.";

    // Password strength
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        formData.password
      )
    )
      newErrors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

    // Confirm password match
    if (formData.password !== formData.confirm_password)
      newErrors.confirm_password = "Passwords do not match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!formData.email) {
      setMessage("Please enter your email first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:8000/api/provider/email-otp/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setMessage("✅ OTP sent to your email.");
      } else {
        setMessage(data.error || "Failed to send OTP.");
      }
    } catch (error) {
      console.error("OTP Error:", error);
      setMessage("Server error while sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp) {
      setMessage("Please enter the OTP sent to your email.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:8000/api/provider/verify-email-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailVerified(true);
        setFormData((prev) => ({ ...prev, email_verified: true }));
        setMessage("🎉 Email verified successfully!");
      } else {
        setMessage(data.error || "Invalid or expired OTP.");
      }
    } catch (error) {
      console.error("Verify OTP Error:", error);
      setMessage("Error verifying OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return; // ✅ run validation first

    if (!emailVerified) {
      setMessage("Please verify your email first.");
      return;
    }

    if (!formData.location_lat || !formData.location_lon) {
      setMessage("Please provide a valid location with geolocation data.");
      return;
    }

    setLoading(true);
    setMessage("");

    const form = new FormData();
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (value !== null && key !== "confirm_password") form.append(key, value);
    });

    try {
      const res = await fetch("http://localhost:8000/api/provider/register/", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Registration successful! Await admin approval.");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(data.error || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration Error:", error);
      setMessage("Error submitting registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 px-0 bg-black">
      <div className="provider-signup-card bg-dark mb-5 mt-5 p-4 rounded shadow">
        <h2>Register as a Service Provider</h2>
        <p className="subtitle">Join DoerHub and start offering your services today</p>

        {message && (
          <div
            className={
              message.includes("✅") || message.includes("🎉")
                ? "success-message"
                : "error-message"
            }
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Username */}
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="username" onChange={handleChange} required />
            {errors.username && <small className="error-text">{errors.username}</small>}
          </div>

          {/* Bio */}
          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              rows="3"
              placeholder="Tell us about your experience..."
              onChange={handleChange}
              required
            ></textarea>
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>
            <input type="text" name="location" onChange={handleChange} required />
          </div>

          <input type="hidden" name="location_lat" value={formData.location_lat} />
          <input type="hidden" name="location_lon" value={formData.location_lon} />

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              onChange={handleChange}
              disabled={emailVerified}
              required
            />
            {errors.email && <small className="error-text">{errors.email}</small>}
          </div>

          {/* OTP Section */}
          <div className="otp-section">
            {!otpSent ? (
              <button type="button" className="otp-btn" onClick={handleSendOTP} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            ) : !emailVerified ? (
              <div className="otp-input">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  className="otp-btn"
                  onClick={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            ) : (
              <span className="success-message">✅ Email Verified</span>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" name="phone" onChange={handleChange} required />
            {errors.phone && <small className="error-text">{errors.phone}</small>}
          </div>

          {/* Experience */}
          <div className="form-group">
            <label>Experience (Years)</label>
            <input type="number" name="experience" onChange={handleChange} required />
          </div>

          {/* Service Category */}
          <div className="form-group">
            <label>Service Category</label>
            <select name="service_category" onChange={handleChange} required>
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aadhaar */}
          <div className="form-group">
            <label>Aadhaar Number</label>
            <input type="text" name="aadhaar_number" onChange={handleChange} required />
          </div>

          {/* Aadhaar Document */}
          <div className="form-group">
            <label>Aadhaar Document</label>
            <input type="file" name="aadhaar_document" onChange={handleChange} required />
          </div>

          {/* Additional Documents */}
          <div className="form-group">
            <label>Additional Documents</label>
            <input type="file" name="documents" onChange={handleChange} />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" onChange={handleChange} required />
            {errors.password && <small className="error-text">{errors.password}</small>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" name="confirm_password" onChange={handleChange} required />
            {errors.confirm_password && (
              <small className="error-text">{errors.confirm_password}</small>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={!emailVerified || loading}>
            {loading ? "Submitting..." : "Register"}
          </button>
        </form>
        <div className="text-center mt-4">
              <p>
                Signup as User {" "}
                <Link to="/signup" className="btn btn-link p-0">
                  Click Here
                </Link>
              </p>
            </div>
      </div>
    </div>
  );
}

export default ProviderRegistration;
