import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../css/Signup.css";

// Validation regex
const VALIDATIONS = {
  username: /^[a-zA-Z0-9._-]{4,20}$/,
  email: /^[\w\.-]+@[\w\.-]+\.\w+$/,
  phone: /^\d{10}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    phone: "",
    first_name: "",
    last_name: "",
    address: "",
    profile_pic: null,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const { handleSignupSuccess } = useUser();

  const validateField = (name, value) => {
    let error = "";

    if (!value && name !== "profile_pic") {
      error = "This field is required.";
    } else if (name in VALIDATIONS && !VALIDATIONS[name].test(value)) {
      switch (name) {
        case "username":
          error = "4–20 chars, letters, numbers, . _ - only.";
          break;
        case "email":
          error = "Enter a valid email.";
          break;
        case "phone":
          error = "Enter a 10-digit phone number.";
          break;
        case "password":
          error = "8+ chars: 1 uppercase, 1 lowercase, 1 digit, 1 special (@$!%*?&).";
          break;
      }
    } else if (name === "password2" && value !== formData.password) {
      error = "Passwords do not match.";
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const newValue = files ? files[0] : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // Real-time validation
    const error = validateField(name, newValue);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation not supported.");
      return;
    }
    setLocating(true);
    setMessage("Detecting location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setFormData((prev) => ({ ...prev, address: data.display_name || "" }));
          setMessage("Location detected!");
        } catch {
          setMessage("Failed to get address.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setMessage("Location access denied.");
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key !== "profile_pic") {
        const err = validateField(key, formData[key]);
        if (err) newErrors[key] = err;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setMessage("Please fix the errors above.");
      return;
    }

    const form = new FormData();
    Object.entries(formData).forEach(([k, v]) => v !== null && form.append(k, v));

    try {
      const res = await fetch("http://localhost:8000/api/signup/", {
        method: "POST",
        body: form,
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { }

      if (res.ok) {
        setMessage("Signup successful!");
        handleSignupSuccess();
      } else {
        setMessage(data?.error || "Signup failed");
      }
    } catch (err) {
      setMessage("Network error.");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 px-0 bg-black">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-12">
          <div className="card shadow p-4 mt-5 bg-dark">
            <h3 className="text-center mb-4">Create Account</h3>
            <form onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div className="mb-3">
                <input
                  type="text"
                  name="username"
                  className={`form-control ${errors.username ? "is-invalid" : ""}`}
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
                {errors.username && <div className="invalid-feedback">{errors.username}</div>}
              </div>

              {/* Phone */}
              <div className="mb-3">
                <input
                  type="text"
                  name="phone"
                  className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                  placeholder="Phone (10 digits)"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
              </div>

              {/* Email */}
              <div className="mb-3">
                <input
                  type="email"
                  name="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              {/* First / Last Name */}
              <div className="mb-3">
                <input
                  type="text"
                  name="first_name"
                  className="form-control"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  name="last_name"
                  className="form-control"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>

              {/* Address + Detect */}
              <div className="input-group mb-3">
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleDetectLocation}
                  disabled={locating}
                >
                  {locating ? "Detecting..." : "Use My Location"}
                </button>
              </div>

              {/* Password */}
              <div className="mb-3">
                <input
                  type="password"
                  name="password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div className="mb-3">
                <input
                  type="password"
                  name="password2"
                  className={`form-control ${errors.password2 ? "is-invalid" : ""}`}
                  placeholder="Confirm Password"
                  value={formData.password2}
                  onChange={handleChange}
                  required
                />
                {errors.password2 && <div className="invalid-feedback">{errors.password2}</div>}
              </div>

              {/* Profile Pic */}
              <div className="mb-3">
                <input
                  type="file"
                  name="profile_pic"
                  className="form-control"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleChange}
                />
              </div>

              <button className="btn btn-primary w-100" type="submit">
                Signup
              </button>
            </form>
            {message && <p className="text-center mt-3">{message}</p>}
            <div className="text-center mt-4">
              <p>
                Signup as provider {" "}
                <Link to="/provider/register" className="btn btn-link p-0">
                  Click Here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;