import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HashLink } from 'react-router-hash-link';
import { UserContext } from "../context/UserContext";
import { Bell } from "react-bootstrap-icons";
import { Badge, NavDropdown, ListGroup } from "react-bootstrap";
import toast, { Toaster } from "react-hot-toast";
import Notifications from "../pages/Notifications";
import "./Navbar.css";

const PROVIDER_DASHBOARD = "/provider/dashboard";
const USER_DASHBOARD     = "/user/dashboard";

function Navbar() {
  const { user, handleLogout } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isIndexPage = location.pathname === "/" || location.pathname === "/index";

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);

  // Hide/show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getHomePath = () => {
    if (!user?.username) return "/";
    return user.is_provider ? PROVIDER_DASHBOARD : USER_DASHBOARD;
  };

  const navLinkClass = (path) =>
    location.pathname === path ? "nav-link active-link" : "nav-link";

  // ──────────────────────────────────────────────────────────────
  // NOTIFICATION BADGE & DROPDOWN – FULLY FIXED & NO DUPLICATE TOASTS
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const updateBadge = () => {
      const count = window.__unreadCount || 0;
      setUnreadCount(count);
    };

    // Initial + real-time updates
    updateBadge();
    window.addEventListener("notifications-updated", updateBadge);
    window.addEventListener("auth-change", updateBadge);

    return () => {
      window.removeEventListener("notifications-updated", updateBadge);
      window.removeEventListener("auth-change", updateBadge);
    };
  }, [user]);

  const openChat = (chatroom_id) => {
    navigate(`/chat/${chatroom_id}`);
  };

  const markAllRead = () => {
    if (window.__markAllRead) window.__markAllRead();
  };

  return (
    <>
      <nav className={`navbar navbar-expand-lg navbar-dark bg-clear px-3 custom-navbar ${showNavbar ? "nav-show" : "nav-hide"}`}>
        
        <Notifications /> {/* This handles polling + toasts + global state */}

        <Link className="navbar-brand fw-bold text-warning" to={getHomePath()}>
          DoerHub
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {user && user.username ? (
              <>
                {/* NOTIFICATION BELL WITH DROPDOWN */}
                <li className="nav-item dropdown">
                  <NavDropdown
                    align="end"
                    title={
                      <span className="d-flex align-items-center position-relative">
                        <Bell size={24} className="text-yellow" />
                        {unreadCount > 0 && (
                          <Badge
                            pill
                            bg="danger"
                            className="position-absolute top-0 start-100 translate-middle"
                            style={{ fontSize: "0.65rem" }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </span>
                    }
                    id="notifications-dropdown"
                  >
                    <NavDropdown.Header className="d-flex justify-content-between align-items-center text-dark">
                      <strong>Notifications</strong>
                      {unreadCount > 0 && (
                        <button
                          className="btn btn-sm btn-link text-dark p-0 fw"
                          onClick={markAllRead}
                        >
                          Mark all as read
                        </button>
                      )}
                    </NavDropdown.Header>

                    {(window.__notifications || []).length === 0 ? (
                      <NavDropdown.Item className="text-center text-muted py-3">
                        No new notifications
                      </NavDropdown.Item>
                    ) : (
                      <ListGroup variant="flush" style={{ maxHeight: "70vh", overflowY: "auto", minWidth: "380px" }}>
                        {window.__notifications.map((n) => {
                          const isBroadcast = n.recipient === null;
                          const hasChat = !!n.extra_data?.chatroom_id;

                          return (
                            <ListGroup.Item
                              key={n.id}
                              action
                              onClick={() => hasChat && openChat(n.extra_data.chatroom_id)}
                              className={!n.is_read && !isBroadcast ? "fw-bold" : ""}
                              style={{
                                backgroundColor: isBroadcast
                                  ? "#ffebee"
                                  : !n.is_read
                                  ? "#e8f0fe"
                                  : "transparent",
                                borderLeft: isBroadcast
                                  ? "5px solid #d32f2f"
                                  : !n.is_read
                                  ? "5px solid #1976d2"
                                  : "5px solid transparent",
                                cursor: hasChat ? "pointer" : "default",
                              }}
                            >
                              {isBroadcast ? (
                                <>
                                  <div className="text-danger fw-bold small">Admin Broadcast</div>
                                  <div className="small mt-1">{n.message}</div>
                                </>
                              ) : n.type === "new_category" ? (
                                <>
                                  <div className="text-purple fw-bold small">New Service Available</div>
                                  <div className="small mt-1">{n.message}</div>
                                </>
                              ) : (
                                <>
                                  <div className="small">
                                    <strong>{n.extra_data?.sender || "User"}</strong>: {n.message}
                                  </div>
                                  {hasChat && (
                                    <div className="text-muted x-small mt-1">
                                      Chat #{n.extra_data.chatroom_id} •{" "}
                                      {new Date(n.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    )}
                  </NavDropdown>
                </li>

                {/* Rest of your nav items (unchanged) */}
                {user.is_provider ? (
                  <>
                    <li className="nav-item"><HashLink className={navLinkClass("/provider/dashboard#about")} to="/provider/dashboard#about">About</HashLink></li>
                    <li className="nav-item"><Link className={navLinkClass("/provider/webinarform")} to="/provider/webinarform">Webinars</Link></li>
                    <li className="nav-item"><Link className={navLinkClass("/provider/requests")} to="/provider/requests">Requests</Link></li>
                    <li className="nav-item"><Link className={navLinkClass("/contact")} to="/contact">Contact</Link></li>
                    <li className="nav-item"><Link className={navLinkClass("/provider/profile")} to="/provider/profile">Profile</Link></li>
                  </>
                ) : (
                  <>
                    <li className="nav-item"><Link className={navLinkClass("/user/browse-services")} to="/user/browse-services">Services</Link></li>
                    <li className="nav-item"><HashLink className={navLinkClass("/user/dashboard#about")} to="/user/dashboard#about">About</HashLink></li>
                    <li className="nav-item"><Link className={navLinkClass("/contact")} to="/contact">Contact</Link></li>
                    <li className="nav-item"><Link className={navLinkClass("/profile")} to="/profile">Profile</Link></li>
                  </>
                )}

                <li className="nav-item ms-3">
                  <button className="btn btn-sm btn-outline-warning" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                {!isIndexPage && <li className="nav-item"><Link className={navLinkClass("/")} to="/">Home</Link></li>}
                <li className="nav-item"><Link className={navLinkClass("/signup")} to="/signup">Signup</Link></li>
                <li className="nav-item"><Link className={navLinkClass("/login")} to="/login">Login</Link></li>
              </>
            )}
          </ul>

          <Toaster position="top-right" />
        </div>
      </nav>

      <div style={{ height: "70px", backgroundColor: "black" }}></div>
    </>
  );
}

export default Navbar;