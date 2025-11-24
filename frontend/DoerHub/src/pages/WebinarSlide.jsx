import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/WebinarSlider.css";

const API_BASE = "http://localhost:8000/api";

function WebinarSlider() {
  const [webinars, setWebinars] = useState([]);
  const navigate = useNavigate();
  const sliderRef = useRef(null);
  const intervalRef = useRef(null);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = API_BASE.replace(/\/api\/?$/, "");
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const isUpcoming = (dateStr) => {
    const webinarDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return webinarDate >= today;
  };

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const res = await fetch(`${API_BASE}/webinars/`);
        if (!res.ok) throw new Error("Failed to load webinars");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        const upcoming = list.filter((w) => w.webinar_date && isUpcoming(w.webinar_date));
        setWebinars(upcoming);
      } catch (err) {
        console.warn("WebinarSlider fetch error:", err);
        setWebinars([]);
      }
    };
    fetchWebinars();
  }, []);

  // Auto-slide logic (3 seconds)
  useEffect(() => {
    if (!webinars.length || !sliderRef.current) return;

    const slider = sliderRef.current;
    let isHovered = false;

    const slideNext = () => {
      if (isHovered) return;
      const slideWidth = slider.querySelector(".webinar-slide")?.offsetWidth || 0;
      const gap = parseFloat(getComputedStyle(slider).gap) || 0;
      const scrollAmount = slideWidth + gap;

      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });

      // Seamless infinite loop
      if (slider.scrollLeft + slider.clientWidth + 10 >= slider.scrollWidth) {
        setTimeout(() => {
          slider.scrollTo({ left: 0, behavior: "instant" });
        }, 500);
      }
    };

    const startAutoSlide = () => {
      intervalRef.current = setInterval(slideNext, 8000);
    };

    const stopAutoSlide = () => {
      clearInterval(intervalRef.current);
    };

    // Mouse events (desktop)
    slider.addEventListener("mouseenter", () => {
      isHovered = true;
      stopAutoSlide();
    });
    slider.addEventListener("mouseleave", () => {
      isHovered = false;
      startAutoSlide();
    });

    // Touch events (mobile)
    slider.addEventListener("touchstart", stopAutoSlide, { passive: true });
    slider.addEventListener("touchend", startAutoSlide);

    // Start auto-sliding
    startAutoSlide();

    return () => {
      stopAutoSlide();
      slider.removeEventListener("mouseenter", () => {});
      slider.removeEventListener("mouseleave", () => {});
      slider.removeEventListener("touchstart", () => {});
      slider.removeEventListener("touchend", () => {});
    };
  }, [webinars]);

  const handleClick = (id) => navigate(`/webinar/${id}`);

  if (!webinars.length) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
        
        {/* Your DoerHub Logo as the beautiful fallback */}
        <img
          src="/images/DoerHub logo.png"   // This works if the file is in public/images/
          alt="DoerHub - No upcoming webinars"
          className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl mb-8 animate-pulse-slow"
        />

        <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          No Upcoming Webinars Right Now
        </h3>
        
        <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
          We're cooking up something amazing for you! 
          <br />
          <span className="text-indigo-600 font-semibold">New webinars are coming soon — stay tuned!</span>
        </p>
      </div>
    );
  }

  return (
    <div className="webinar-slider" ref={sliderRef}>
      {webinars.map((w) => {
        const imgUrl = getImageUrl(w.image || w.webinar_poster || w.poster);

        return (
          <div
            key={w.id}
            onClick={() => handleClick(w.id)}
            className="webinar-slide cursor-pointer group"
          >
            <div className="webinar-image-wrapper">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={w.title || "Webinar"}
                  className="webinar-img"
                  loading="lazy"
                />
              ) : (
                <div className="fallback-title">
                  {w.title || "Webinar"}
                </div>
              )}
              <div className="webinar-overlay">
                <h3 className="webinar-title">{w.title}</h3>
                <p className="webinar-desc">Click to register</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WebinarSlider;