import React, { useEffect, useState } from "react";

function WebinarList() {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWebinars = async () => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/api/provider/webinars/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWebinars(data);
    } catch (err) {
      console.error("Failed to load webinars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebinars();
  }, []);

  if (loading) return <p>Loading your webinars...</p>;

  return (
    // <div className="space-y-4">
    //   <h3 className="text-lg font-semibold">Your Webinars</h3>
    //   {webinars.length === 0 ? (
    //     <p className="text-gray-500">No webinars yet. Create one!</p>
    //   ) : (
    //     webinars.map((w) => (
    //       <div key={w.id} className="card border-warning p-4 rounded-5">
    //         <h4 className="font-bold">{w.title}</h4>
    //         <p>{w.description}</p>
    //         <p className="text-sm text-gray-600">Date: {w.webinar_date}</p>
    //         <p className="text-sm">Type: {w.webinar_type} {w.price && `| ₹${w.price}`}</p>
    //         {w.image_url && <img src={w.image_url} alt={w.title} className="mt-2 h-32 object-cover rounded" />}
    //       </div>
    //     ))
    //   )}
    // </div>
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-yellow-400">Your Webinars</h3>

      {webinars.length === 0 ? (
        <p className="text-gray-500">No webinars yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Want 2 columns on large screens? Use: grid-cols-1 md:grid-cols-2 */}

          {webinars.map((w) => (
            <div
              key={w.id}
              className="bg-gray-900 border border-yellow-500 rounded-3xl p-5 shadow-md"
            >
              <h4 className="font-bold text-xl text-white">{w.title}</h4>

              <p className="text-gray-300 mt-2">{w.description}</p>

              <p className="text-sm text-gray-400 mt-1">
                📅 Date: <span className="text-yellow-400">{w.webinar_date}</span>
              </p>

              <p className="text-sm text-gray-400">
                🎟 Type:{" "}
                <span className="text-yellow-400">
                  {w.webinar_type} {w.price && `| ₹${w.price}`}
                </span>
              </p>

              {w.image_url && (
                <img
                  src={w.image_url}
                  alt={w.title}
                  className="mt-3 h-40 w-full object-cover rounded-xl border border-gray-700"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>

  );
}

export default WebinarList;