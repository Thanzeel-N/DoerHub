import React, { useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTools,
  FaBook,
  FaDollarSign,
  FaShieldAlt,
  FaUsers,
  FaStar,
  FaClock,
  FaEnvelope,
  FaVideo,
} from "react-icons/fa";
import "animate.css";

const IndexPage = () => {
  const navigate = useNavigate();
  const [latestReviews, setLatestReviews] = useState([]);

  const API_BASE = "http://localhost:8000/api";

  // ================== FETCH LATEST REVIEWS ==================
    const fetchLatestReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/review/latest/`);
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
  }, []);

  // SCROLL ANIMATION HANDLER
  useEffect(() => {
    const cards = document.querySelectorAll(".animate-card");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    cards.forEach((card) => observer.observe(card));
  }, []);

  return (
    <div className="bg-black text-light">
      {/* ====== CARD ANIMATION CSS ====== */}
      <style>{`
        @keyframes cardFadeInUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-card {
          opacity: 0;
          transition: 0.4s ease-out;
        }

        .animate-card.visible {
          animation: cardFadeInUp 0.6s ease-out forwards;
        }

        /* Stagger */
        .animate-card:nth-child(1) { animation-delay: 0.1s; }
        .animate-card:nth-child(2) { animation-delay: 0.2s; }
        .animate-card:nth-child(3) { animation-delay: 0.3s; }
        .animate-card:nth-child(4) { animation-delay: 0.4s; }
        .animate-card:nth-child(5) { animation-delay: 0.5s; }
        .animate-card:nth-child(6) { animation-delay: 0.6s; }

        /* Hover effect */
        .animate-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 15px 30px rgba(255, 193, 7, 0.3) !important;
        }
      `}</style>

      {/* ===== HERO SECTION ===== */}
      <section className="d-flex flex-column flex-md-row align-items-center justify-content-center text-center text-md-start px-4 px-md-5 vh-100"
        style={{ background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)" }}>
        
        <div className="col-md-6 animate__animated animate__fadeInLeft">
          <h1 className="fw-bold display-4 mb-3 text-light">
            Welcome to <span className="text-warning">DoerHub</span>
          </h1>
          <p className="lead text-secondary mb-4">
            Book trusted services, learn real-world skills, and empower your community.
          </p>

          <div>
            <button className="btn btn-warning fw-bold rounded-pill px-4 py-2 me-3"
              onClick={() => navigate("/login")}>
              Login
            </button>

            <button className="btn btn-outline-light fw-bold rounded-pill px-4 py-2"
              onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </div>
        </div>

        <div className="col-md-6 mt-5 mt-md-0 animate__animated animate__fadeInRight">
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-5 text-center bg-black mt-4 mb-4">
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

      {/* ===== WHY CHOOSE US ===== */}
      <section className="py-5" style={{
        background: "linear-gradient(135deg, #ffc107 0%, #ffcc33 100%)",
        color: "#000",
      }}>
        <h2 className="fw-bold text-black text-center">Why Choose DoerHub?</h2>
        <br />

        <div className="row g-4 justify-content-center bg-warning">
          {[
            { icon: <FaTools size={40} />, title: "Wide Service Range", desc: "50+ service categories." },
            { icon: <FaShieldAlt size={40} />, title: "Verified Professionals", desc: "Work with trusted people." },
            { icon: <FaUsers size={40} />, title: "Community Driven", desc: "People helping people." },
          ].map((item, index) => (
            <div className="col-md-4 animate-card" key={index}>
              <div className="p-4 rounded-4 shadow-lg h-100"
                style={{ background: "#000", color: "#fff", border: "2px solid #ffc107" }}>
                <div className="mb-3 text-warning">{item.icon}</div>
                <h5>{item.title}</h5>
                <p className="text-secondary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-5 bg-black text-center">
        <h2 className="fw-bold mb-5 text-warning">What You Can Do</h2>
        <div className="row g-4">
          {[
            { icon: <FaTools size={50} className="text-warning" />, title: "Book Services", desc: "Find reliable providers." },
            { icon: <FaBook size={50} className="text-warning" />, title: "Learn Skills", desc: "Train with experts." },
            { icon: <FaClock size={50} className="text-warning" />, title: "Emergency Help", desc: "Instant help when needed." },
            { icon: <FaDollarSign size={50} className="text-warning" />, title: "Transparent Pricing", desc: "Clear & fair costs." },
            { icon: <FaEnvelope size={50} className="text-warning" />, title: "Offline Booking", desc: "Works even with low network." },
            { icon: <FaVideo size={50} className="text-warning" />, title: "Live Workshops", desc: "Learn from community!" },
          ].map((item, i) => (
            <div className="col-md-4 animate-card" key={i}>
              <div className="p-4 rounded-4 h-100 shadow-sm"
                style={{ background: "#1a1a1a", color: "#fff" }}>
                {item.icon}
                <h5 className="mt-3">{item.title}</h5>
                <p className="text-secondary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-5 text-center"
        style={{ background: "linear-gradient(135deg, #ffcc00 0%, #ffb300 100%)", color: "#000" }}>
        
        <h2 className="fw-bold mb-4 text-black">What Our Users Say</h2>

        {/* Latest Reviews */}
        <div className="mt-5">
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
            {latestReviews.length === 0 ? (
              <p className="text-secondary text-center">No reviews yet.</p>
            ) : (
              latestReviews.map((rev) => (
                <div key={rev.id} className="col">
                  <div className="card bg-blak text-light border-warning p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>{rev.username || "DoerHub User"}</strong>
                      <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
                    </div>
                    <p className="small text-light">
                      {rev.comment || "No comment provided."}
                    </p>
                    <small className="text-light">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndexPage;
