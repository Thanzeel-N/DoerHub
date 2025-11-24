import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import UserDashboard from "./pages/UserDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderRegistration from "./pages/ProviderRegistration";
import IndexPage from "./pages/Index";

import { UserContext } from "./context/UserContext";
import ServiceRequestPage from "./pages/ServiceRequestPage";
import ProviderProfile from "./pages/ProviderProfile";
import ProviderRequests from "./pages/ProviderRequests";

import BrowseServicesPage from "./pages/BrowseServicesPage";
import ProviderDetailsPage from "./pages/ProviderDetailsPage"; // ✅ newly added
import ProvidersByCategoryPage from "./pages/ProvidersByCategoryPage";
import { WebSocketProvider } from "./context/WebSocketContext";
import ChatRoom from "./pages/ChatRoom";
import { useContext } from "react";
import ProviderWebinarForm from "./pages/ProviderWebinarForm";
import WebinarRegister from "./pages/WebinarRegister";
import Notifications from "./pages/Notifications";
import AboutUs from "./pages/AboutUs";
import Footer from "./components/Footer";
import ContactPage from "./pages/Contact";


// ----------------------------------
// 🔒 ProtectedRoute Wrapper
// ----------------------------------
const ProtectedRoute = ({ children, isProviderRoute }) => {
  const token = localStorage.getItem("access");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) return <Navigate to="/login" replace />;
  if (isProviderRoute && !user.is_provider)
    return <Navigate to="/user/dashboard" replace />;
  if (!isProviderRoute && user.is_provider)
    return <Navigate to="/provider/dashboard" replace />;

  return children;
};

// ----------------------------------
// 🌟 Main App Content
// ----------------------------------
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

  const noNavbarRoutes = ["/", "/login", "/signup", "/provider/register", "/index"];
  const hideFooterRoutes = [
  "/login",
  "/signup",
  "/provider/register",
];

  // ✅ Context Handlers
  const handleLoginSuccess = (userData) => {
    if (userData && userData.username) {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      navigate(userData.is_provider ? "/provider/dashboard" : "/user/dashboard");
    }
  };

  const handleSignupSuccess = () => {
    navigate("/login");
  };

  

  const handleLogout = () => {
    if (window.wsRef && window.wsRef.current) {
      window.wsRef.current.close();
    }
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    // 2. Close WebSocket
    if (window.sessionWS) {
      console.log("Logout → closing sessionWS");
      window.sessionWS.close();
      window.sessionWS = null;
    }
    // 3. Optional: notify other components
    window.dispatchEvent(new CustomEvent("auth:logout"));
    navigate("/");
  };


  return (
    <UserContext.Provider
      value={{ user, setUser, handleLoginSuccess, handleSignupSuccess, handleLogout }}
    >
      <ToastContainer position="top-right" />
      <Notifications/>
      <ErrorBoundary>
        {!noNavbarRoutes.includes(location.pathname) && <Navbar />}
        <Routes>
          {/* ---------------- Public Routes ---------------- */}
          <Route path="/" element={<IndexPage />} />
          <Route path="/index" element={<IndexPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/provider/register" element={<ProviderRegistration />} />

          {/* ---------------- User Routes ---------------- */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute isProviderRoute={false}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/service-request"
            element={
              <ProtectedRoute isProviderRoute={false}>
                <ServiceRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/browse-services"
            element={
              <ProtectedRoute isProviderRoute={false}>
                <BrowseServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/:id"
            element={
              <ProtectedRoute isProviderRoute={false}>
                <ProviderDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/browse-services/:categoryId"
            element={
              <ProtectedRoute isProviderRoute={false}>
                <ProvidersByCategoryPage />
              </ProtectedRoute>
            }
          />

          {/* ---------------- Provider Routes ---------------- */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute isProviderRoute={true}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/webinarform"
            element={
              <ProtectedRoute isProviderRoute={true}>
                <ProviderWebinarForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/requests"
            element={
              <ProtectedRoute isProviderRoute={true}>
                <ProviderRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/profile"
            element={
              <ProtectedRoute isProviderRoute={true}>
                <ProviderProfile />
              </ProtectedRoute>
            }
          />

          {/* ---------------- Shared Routes ---------------- */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              
                <ChatRoom />
              
            }
          />
          <Route
            path="/webinar/:id"
            element={
              
                <WebinarRegister />
              
            }
          />
          <Route
            path="/about-us"
            element={
              <AboutUs />
            }
          />
          <Route
           path="/contact"
            element={
              <ContactPage />
            } 
          />


          {/* ---------------- Fallback ---------------- */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {!hideFooterRoutes.includes(location.pathname) && <Footer />}
      </ErrorBoundary>
    </UserContext.Provider>
  );
};

// ----------------------------------
// 🚀 App Wrapper
// ----------------------------------
function App() {
  return (
    <Router>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </Router>
  );
}

export default App;
