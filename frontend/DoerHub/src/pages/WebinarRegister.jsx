import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import toast from "react-hot-toast";
import "../css/WebinarRegister.css";

const API_BASE = "http://localhost:8000/api";
Modal.setAppElement("#root");

function WebinarRegister() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [webinar, setWebinar] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [sendingLink, setSendingLink] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = API_BASE.replace(/\/api\/?$/, "");
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const getUserIdFromToken = (t) => {
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return parseInt(payload.user_id, 10);
    } catch {
      return null;
    }
  };

  const isToday = (dateStr) => {
    const webinarDate = new Date(dateStr);
    const today = new Date();
    return (
      webinarDate.getFullYear() === today.getFullYear() &&
      webinarDate.getMonth() === today.getMonth() &&
      webinarDate.getDate() === today.getDate()
    );
  };

  const isPast = (dateStr) => {
    const webinarDate = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return webinarDate < now;
  };

  useEffect(() => {
    if (!id || !token) return;
    const fetchAll = async () => {
      try {
        const wRes = await fetch(`${API_BASE}/webinars/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!wRes.ok) throw new Error("Webinar not found");
        const wData = await wRes.json();
        setWebinar(wData);
        const userId = getUserIdFromToken(token);
        const owner = wData.provider_id === userId;
        setIsOwner(owner);
        const regRes = await fetch(`${API_BASE}/webinars/${id}/register/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (regRes.ok) {
          const { is_registered } = await regRes.json();
          setRegistered(is_registered);
        }
        if (owner) {
          const allRes = await fetch(`${API_BASE}/webinars/${id}/registrations/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (allRes.ok) {
            const { registrations } = await allRes.json();
            setRegistrations(registrations);
          }
        }
      } catch (e) {
        toast.error(e.message || "Failed to load");
      }
    };
    fetchAll();
  }, [id, token]);


  const handleRegister = async () => {
    if (!webinar || registered || loading) return;
    setLoading(true);

    try {
      if (webinar.webinar_type === "free") {
        const res = await fetch(`${API_BASE}/webinars/${id}/register/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Failed");
          return;
        }
        setRegistered(true);
        setModalOpen(true);
        return;
      }

      const orderRes = await fetch(`${API_BASE}/webinars/${id}/init-payment/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        toast.error(err.error || "Payment init failed");
        return;
      }
      const order = await orderRes.json();

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: "INR",
        name: order.webinar_title,
        description: "Webinar Registration",
        order_id: order.order_id,
        handler: async (response) => {
          const verifyRes = await fetch(`${API_BASE}/webinars/${id}/register/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ payment_id: response.razorpay_payment_id }),
          });
          if (verifyRes.ok) {
            setRegistered(true);
            setModalOpen(true);
          } else {
            toast.error("Payment failed");
          }
        },
        theme: { color: "#3399cc" },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (err) {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendLink = async () => {
    if (!meetingLink.trim()) {
      toast.error("Please enter a meeting link");
      return;
    }

    setSendingLink(true);
    try {
      const res = await fetch(`${API_BASE}/webinars/${id}/send-link/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ link: meetingLink }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Link sent to ${data.sent_to_count} attendees`);
        setLinkModalOpen(false);
        setMeetingLink("");
      } else {
        toast.error(data.error || "Failed to send link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSendingLink(false);
    }
  };

  const startEdit = () => { setEditData(webinar); setEditMode(true); };
  const cancelEdit = () => { setEditMode(false); setEditData({}); };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(p => ({ ...p, [name]: value }));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/webinars/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setWebinar(updated);
      setEditMode(false);
      toast.success("Updated");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };


  // ─────────────── PERFECT CENTERED PREMIUM CSS ───────────────
  const premiumCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800;900&display=swap');
    
    * { font-family: 'Poppins', sans-serif !important; box-sizing: border-box; }
    
    body { 
      background: linear-gradient(135deg, #000 0%, #111 100%) !important; 
      color: white !important; 
      min-height: 100vh;
      margin: 0;
    }

    /* Perfect centering for all containers */
    .max-w-5xl, .max-w-lg, .max-w-2xl {
      margin: 0 auto;
      width: 100%;
      max-width: 1200px;
    }

    /* Card containers */
    .bg-white, .bg-gray-50, .bg-gray-200, .bg-yellow-50 {
      background: rgba(20,20,20,0.95) !important;
      border: 2px solid rgba(255,215,0,0.3) !important;
      border-radius: 24px !important;
      padding: 2.5rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;
      text-align: center;
    }

    /* Gold gradient text */
    h2, h3, .text-2xl, .text-xl, .font-bold {
      background: linear-gradient(90deg, #FFD700, #ffc107, #FFD700);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 900 !important;
    }

    .text-gray-600, .text-gray-500 { color: #ccc !important; }

    /* Premium Gold Buttons */
    button[class*="bg-"]:not([disabled]), 
    button.bg-indigo-600, button.bg-blue-600, button.bg-green-600, 
    button.bg-yellow-500 {
      background: linear-gradient(45deg, #fcfc09ff, #ffc107) !important;
      color: #090909ff !important;
      margin-top: 1rem;
      font-weight: bold !important;
      border: none !important;
      border-radius: 50px !important;
      padding: 1rem 2.5rem !important;
      font-size: .5rem !important;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(255,215,0,0.4) !important;
      transition: all 0.3s ease !important;
      min-width: 100px;
    }

    button[class*="bg-"]:hover:not([disabled]) {
      transform: translateY(-6px) scale(1.05) !important;
      box-shadow: 0 20px 40px rgba(255,215,0,0.6) !important;
    }

    button:disabled, button.bg-gray-400 {
      background: #444 !important;
      transform: none !important;
      cursor: not-allowed !important;
      opacity: 0.7;
    }

    /* Inputs */
    input, textarea {
      background: rgba(255,255984,0.1) !important;
      border: 2px solid #FFD700 !important;
      color: white !important;
      border-radius: 16px !important;
      padding: 1rem 1.5rem !important;
      font-size: 1.1rem !important;
      width: 100%;
    }
    input:focus, textarea:focus {
      outline: none !important;
      border-color: #ffc107 !important;
      box-shadow: 0 0 30px rgba(255,215,0,0.5) !important;
    }

    /* Table */
    table {
      background: #111 !important;
      border-radius: 20px !important;
      overflow: hidden;
      margin: 2rem auto;
      width: 100%;
      max-width: 1000px;
    }
    thead { background: linear-gradient(90deg, #FFD700, #ffc107) !important; }
    th { color: black !important; font-weight: bold !important; padding: 1.5rem !important; }
    td { padding: 1.2rem !important; }
    .bg-green-100 { background: #00ff00 !important; color: black !important; padding: 0.5rem 1rem; border-radius: 50px; }
    .bg-yellow-100 { background: #FFD700 !important; color: black !important; padding: 0.5rem 1rem; border-radius: 50px; }

    /* Grid centering */
    .grid { display: grid; gap: 3rem; align-items: center; }
    .md\\:grid-cols-2 { grid-template-columns: 1fr 1fr; }

    /* Image */
    img { border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.6); }
  `;

  const modalStyle = {
    overlay: { backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1000 },
    content: {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#111",
      color: "#fff",
      borderRadius: "10px",
      border: "2px solid #FFD700",
      maxWidth: "500px",
      width: "90%",
      padding: "2.5rem",
      textAlign: "center",
      boxShadow: "0 20px 60px rgba(255,215,0,0.3)",
    },
  };

  if (!webinar) return (
    <>
      <style>{premiumCSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ fontSize: "3rem" }}>Loading Webinar...</h1>
      </div>
    </>
  );

  if (isPast(webinar.webinar_date)) {
    return (
      <>
        <style>{premiumCSS}</style>
        <div className="max-w-2xl mx-auto text-center" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2rem" }}>
          <h2 style={{ fontSize: "4.5rem" }}>{webinar.title}</h2>
          <p style={{ fontSize: "2rem" }}>
            Took place on <strong style={{ color: "#FFD700" }}>{new Date(webinar.webinar_date).toLocaleDateString()}</strong>
          </p>
          <button onClick={() => navigate(-1)} className="bg-blue-600 mx-auto" style={{ padding: "1.5rem 4rem", fontSize: "1.5rem" }}>
            Go Back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{premiumCSS}</style>

      {isOwner ? (
        <div className="max-w-5xl mx-auto  rounded-xl mt-5">
          <h2 className="text-4xl mb-8">You own: {webinar.title}</h2>

          {/* Send Link Modal */}
          <Modal isOpen={linkModalOpen} onRequestClose={() => setLinkModalOpen(false)} style={modalStyle}>
            <h3 className="text-3xl mb-6">Send Meeting Link</h3>
            <input
              type="text"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="mb-6"
            />
            <div className="flex justify-center gap-6">
              <button onClick={() => setLinkModalOpen(false)} className="bg-gray-600">Cancel</button>
              <button onClick={handleSendLink} disabled={sendingLink || !meetingLink.trim()} className="bg-yellow-600">
                {sendingLink ? "Sending..." : "Send to All"}
              </button>
            </div>
          </Modal>

          {editMode ? (
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-3xl mb-8">Edit Webinar Details</h3>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <input name="title" value={editData.title || ""} onChange={handleEditChange} placeholder="Webinar Title" />
                <input name="webinar_date" type="date" value={editData.webinar_date || ""} onChange={handleEditChange} />
                <textarea name="description" value={editData.description || ""} onChange={handleEditChange} placeholder="Description" rows="5" className="md:col-span-2" />
                {webinar.webinar_type === "paid" && (
                  <input name="price" type="number" value={editData.price || ""} onChange={handleEditChange} placeholder="Price (₹)" />
                )}
              </div>
              <div className="flex justify-center gap-8 mt-10">
                <button onClick={cancelEdit} className="bg-gray-600">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="bg-green-600">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-1zz items-center mb-12">
                <div>
                  {getImageUrl(webinar.image) ? (
                    <img src={getImageUrl(webinar.image)} alt={webinar.title} className="w-full rounded-2xl shadow-2xl" style={{ maxHeight: "500px", objectFit: "cover" }} />
                  ) : (
                    <div className="bg-gray-200 rounded-2xl h-96 flex items-center justify-center text-3xl">No Image</div>
                  )}
                </div>
                <div className="text-center space-y-6">
                  
                  <p className="text-xl leading-relaxed">{webinar.description}</p>
                  <p className="text-4xl font-bold">
                    {webinar.webinar_type === "paid" ? `₹${webinar.price}` : "FREE WEBINAR"}
                  </p>

                  {isToday(webinar.webinar_date) ? (
                    <button
                      onClick={() => setLinkModalOpen(true)}
                      disabled={registrations.length === 0}
                      className="bg-yellow-500"
                    >
                      Send Meeting Link 
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-600 rounded-2xl p-8">
                      <p className="text-3xl">Webinar Date</p>
                      <p className="text-5xl mt-4 font-bold">
                        {new Date(webinar.webinar_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center my-12">
                <button onClick={startEdit} className="bg-yellow-500">
                  Edit Webinar Details
                </button>
              </div>
            </>
          )}

          <h3 className="text-4xl mb-8">Registered Attendees</h3>
          {registrations.length === 0 ? (
            <p className="text-center text-2xl text-yellow-400">No one registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-2xl">Total Registrations: <strong className="text-5xl text-yellow-500">{registrations.length}</strong></p>
              <table className="min-w-full">
                {/* Your table remains unchanged */}
                <thead className="bg-gray">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Registered At</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4">{r.user_name}</td>
                      <td className="px-6 py-4">{r.user_email}</td>
                      <td className="px-6 py-4">{new Date(r.registered_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={r.is_paid ? "bg-green-100" : "bg-yellow-100"}>
                          {r.is_paid ? "Paid" : "Free"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Attendee View - Perfectly Centered */
        <div className="max-w-lg mx-auto bg-white rounded-xl">
          {getImageUrl(webinar.image) ? (
            <img src={getImageUrl(webinar.image)} alt={webinar.title} className="w-full rounded-2xl shadow-2xl" style={{ height: "400px", objectFit: "cover" }} />
          ) : (
            <div className="w-full h-96 bg-gray-200 rounded-2xl flex items-center justify-center text-3xl">No Image</div>
          )}

          <h2 className="text-4xl mt-8 mb-4">{webinar.title}</h2>
          <p className="text-xl leading-relaxed mb-4">{webinar.description}</p>
          <p className="text-2xl mb-6">
            {new Date(webinar.webinar_date).toLocaleDateString('en-IN')}
          </p>
          <p className="text-4xl font-bold mb-10">
            {webinar.webinar_type === "paid" ? `₹${webinar.price}` : "FREE"}
          </p>

          <button
            onClick={handleRegister}
            disabled={loading || registered}
            className={` ${
              registered ? "bg-green-500" : loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {registered ? "Registered Successfully" : loading ? "Processing..." : webinar.webinar_type === "paid" ? "Pay & Register" : "Join Free Now"}
          </button>

          <Modal isOpen={modalOpen} onRequestClose={() => setModalOpen(false)} style={modalStyle}>
            <h2 className="text-4xl mb-6 text-green-400">Registered!</h2>
            <p className="text-2xl mb-8">You're all set for</p>
            <p className="text-3xl font-bold mb-10">{webinar.title}</p>
            <button onClick={() => setModalOpen(false)} className="bg-blue-600">
              Close
            </button>
          </Modal>
        </div>
      )}
    </>
  );
}

export default WebinarRegister;