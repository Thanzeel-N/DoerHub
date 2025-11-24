import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ProvidersByCategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/providers/?category=${categoryId}`);
        if (!res.ok) throw new Error("Failed to fetch providers");
        const data = await res.json();
        setProviders(data);
        setMessage(data.length ? "" : "No providers available in this category.");
      } catch (err) {
        console.error(err);
        setMessage("⚠️ Error fetching providers.");
      } finally {
        setLoading(false);
      }
    };

    const fetchCategoryName = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/provider/service-categories/");
        const data = await res.json();
        const category = data.find((c) => c.value.toString() === categoryId.toString());
        if (category) setCategoryName(category.label);
      } catch (err) {
        console.error("Error fetching category name");
      }
    };

    fetchCategoryName();
    fetchProviders();
  }, [categoryId]);

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "80px",
          fontFamily: "'Space Mono', monospace",
          color: "white",
          background: "#000",
          height: "100vh",
          paddingTop: "100px",
        }}
      >
        <div className="spinner-border text-warning"></div>
        <p>Loading providers...</p>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "#000",
        fontFamily: "'Space Mono', monospace",
        color: "white",
      }}
    >
      {/* INTERNAL CSS */}
      <style>
        {`
          .retro-btn {
            padding: 8px 20px;
            background: #111;
            color: #ffe600;
            border: 3px solid #ffe600;
            box-shadow: 4px 4px 0 #ffe600;
            font-family: 'Space Mono', monospace;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .retro-btn:hover {
            background: #111;
            color: #ffe600;
            border: 3px solid #ffe600;
            box-shadow: none;
          }

          .provider-card {
            width: 320px;
            background: #111;
            border: 4px solid #ffe600;
            box-shadow: 4px 4px 0 #ffe600;
            margin: 20px auto;
            padding: 20px;
            text-align: center;
            transition: 0.2s;
            cursor: pointer;
            color: white;
          }

          .provider-card:hover {
            transform: translateY(-5px);
          }

          .provider-img-box {
            width: 100px;
            height: 100px;
            background: #000;
            border: 4px solid #ffe600;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .provider-img {
            width: 90px;
            height: 90px;
            object-fit: cover;
            border: 2px solid #ffe600;
          }

          .info-box {
            font-size: 14px;
            color: #fff;
            border: 2px dashed #ffe600;
            background:#222;
            padding: 10px;
            margin-top: 10px;
          }

          .retro-title {
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            color: #ffe600;
          }
        `}
      </style>

      <button className="retro-btn" onClick={() => navigate(-1)}>
        ⬅ 
      </button>

      <h3 className="retro-title">
        Providers in <span style={{ color: "#ffe600" }}>{categoryName}</span>
      </h3>

      {message && <p style={{ textAlign: "center", color: "white" }}>{message}</p>}

      <div className="row">
        {providers.map((p) => (
          <div key={p.id} className="provider-card" onClick={() => navigate(`/provider/${p.id}`)}>
            <div className="provider-img-box">
              <img
                src={p.profile_picture || "/default-profile.png"}
                alt={p.username}
                className="provider-img"
              />
            </div>

            <h5 style={{ marginTop: "20px", fontSize: "20px", color: "#ffe600" }}>{p.username}</h5>
            {/* <p className="info-box">{p.category_name}</p> */}
            <p className="info-box">{p.experience} years experience</p>
            <p className="info-box">{p.location}</p>

            <p style={{ marginTop: "10px", fontSize: "14px" }}>
              {p.is_online ? (
                <span style={{ color: "yellow" }}>🟢 Online</span>
              ) : (
                <span style={{ color: "#777" }}>⚫ Offline</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProvidersByCategoryPage;
