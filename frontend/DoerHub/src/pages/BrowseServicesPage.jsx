import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

const API_BASE = "http://localhost:8000/api";

function BrowseServicesPage() {
  const [categories, setCategories] = useState([]); // { value, label, providerCount, providers: [...] }
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeType, setActiveType] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();
  const isMounted = useRef(true);

  // debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // cleanup flag
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // fetch categories and providers
  const fetchCategoriesWithCounts = async (type = "") => {
    setLoading(true);
    setMessage("");
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const url = type
        ? `${API_BASE}/provider/service-categories/?type=${encodeURIComponent(type)}`
        : `${API_BASE}/provider/service-categories/`;

      const catRes = await fetch(url, { signal });
      if (!catRes.ok) throw new Error("Failed to load categories");
      const cats = await catRes.json();

      // cats might be paginated or plain array
      const catList = Array.isArray(cats) ? cats : cats.results || [];

      // for each category, fetch providers and attach them
      const enriched = await Promise.all(
        catList.map(async (cat) => {
          try {
            // providers endpoint — handle paginated or list
            const provRes = await fetch(
              `${API_BASE}/providers/?category=${encodeURIComponent(cat.value)}`,
              { signal }
            );

            if (!provRes.ok) {
              return { ...cat, providerCount: 0, providers: [] };
            }

            const provData = await provRes.json();
            const provList = Array.isArray(provData) ? provData : provData.results || [];

            // Normalize provider objects to have name & location keys (safe fallbacks)
            const providers = provList.map((p) => ({
              id: p.id,
              name: (p.name || p.full_name || p.username || p.user?.username || "").toString(),
              location: (p.location || p.city || p.address || "").toString(),
              raw: p,
            }));

            return {
              ...cat,
              providerCount: providers.length,
              providers,
            };
          } catch (e) {
            // if a single provider fetch fails, continue with zero providers
            console.warn("provider fetch error for", cat.value, e);
            return { ...cat, providerCount: 0, providers: [] };
          }
        })
      );

      if (!isMounted.current) return;
      setCategories(enriched);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setMessage("Warning: Could not load service categories.");
      setCategories([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }

    return () => controller.abort();
  };

  // initial load and when activeType or refreshKey changes
  useEffect(() => {
    fetchCategoriesWithCounts(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, refreshKey]);

  // filter categories using debouncedSearch
  const filteredCategories = categories.filter((cat) => {
    if (!debouncedSearch) return true;

    const q = debouncedSearch;
    // category label match
    if ((cat.label || "").toLowerCase().includes(q)) return true;

    // providers match by name or location
    if (Array.isArray(cat.providers)) {
      for (const p of cat.providers) {
        if ((p.name || "").toLowerCase().includes(q)) return true;
        if ((p.location || "").toLowerCase().includes(q)) return true;
      }
    }

    return false;
  });

  return (
    <div
      style={{
        backgroundColor: "#030303ff",
        color: "#fff",
        minHeight: "100vh",
        padding: "2rem 1rem",
        fontFamily: "'Baloo Paaji 2', cursive",
      }}
    >
      <h2
        className="text-center mb-4"
        style={{ color: "#ffc107", fontSize: "2.2rem", fontWeight: "500" }}
      >
        Browse Services
      </h2>

      {/* Search + Refresh */}
      <div className="d-flex justify-content-center align-items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by provider, category, or location..."
          className="form-control"
          style={{
            maxWidth: 480,
            backgroundColor: "#040404ff",
            color: "#fff",
            border: "1px solid #ffc107",
            padding: "0.6rem 0.8rem",
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh categories"
        >
          <RefreshCw size={14} /> Refresh
        </button> */}
      </div>

      {/* Filter Buttons */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveType("")}
          className={`btn mx-2 ${activeType === "" ? "btn-warning" : "btn-outline-warning"}`}
        >
          All
        </button>

        <button
          onClick={() => setActiveType("immediate")}
          className={`btn mx-2 ${activeType === "immediate" ? "btn-warning" : "btn-outline-warning"}`}
        >
          Immediate
        </button>

        <button
          onClick={() => setActiveType("scheduled")}
          className={`btn mx-2 ${activeType === "scheduled" ? "btn-warning" : "btn-outline-warning"}`}
        >
          Scheduled
        </button>
      </div>

      {message && (
        <div className="text-center text-warning mb-3" style={{ color: "#ffc107" }}>
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-center" style={{ color: "#aaa", fontSize: "1.1rem" }}>
          Loading categories...
        </p>
      ) : (
        <>
          {/* Category Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "2rem",
              justifyContent: "center",
              marginBottom: "3rem",
            }}
          >
            {filteredCategories.length === 0 ? (
              <div className="text-center" style={{ color: "#ccc" }}>
                No categories match your search.
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.value}
                  onClick={() => navigate(`/user/browse-services/${cat.value}`)}
                  className="card draw-border"
                  style={{
                    backgroundColor: "#222831",
                    color: "#fff",
                    padding: "1.2rem",
                    borderRadius: "10px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 50px #ffc107";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
                  }}
                >
                  <h6
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "1.15rem",
                      color: "#ffc107",
                      fontWeight: "500",
                    }}
                  >
                    {cat.label}
                  </h6>

                  <p style={{ margin: 0, fontSize: "0.95rem", color: "#f5f9f9ff" }}>
                    {cat.providerCount ?? (Array.isArray(cat.providers) ? cat.providers.length : 0)}{" "}
                    { (cat.providerCount ?? (Array.isArray(cat.providers) ? cat.providers.length : 0)) === 1 ? "provider" : "providers" }
                  </p>

                  {/* optional small list of matching provider names (if search active) */}
                  {debouncedSearch && Array.isArray(cat.providers) && (
                    <div className="mt-2 text-start" style={{ fontSize: 12, color: "#ddd" }}>
                      {cat.providers
                        .filter((p) => {
                          const q = debouncedSearch;
                          return (
                            (p.name || "").toLowerCase().includes(q) ||
                            (p.location || "").toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 3)
                        .map((p) => (
                          <div key={p.id} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            • {p.name} {p.location ? `— ${p.location}` : ""}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              className="btn draw-border"
              onClick={() => navigate("/user/service-request")}
              style={{
                background: "#ffc107",
                color: "#f4f3f0ff",
                fontWeight: "bold",
                padding: "0.85rem 2.2rem",
                fontSize: "1.1rem",
                letterSpacing: "0.5px",
                border: "2px solid #ffc107",
                borderRadius: "10px",
              }}
            >
              Request Service
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default BrowseServicesPage;
