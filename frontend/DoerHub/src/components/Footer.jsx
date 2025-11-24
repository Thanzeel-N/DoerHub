// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";

function Footer() {
  return (
    <footer
      style={{
        color: "#fff",
        padding: "3rem 1.5rem 1.5rem",
        marginTop: "auto",
        borderTop: "1px solid #f4fc07ff",
        fontFamily: "'Baloo Paaji 2', cursive",
      }}
      className='bg-black '
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* === Top Grid – 3 Columns === */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          {/* ---- Column 1: Brand ---- */}
          <div>
            <h3
              style={{
                fontSize: "2rem",
                color: "#ffc107",           // Yellow heading
                marginBottom: "0.5rem",
              }}
            >
              DoerHub
            </h3>
            <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "#ddd" }}>
              Kerala’s #1 platform connecting skilled doers with people who need them.
            </p>
          </div>

          {/* ---- Column 2: Quick Links ---- */}
          <div>
            <h4 style={{ color: "#ffc107", marginBottom: "1rem" }}>Quick Links</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: "2.1" }}>
              {[
                { to: "/about", label: "About Us" },
                { to: "/contact", label: "Contact" },
                { to: "/reviews", label: "Reviews" },
                { to: "/privacy", label: "Privacy Policy" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    style={{
                      color: "#fff",
                      textDecoration: "none",
                      transition: "color 0.25s",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#ffc107")}
                    onMouseLeave={(e) => (e.target.style.color = "#fff")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- Column 3: Contact Info ---- */}
          <div>
            <h4 style={{ color: "#ffc107", marginBottom: "1rem" }}>Get in Touch</h4>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.6rem", gap: "0.6rem" }}>
              <FaMapMarkerAlt style={{ color: "#ffc107" }} />
              <span>Malappuram, Kerala, India</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.6rem", gap: "0.6rem" }}>
              <FaPhone style={{ color: "#ffc107" }} />
              <span>+91 98765 43210</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FaEnvelope style={{ color: "#ffc107" }} />
              <span>support@doerhub.in</span>
            </div>
          </div>
        </div>

        {/* === Social Icons (reuse your existing animation) === */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <ul
                className="social-icons"
                style={{
                display: "inline-flex",
                justifyContent: "center",
                listStyle: "none",   // removes bullets/dots
                padding: 0,
                margin: 0,
                gap: "1rem",         // uniform spacing (fallback for older browsers)
                }}
            >
                <li style={{ margin: 0 }}>
                <a href="#" aria-label="Facebook"><FaFacebookF /></a>
                </li>
                <li style={{ margin: 0 }}>
                <a href="#" aria-label="Twitter"><FaTwitter /></a>
                </li>
                <li style={{ margin: 0 }}>
                <a href="#" aria-label="LinkedIn"><FaLinkedinIn /></a>
                </li>
                <li style={{ margin: 0 }}>
                <a href="#" aria-label="Instagram"><FaInstagram /></a>
                </li>
            </ul>
        </div>

        {/* === Bottom Copyright === */}
        <div
          style={{
            borderTop: "1px solid #333",
            paddingTop: "1rem",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "#aaa",
          }}
        >
          © {new Date().getFullYear()} DoerHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;