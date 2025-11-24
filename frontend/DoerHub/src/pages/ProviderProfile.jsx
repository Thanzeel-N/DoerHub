// import React, { useState, useEffect } from "react";
// import { Phone, Wrench, FileText, CheckCircle2, XCircle, Edit3, Save, LogOut } from "lucide-react";
// import "../css/ProviderProfile.css";

// const API_BASE = "http://localhost:8000/api";

// const getImageUrl = (path) => {
//   if (!path) return null;
//   if (path.startsWith("http")) return path;
//   const base = API_BASE.replace(/\/api\/?$/, "");
//   return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
// };


// function ProviderProfile() {
//   const [provider, setProvider] = useState(null);
//   const [editMode, setEditMode] = useState(false);
//   const [updatedProfile, setUpdatedProfile] = useState({});
//   const [profilePic, setProfilePic] = useState(null);
//   const [previewPic, setPreviewPic] = useState(null);
//   const [message, setMessage] = useState("");
//   const [reviews, setReviews] = useState([]);
//   const token = localStorage.getItem("access");
//   const id = localStorage.getItem("provider_id");

//   // Fetch provider profile
//   useEffect(() => {
//     const fetchProvider = async () => {
//       try {
//         const res = await fetch("http://localhost:8000/api/provider/profile/", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const contentType = res.headers.get("content-type");
//         let data;
//         if (contentType && contentType.includes("application/json")) {
//           data = await res.json();
//         } else {
//           const text = await res.text();
//           console.error("Unexpected non-JSON response:", text);
//           setMessage("Failed to load provider profile. See console for details.");
//           return;
//         }

//         if (res.ok) {
//           setProvider(data);
//           setUpdatedProfile(data);
//         if (data.profile_picture)
//           setPreviewPic(getImageUrl(data.profile_picture));
//         } else {
//           setMessage(data.detail || "Failed to load provider profile");
//         }
//       } catch (err) {
//         console.error(err);
//         setMessage("⚠️ Could not load provider profile.");
//       }
//     };

//     fetchProvider();
//   }, [token]);

//   // Handle input changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setUpdatedProfile({ ...updatedProfile, [name]: value });
//   };

//   // Handle profile picture upload
//   const handlePicChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setProfilePic(file);
//       setPreviewPic(URL.createObjectURL(file));
//     }
//   };

//   //Review
//   const fetchReviews = async () => {
//     try {
//       const res = await fetch(`http://localhost:8000/api/review/provider/${id}/`);
//       const data = await res.json();
//       setReviews(data);
//     } catch (err) {
//       console.error("Failed to load reviews");
//     }
//   };

//   useEffect(() => {
//     fetchReviews();
//   }, [id]);

//   // Save changes
//   const handleSave = async () => {
//     const formData = new FormData();
//     if (updatedProfile.phone) formData.append("phone", updatedProfile.phone);
//     if (updatedProfile.bio) formData.append("bio", updatedProfile.bio);
//     if (profilePic) formData.append("profile_picture", profilePic);

//     try {
//       const res = await fetch("http://localhost:8000/api/provider/profile/", {
//         method: "PATCH",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       });

//       const contentType = res.headers.get("content-type");
//       let data;
//       if (contentType && contentType.includes("application/json")) {
//         data = await res.json();
//       } else {
//         const text = await res.text();
//         console.error("Unexpected non-JSON response:", text);
//         setMessage("Unexpected server response. See console.");
//         return;
//       }

//       if (res.ok) {
//         setProvider(data);
//         setUpdatedProfile(data);
//         if (data.profile_picture)
//           setPreviewPic(`http://localhost:8000${data.profile_picture}`);
//         setMessage("✅ Profile updated successfully!");
//         setEditMode(false);
//       } else {
//         setMessage(data.detail || "Failed to update profile");
//       }
//     } catch (err) {
//       console.error(err);
//       setMessage("⚠️ Server error while updating profile");
//     }
//   };

//   if (!provider)
//     return (
//       <div className="text-center text-light ">
//         <div className="spinner-border text-warning"></div>
//         <p>Loading provider profile...</p>
//       </div>
//     );

//   return (
//     <><div className="p-4 bg-black d-flex">

//       <div className="provider-profile-card card shadow-lg p-4 bg-gray-400 text-light border-warning mt-5">

//         <div className="row">

//           {/* LEFT SIDE – PROFILE IMAGE */}
//           <div className="col-md-4 text-center profile-left">
//             <h4 className="text-warning mb-3">{provider.username}</h4>

//             <img
//               src={previewPic || "/Default_profile.jpg"}
//               alt="Profile"
//               className="profile-image" />

//             <p className="text-light mt-2">{provider.email}</p>

//             <p
//               className={`fw-semibold ${provider.verified ? "text-success" : "text-danger"}`}
//             >
//               {provider.verified ? (
//                 <>
//                   <CheckCircle2 size={16} /> Verified Provider
//                 </>
//               ) : (
//                 <>
//                   <XCircle size={16} /> Not Verified
//                 </>
//               )}
//             </p>

//             {editMode && (
//               <div className="mt-3 w-100">
//                 <label className="text-warning fw-bold">Change Picture</label>
//                 <input
//                   type="file"
//                   onChange={handlePicChange}
//                   className="form-control bg-dark text-light border-warning" />
//               </div>
//             )}
//           </div>

//           {/* RIGHT SIDE – DETAILS */}
//           <div className="col-md-8 ps-md-4 mt-4 mt-md-0">

//             <h4 className="text-warning mb-3 text-center text-md-start">
//               Profile Details
//             </h4>

//             {/* Phone */}
//             <div className="mb-3">
//               <label className="text-warning fw-bold"><Phone size={16} /> Phone:</label>
//               <input
//                 name="phone"
//                 type="text"
//                 className="form-control bg-dark text-light border-warning"
//                 value={updatedProfile.phone || ""}
//                 onChange={handleChange}
//                 disabled={!editMode} />
//             </div>

//             {/* Bio */}
//             <div className="mb-3">
//               <label className="text-warning fw-bold"><FileText size={16} /> Bio:</label>
//               <textarea
//                 name="bio"
//                 rows="3"
//                 className="form-control bg-dark text-light border-warning"
//                 value={updatedProfile.bio || ""}
//                 onChange={handleChange}
//                 disabled={!editMode}
//               ></textarea>
//             </div>

//             {/* Category */}
//             <div className="mb-3">
//               <label className="text-warning fw-bold"><Wrench size={16} /> Service Category:</label>
//               <p className="text-light ms-1">{provider.service_category_name || "Not assigned"}</p>
//             </div>

//             {/* Experience */}
//             <div className="mb-3">
//               <label className="text-warning fw-bold">Experience:</label>
//               <p className="text-light ms-1">{provider.experience || 0} years</p>
//             </div>

//             {/* Documents */}
//             <div className="mb-3">
//               <label className="text-warning fw-bold">Documents:</label>
//               <p className="ms-1">
//                 {provider.documents ? (
//                   <a
//                     href={`http://localhost:8000${provider.documents}`}
//                     target="_blank"
//                     rel="noreferrer"
//                     className="text-warning"
//                   >
//                     View Uploaded Document
//                   </a>
//                 ) : (
//                   "No document uploaded"
//                 )}
//               </p>
//             </div>

//             {/* BUTTONS */}
//             <div className="d-flex flex-column flex-md-row gap-2 mt-4">
//               {editMode ? (
//                 <>
//                   <button className="btn btn-warning w-100 text-black fw-bold" onClick={handleSave}>
//                     <Save size={18} className="me-1" /> Save
//                   </button>

//                   <button
//                     className="btn btn-secondary w-100"
//                     onClick={() => {
//                       setEditMode(false);
//                       setUpdatedProfile(provider);
//                       setPreviewPic(getImageUrl(provider.profile_picture));
//                     } }
//                   >
//                     Cancel
//                   </button>
//                 </>
//               ) : (
//                 <button
//                   className="btn btn-outline-warning w-100"
//                   onClick={() => setEditMode(true)}
//                 >
//                   <Edit3 size={18} className="me-1" /> Edit Profile
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {message && (
//         <p className="text-center text-warning mt-3">{message}</p>
//       )}
//     </div>
//     <div className="bg-black d-cover p-5">
//         <h3 className="text-warning text-center mb-3">⭐ Customer Reviews</h3>

//         {reviews.length === 0 ? (
//           <p className="text-secondary text-center">No reviews yet.</p>
//         ) : (
//           <div className="list-group">
//             {reviews.map((rev) => (
//               <div
//                 key={rev.id}
//                 className="list-group-item bg-dark text-light border-warning mb-2 rounded"
//               >
//                 <div className="d-flex justify-content-between">
//                   <strong>{rev.username}</strong>
//                   <span className="text-warning">{'⭐'.repeat(rev.rating)}</span>
//                 </div>

//                 <p className="small text-light mb-1">{rev.comment || "No comment"}</p>

//                 <span className="text-secondary small">
//                   {rev.created_at ? new Date(rev.created_at).toLocaleDateString():" "}
//                 </span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div></>
//   );

// }

// export default ProviderProfile;


import React, { useState, useEffect } from "react";
import {
  Phone,
  Wrench,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
} from "lucide-react";
import "../css/ProviderProfile.css";

const API_BASE = "http://localhost:8000/api";

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = API_BASE.replace(/\/api\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

function ProviderProfile() {
  const [provider, setProvider] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState(null);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access");
  const id = localStorage.getItem("provider_id");

  // ---------------- TAB STATES ---------------- //
  const [activeTab, setActiveTab] = useState("none");

  const [providerReviews, setProviderReviews] = useState([]);
  const [providerRequests, setProviderRequests] = useState([]);
  const [providerWebinars, setProviderWebinars] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------- FETCH PROVIDER PROFILE ---------------- //
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`${API_BASE}/provider/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) {
          setProvider(data);
          setUpdatedProfile(data);
          if (data.profile_picture)
            setPreviewPic(getImageUrl(data.profile_picture));
        } else {
          setMessage(data.detail || "Failed to load provider profile");
        }
      } catch (err) {
        console.error(err);
        setMessage("Could not load provider profile.");
      }
    };

    fetchProvider();
  }, [token]);

  // ---------------- HANDLE PROFILE EDIT ---------------- //
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedProfile({ ...updatedProfile, [name]: value });
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewPic(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    const formData = new FormData();
    if (updatedProfile.phone) formData.append("phone", updatedProfile.phone);
    if (updatedProfile.bio) formData.append("bio", updatedProfile.bio);
    if (profilePic) formData.append("profile_picture", profilePic);

    try {
      const res = await fetch(`${API_BASE}/provider/profile/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setProvider(data);
        setUpdatedProfile(data);
        if (data.profile_picture)
          setPreviewPic(getImageUrl(data.profile_picture));
        setMessage("Profile updated successfully!");
        setEditMode(false);
      } else {
        setMessage(data.detail || "Update failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error while updating profile");
    }
  };

  // ---------------- FETCH REVIEWS ---------------- //
  const loadReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/review/provider/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setProviderReviews(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Failed to load reviews");
    }

    setLoading(false);
  };

  // ---------------- FETCH PROVIDER REQUESTS ---------------- //
  const loadRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/providers/requests/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setProviderRequests(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Failed to load requests");
    }

    setLoading(false);
  };

  // ---------------- FETCH PROVIDER WEBINARS ---------------- //
  const loadWebinars = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/provider/webinar/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setProviderWebinars(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setError("Failed to load webinars");
    }

    setLoading(false);
  };

  // ---------------- TAB HANDLER ---------------- //
  const openTab = (tab) => {
    setActiveTab(tab);

    if (tab === "reviews") loadReviews();
    if (tab === "requests") loadRequests();
    if (tab === "webinars") loadWebinars();
  };

  if (!provider)
    return (
      <div className="text-center text-light">
        <div className="spinner-border text-warning"></div>
        <p>Loading provider profile...</p>
      </div>
    );

  return (
    <>
      {/* ---------------- PROFILE SECTION ---------------- */}
      <div className="p-4 bg-black d-flex">
        <div className="provider-profile-card card shadow-lg p-4 bg-gray-400 text-light border-warning mt-5">
          <div className="row">
            {/* LEFT SIDE – IMAGE */}
            <div className="col-md-4 text-center profile-left">
              <h4 className="text-warning mb-3">{provider.username}</h4>

              <img
                src={previewPic || "/Default_profile.jpg"}
                alt="Profile"
                className="profile-image"
              />

              <p className="text-light mt-2">{provider.email}</p>

              <p
                className={`fw-semibold ${
                  provider.verified ? "text-success" : "text-danger"
                }`}
              >
                {provider.verified ? (
                  <>
                    <CheckCircle2 size={16} /> Verified Provider
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Not Verified
                  </>
                )}
              </p>

              {editMode && (
                <div className="mt-3 w-100">
                  <label className="text-warning fw-bold">Change Picture</label>
                  <input
                    type="file"
                    onChange={handlePicChange}
                    className="form-control bg-dark text-light border-warning"
                  />
                </div>
              )}
            </div>

            {/* RIGHT SIDE */}
            <div className="col-md-8 ps-md-4 mt-4 mt-md-0">
              <h4 className="text-warning mb-3 text-center text-md-start">
                Profile Details
              </h4>

              {/* PHONE */}
              <div className="mb-3">
                <label className="text-warning fw-bold">
                  <Phone size={16} /> Phone:
                </label>
                <input
                  name="phone"
                  type="text"
                  className="form-control bg-dark text-light border-warning"
                  value={updatedProfile.phone || ""}
                  onChange={handleChange}
                  disabled={!editMode}
                />
              </div>

              {/* BIO */}
              <div className="mb-3">
                <label className="text-warning fw-bold">
                  <FileText size={16} /> Bio:
                </label>
                <textarea
                  name="bio"
                  rows="3"
                  className="form-control bg-dark text-light border-warning"
                  value={updatedProfile.bio || ""}
                  onChange={handleChange}
                  disabled={!editMode}
                ></textarea>
              </div>

              {/* CATEGORY */}
              <div className="mb-3">
                <label className="text-warning fw-bold">
                  <Wrench size={16} /> Service Category:
                </label>
                <p className="text-light ms-1">
                  {provider.service_category_name || "Not assigned"}
                </p>
              </div>

              {/* EXPERIENCE */}
              <div className="mb-3">
                <label className="text-warning fw-bold">Experience:</label>
                <p className="text-light ms-1">
                  {provider.experience || 0} years
                </p>
              </div>

              {/* DOCUMENT */}
              <div className="mb-3">
                <label className="text-warning fw-bold">Documents:</label>
                <p className="ms-1">
                  {provider.documents ? (
                    <a
                      href={`${API_BASE.replace(
                        "/api",
                        ""
                      )}${provider.documents}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-warning"
                    >
                      View Uploaded Document
                    </a>
                  ) : (
                    "No document uploaded"
                  )}
                </p>
              </div>

              {/* BUTTONS */}
              <div className="d-flex flex-column flex-md-row gap-2 mt-4">
                {editMode ? (
                  <>
                    <button
                      className="btn btn-warning w-100 text-black fw-bold"
                      onClick={handleSave}
                    >
                      <Save size={18} className="me-1" /> Save
                    </button>

                    <button
                      className="btn btn-secondary w-100"
                      onClick={() => {
                        setEditMode(false);
                        setUpdatedProfile(provider);
                        setPreviewPic(getImageUrl(provider.profile_picture));
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-outline-warning w-100"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit3 size={18} className="me-1" /> Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <p className="text-center text-warning mt-3">{message}</p>
        )}
      </div>

      {/* ---------------- TABS ---------------- */}
      <div className="provider-tab-buttons bg-black p-5">      
        <button
          className={`btn ${
            activeTab === "reviews" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("reviews")}
        >
          Reviews
        </button>

        <button
          className={`btn ${
            activeTab === "requests" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("requests")}
        >
          Requests
        </button>

        <button
          className={`btn ${
            activeTab === "webinars" ? "btn-warning" : "btn-outline-warning"
          }`}
          onClick={() => openTab("webinars")}
        >
          Webinars
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
            Refresh
          </button>
        )}
      </div>

      {/* ---------------- TAB CONTENT ---------------- */}
      <div
        className="grid bg-black border-warning p-5 border-top border-bottom"
        style={{ maxHeight: 450, overflowY: "auto" }}
      >
        {loading && (
          <div className="text-center">
            <div className="spinner-border text-warning"></div>
          </div>
        )}

        {error && <div className="text-danger">{error}</div>}

        {/* REVIEWS */}
        {activeTab === "reviews" &&
          !loading &&
          providerReviews.map((rev) => (
            <div key={rev.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">{rev.username}</span>
                <span className="text-warning">
                  {"⭐".repeat(rev.rating)}
                </span>
              </div>
              <div className="text-light">{rev.comment}</div>
              <div className="text-secondary small">
                {new Date(rev.created_at).toLocaleString()}
              </div>
            </div>
          ))}

        {/* REQUESTS */}
        {activeTab === "requests" &&
          !loading &&
          providerRequests.map((req) => (
            <div key={req.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">
                  {req.service_category_name}
                </span>
                <span className="text-secondary">{req.status}</span>
              </div>
              <div className="text-light">{req.notes || "No notes"}</div>
              <div className="text-secondary small">
                {new Date(req.created_at).toLocaleString()}
              </div>
            </div>
          ))}

        {/* WEBINARS */}
        {activeTab === "webinars" &&
          !loading &&
          providerWebinars.map((wb) => (
            <div key={wb.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between">
                <span className="text-warning">{wb.title}</span>
                <span className="text-secondary">
                  {new Date(wb.webinar_date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-light">{wb.description}</div>
              <div className="text-secondary small">
                Hosted by: <b>You</b>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

export default ProviderProfile;
