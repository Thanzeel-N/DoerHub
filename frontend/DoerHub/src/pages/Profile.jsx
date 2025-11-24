import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { MessageSquare, ClipboardList, Video,RefreshCw } from "lucide-react";
import "../css/Profile.css";

const API_BASE = "http://localhost:8000/api";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = API_BASE.replace(/\/api\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

function Profile() {
  const { handleLogout } = useUser();

  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState(null);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access");
  const storedUserId = localStorage.getItem("user_id");

  // Which tab is open?
  const [activeTab, setActiveTab] = useState("none");

  // Data states
  const [userReviews, setUserReviews] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [userWebinars, setUserWebinars] = useState([]);

  // Loading + Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  //----------------------------------------------------------------
  // Fetch Profile
  //----------------------------------------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) {
          setProfile(data);
          setUpdatedProfile(data);
          if (data.profile_pic) setPreviewPic(getImageUrl(data.profile_pic));
        } else {
          setMessage(data.detail || "Failed to load profile");
        }
      } catch {
        setMessage("Error loading profile");
      }
    };

    fetchProfile();
  }, [token]);

  //----------------------------------------------------------------
  // Fetch Reviews
  //----------------------------------------------------------------
  const loadReviews = async () => {
    setLoading(true);
    setError("");
    try {
      const uid = storedUserId || profile?.id;
      const res = await fetch(`${API_BASE}/review/user/${uid}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setUserReviews(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Failed to load reviews");
    }
    setLoading(false);
  };

  //----------------------------------------------------------------
  // Fetch Requests
  //----------------------------------------------------------------
  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/service-requests/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setUserRequests(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Unable to load requests");
    }
    setLoading(false);
  };

  //----------------------------------------------------------------
  // Fetch Webinars
  //----------------------------------------------------------------
  const loadWebinars = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/webinars/registered/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setUserWebinars(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Webinars could not be loaded");
    }
    setLoading(false);
  };

  //----------------------------------------------------------------
  // Handle Tab Switching
  //----------------------------------------------------------------
  const openTab = (tab) => {
    setActiveTab(tab);
    if (tab === "reviews") loadReviews();
    if (tab === "requests") loadRequests();
    if (tab === "webinars") loadWebinars();
  };

  //----------------------------------------------------------------
  // Save Profile Updates
  //----------------------------------------------------------------
  const handleSave = async () => {
    const formData = new FormData();
    formData.append("phone", updatedProfile.phone || "");
    formData.append("address", updatedProfile.address || "");
    if (profilePic) formData.append("profile_pic", profilePic);

    try {
      const res = await fetch(`${API_BASE}/profile/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setProfile(data.profile || data);
        setUpdatedProfile(data.profile || data);
        setMessage("Profile updated!");
        setEditMode(false);
      } else {
        setMessage(data.detail || "Update failed");
      }
    } catch {
      setMessage("Server error updating profile");
    }
  };

  if (!profile) return <p className="text-light">Loading…</p>;

  return (
    <div className="text-light bg-black  p-4 justify-content-center">

     {/* ---------------- PROFILE CARD ---------------- */}
      <div className="grid w-75 bg-black border-warning p-4">

        <h3 className="text-warning text-left mb-3">
          Welcome, {profile.username}
        </h3>

        <div className="row align-items-center">

          {/* ------- LEFT: PROFILE IMAGE ------- */}
          <div className="col-md-4 text-center mb-5 mt-5">
            <img
              src={previewPic || "/Default-profile.jpg"}
              alt="Profile"
              style={{
                width: 220,
                height: 220,
                borderRadius: "10%",
                border: "2px solid #ffc107",
                objectFit: "cover",
              }}
            />
          </div>

          {/* ------- RIGHT: PROFILE INPUTS ------- */}
          <div className="col-md-8">

            {/* Email */}
            <div className="mb-3 text-warning">
              <label>Email</label>
              <input
                className="form-control bg-black text-light"
                name="email"
                value={profile.email}
                disabled
              />
            </div>

            {/* Phone */}
            <div className="mb-3 text-warning">
              <label>Phone</label>
              <input
                className="form-control bg-black text-light"
                name="phone"
                value={updatedProfile.phone || ""}
                disabled={!editMode}
                onChange={(e) =>
                  setUpdatedProfile({ ...updatedProfile, phone: e.target.value })
                }
              />
            </div>

            {/* Address */}
            <div className="mb-3 text-warning">
              <label>Address</label>
              <input
                className="form-control bg-black text-light "
                name="address"
                value={updatedProfile.address || ""}
                disabled={!editMode}
                onChange={(e) =>
                  setUpdatedProfile({ ...updatedProfile, address: e.target.value })
                }
              />
            </div>

            {/* Profile Picture Upload */}
            {editMode && (
              <input
                type="file"
                className="form-control mb-2"
                onChange={(e) => {
                  setProfilePic(e.target.files[0]);
                  setPreviewPic(URL.createObjectURL(e.target.files[0]));
                }}
              />
            )}

            {/* Buttons */}
            <div className="d-flex gap-2 justify-content-center">

              {editMode ? (
                <>
                  <button className="btn btn-primary w-50" onClick={handleSave}>
                    Save
                  </button>

                  <button
                    className="btn btn-black text-warning border-warning w-50"
                    onClick={() => {
                      setUpdatedProfile(profile); // reset changes
                      setEditMode(false);
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-secondary w-50"
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </button>
              )}

            </div>


          </div>
        </div>
      </div>

      {/* ---------------- TAB BUTTONS ---------------- */}
      <div className="d-flex gap-3 mt-4 justify-content-center flex-wrap">
        <button
          className={`btn ${
            activeTab === "reviews" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("reviews")}
        >
          <MessageSquare size={16} /> Reviews
        </button>

        <button
          className={`btn ${
            activeTab === "requests" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("requests")}
        >
          <ClipboardList size={16} /> Requests
        </button>

        <button
          className={`btn ${
            activeTab === "webinars" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("webinars")}
        >
          <Video size={16} /> Webinars
        </button>

        {activeTab !== "none" && (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => {
              if (activeTab === "reviews") loadReviews();
              if (activeTab === "requests") loadRequests();
              if (activeTab === "webinars") loadWebinars();
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        )}
      </div>


      {/* ---------------- TAB CONTENT ---------------- */}
      <div className="grid bg-black border-warning p-3 mt-3" style={{ maxHeight: 450, overflowY: "auto" }}>
        {loading && (
          <div className="text-center">
            <div className="spinner-border text-warning"></div>
          </div>
        )}

        {error && <div className="text-danger">{error}</div>}

        {/* Reviews Panel */}
        {activeTab === "reviews" &&
          !loading &&
          userReviews.map((rev) => (
            <div key={rev.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">{rev.provider_name}</span>
                <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
              </div>
              <div className="text-light">{rev.comment}</div>
              <div className="text-secondary small">
                {new Date(rev.created_at).toLocaleString()}
              </div>
            </div>
          ))}

        {/* Requests Panel */}
        {activeTab === "requests" &&
          !loading &&
          userRequests.map((req) => (
            <div key={req.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">{req.service_category_name}</span>
                <span className="text-secondary">{req.status}</span>
              </div>
              <div className="text-light">{req.notes || "No notes"}</div>
              <div className="text-secondary small">
                {new Date(req.created_at).toLocaleString()}
              </div>
            </div>
          ))}

        {/* Webinars Panel */}
        {activeTab === "webinars" &&
          !loading &&
          userWebinars.map((wb) => (
            <div key={wb.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">{wb.title}</span>
                <span className="text-secondary">
                  {new Date(wb.webinar_date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-light">{wb.description}</div>
              <div className="text-secondary small">
                Hosted by: {wb.provider || wb.host||'DoerHub service_Provider'}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Profile;
