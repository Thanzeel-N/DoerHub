// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";
// import WebinarList from "./WebinarList";

// const API_BASE = "http://localhost:8000/api";

// function ProviderWebinarForm() {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [webinarDate, setWebinarDate] = useState("");
//   const [webinarType, setWebinarType] = useState("free");
//   const [price, setPrice] = useState("");
//   const [image, setImage] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);
//   const [previewImg, setPreviewImg] = useState(null);

//   const navigate = useNavigate();

//   const resetForm = () => {
//     setTitle("");
//     setDescription("");
//     setWebinarDate("");
//     setWebinarType("free");
//     setPrice("");
//     setImage(null);
//     setPreviewImg(null);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!image) {
//       toast.error("Please select a poster image");
//       return;
//     }

//     const token = localStorage.getItem("access");
//     if (!token) {
//       toast.error("Login required");
//       navigate("/login");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("title", title);
//     formData.append("description", description);
//     formData.append("webinar_date", webinarDate);
//     formData.append("webinar_type", webinarType);
//     if (webinarType === "paid") formData.append("price", price);
//     formData.append("image", image);

//     setUploading(true);
//     toast.loading("Uploading...", { id: "upload" });

//     try {
//       const res = await fetch(`${API_BASE}/provider/webinars/`, {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       });

//       const data = await res.json();

//       if (res.ok) {
//         toast.success(`Webinar "${data.title}" created!`, { id: "upload" });
//         resetForm();
//         setRefreshKey((prev) => prev + 1);
//       } else {
//         const err = data.detail || "Upload failed";
//         toast.error(err, { id: "upload" });
//       }
//     } catch (error) {
//       toast.error("Network error", { id: "upload" });
//     }

//     setUploading(false);
//   };

//   return (
//     <div className="d-flex justify-content-center align-items-center min-h-screen bg-black py-12 px-4">
//       <div className="max-w-4xl mx-auto">
        
//         {/* Main Title */}
//         <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 text-center mb-5 tracking-tight">
//           Host a Webinar
//         </h1>

//         {/* --- FORM CARD --- */}
//         <div className="card  border-warning rounded-5 shadow mb-5 p-5">

          

//           <form onSubmit={handleSubmit} className="space-y-6">

//             {/* Title */}
//             <div>
//               <input
//                 type="text"
//                 value={title}
//                 placeholder="Enter webinar title"
//                 onChange={(e) => setTitle(e.target.value)}
//                 className="form-control border-warning"
//                 required
//               />
//             </div>

//             {/* Description */}
//             <div>
//               <textarea
//                 value={description}
//                 placeholder="Describe your webinar in detail..."
//                 onChange={(e) => setDescription(e.target.value)}
//                 rows={5}
//                 className="form-control border-warning"
//                 required
//               ></textarea>
//             </div>

//             {/* Date */}
//             <div>
//               <input
//                 type="date"
//                 value={webinarDate}
//                 onChange={(e) => setWebinarDate(e.target.value)}
//                 className="form-control border-warning"
//                 required
//               />
//             </div>

//             {/* Type & Price */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

//               <div>
//                 <select
//                   value={webinarType}
//                   onChange={(e) => setWebinarType(e.target.value)}
//                   className="form-control border-warning"
//                   required
                
//                 >
//                   <option value="free">Free Webinar</option>
//                   <option value="paid">Paid Webinar</option>
//                 </select>
//               </div>

//               {webinarType === "paid" && (
//                 <div>
//                   <input
//                     type="number"
//                     value={price}
//                     placeholder="Price (₹) Eg: 299"
//                     onChange={(e) => setPrice(e.target.value)}
//                     className="form-control border-warning"
//                     required
//                   />
//                 </div>
//               )}
//             </div>

//             {/* Image Upload */}
//             <div>
//               <input
//                 type="file"
//                 placeholder="Upload poster image"
//                 accept="image/*"
//                 onChange={(e) => {
//                   setImage(e.target.files[0]);
//                   setPreviewImg(URL.createObjectURL(e.target.files[0]));
//                 }}
//                 className="form-control border-warning file:mr-4 file:py-2 file:px-6 file:"
//                 required
//               />
//             </div>

//             {/* Poster Preview */}
//             {previewImg && (
//               <div className="mt-4">
//                 <p className="text-yellow-400 font-semibold mb-2">Preview:</p>
//                 <img
//                   src={previewImg}
//                   alt="Preview"
//                   width="300px"
//                   height="200px"
//                   className="rounded-lg border border-warning shadow-xl w-full max-h-96 object-cover mb-5"
//                 />
//               </div>
//             )}

//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={uploading}
//               className="btn-secondary"
//             >
//               {uploading ? "Uploading..." : "Create Webinar"}
//             </button>
//           </form>
//         </div>

//         {/* --- WEBINAR LIST SECTION --- */}
//         {/* <div className="mt-20">

//           <div className="rounded-5 shadow-lg p-5 mb-5">
//             <WebinarList key={refreshKey} />
//           </div>
//         </div> */}

//         {activeTab === "webinars" &&
//           !loading &&
//           providerWebinars?.map((wb) => (
//             <div key={wb.id} className="border-bottom py-2">
              
//               <div className="d-flex justify-content-between">
//                 <span className="text-warning">{wb.title}</span>
//                 <span className="text-secondary">
//                   {new Date(wb.webinar_date).toLocaleDateString()}
//                 </span>
//               </div>

//               <div className="text-light">
//                 {wb.description || "No description provided"}
//               </div>

//               <div className="text-secondary small">
//                 Hosted by: <b>You</b>
//               </div>

//             </div>
//           ))}


//       </div>
//     </div>
//   );
// }

// export default ProviderWebinarForm;


import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import WebinarList from "./WebinarList";

const API_BASE = "http://localhost:8000/api";

function ProviderWebinarForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [webinarDate, setWebinarDate] = useState("");
  const [webinarType, setWebinarType] = useState("free");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewImg, setPreviewImg] = useState(null);

  const [providerWebinars, setProviderWebinars] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProviderWebinars();
  }, [refreshKey]);

  const fetchProviderWebinars = async () => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/provider/webinars/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setProviderWebinars(data);
      } else {
        toast.error("Failed to load webinars");
      }
    } catch (error) {
      toast.error("Network error");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setWebinarDate("");
    setWebinarType("free");
    setPrice("");
    setImage(null);
    setPreviewImg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      toast.error("Please select a poster image");
      return;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      toast.error("Login required");
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("webinar_date", webinarDate);
    formData.append("webinar_type", webinarType);
    if (webinarType === "paid") formData.append("price", price);
    formData.append("image", image);

    setUploading(true);
    toast.loading("Uploading...", { id: "upload" });

    try {
      const res = await fetch(`${API_BASE}/provider/webinars/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Webinar "${data.title}" created!`, { id: "upload" });
        resetForm();
        setRefreshKey((prev) => prev + 1);
      } else {
        const err = data.detail || "Upload failed";
        toast.error(err, { id: "upload" });
      }
    } catch (error) {
      toast.error("Network error", { id: "upload" });
    }

    setUploading(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 text-center mb-5 tracking-tight">
          Host a Webinar
        </h1>

        {/* --- FORM CARD --- */}
        <div className="card  border-warning rounded-5 shadow mb-5 p-5">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                placeholder="Enter webinar title"
                onChange={(e) => setTitle(e.target.value)}
                className="form-control border-warning"
                required
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                value={description}
                placeholder="Describe your webinar in detail..."
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="form-control border-warning"
                required
              ></textarea>
            </div>

            {/* Date */}
            <div>
              <input
                type="date"
                value={webinarDate}
                onChange={(e) => setWebinarDate(e.target.value)}
                className="form-control border-warning"
                required
              />
            </div>

            {/* Type & Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <select
                  value={webinarType}
                  onChange={(e) => setWebinarType(e.target.value)}
                  className="form-control border-warning"
                  required
                >
                  <option value="free">Free Webinar</option>
                  <option value="paid">Paid Webinar</option>
                </select>
              </div>

              {webinarType === "paid" && (
                <div>
                  <input
                    type="number"
                    value={price}
                    placeholder="Price (₹) Eg: 299"
                    onChange={(e) => setPrice(e.target.value)}
                    className="form-control border-warning"
                    required
                  />
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <input
                type="file"
                placeholder="Upload poster image"
                accept="image/*"
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  setPreviewImg(URL.createObjectURL(e.target.files[0]));
                }}
                className="form-control border-warning file:mr-4 file:py-2 file:px-6 file:"
                required
              />
            </div>

            {/* Poster Preview */}
            {previewImg && (
              <div className="mt-4">
                <p className="text-yellow-400 font-semibold mb-2">Preview:</p>
                <img
                  src={previewImg}
                  alt="Preview"
                  width="300px"
                  height="200px"
                  className="rounded-lg border border-warning shadow-xl w-full max-h-96 object-cover mb-5"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading}
              className="btn-secondary"
            >
              {uploading ? "Uploading..." : "Create Webinar"}
            </button>
          </form>
        </div>
        {/* --- PROVIDER OWNED WEBINAR LIST --- */}
        <div className="mt-20 rounded-5 shadow-lg p-5 mb-5">

          <h2 className="text-3xl font-bold text-warning mb-4 text-center">
            Your Hosted Webinars
          </h2>

          {loading && <p className="text-light">Loading...</p>}

          {!loading && providerWebinars.length === 0 && (
            <p className="text-secondary">You haven't hosted any webinars yet.</p>
          )}

          {!loading &&
            providerWebinars.map((wb) => (
              <div key={wb.id} className="border-bottom py-3">

                <div className="d-flex justify-content-between">
                  <span className="text-warning fs-5">{wb.title}</span>
                  <span className="text-secondary">
                    {new Date(wb.webinar_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-light">
                  {wb.description}
                </div>

                <div className="text-secondary small">
                  Hosted by: <b>You</b>
                </div>

              </div>
            ))}
        </div>

      </div>
    </div>
  );
}

export default ProviderWebinarForm;
