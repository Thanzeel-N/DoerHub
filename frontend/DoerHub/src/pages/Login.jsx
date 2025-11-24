import React, { useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const API_BASE = "http://localhost:8000/api";

function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const { handleLoginSuccess } = useUser();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      // Save tokens
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // Save user basics
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("is_provider", data.user.is_provider);

      // Save provider_id if provider
      if (data.user.is_provider && data.user.provider_id) {
        localStorage.setItem("provider_id", data.user.provider_id);
      } else {
        localStorage.removeItem("provider_id");
      }

      // Update global context
      handleLoginSuccess(data.user);

      window.dispatchEvent(new Event("auth-change"));
      // Redirect automatically
      if (data.user.is_provider) {
        navigate("/provider/dashboard");
      } else {
        navigate("/user/dashboard");
      }

    } catch (err) {
      setError("Server error. Try again later.");
    }
  };
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 px-0 bg-black">

      <div className="card p-4 shadow">
        <h3 className="text-center mb-4">Login</h3>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            name="username"
            className="form-control mb-3"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            className="form-control mb-3"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button className="btn btn-primary w-100" type="submit">
            Login
          </button>
        </form>

        {error && <p className="text-danger text-center mt-3">{error}</p>}

        <div className="text-center mt-4">
            <p>
              Don’t have an account?{" "}
              <Link to="/signup" className="btn btn-link p-0">
                Signup as User
              </Link>{" "}
              |{" "}
              <Link to="/provider/register" className="btn btn-link p-0">
                Signup as Provider
              </Link>
            </p>
          </div>
      </div>
    </div>
  );
}

export default Login;
