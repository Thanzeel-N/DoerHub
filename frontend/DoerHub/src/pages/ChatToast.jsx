import React from "react";
import { motion } from "framer-motion";

/**
 * ChatToast – clickable toast notification for chat messages
 * Props:
 * - sender: string (display name)
 * - message: string
 * - onClick: function to call when clicked
 */
const ChatToast = ({ sender, message, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      tabIndex={0}
      role="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        pointerEvents: "auto",
        cursor: "pointer",
        padding: "12px 16px",
        background: "#e3f2fd",
        borderLeft: "5px solid #1976d2",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        maxWidth: "320px",
        transition: "transform 0.2s ease, background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.background = "#dbeafe";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1.0)";
        e.currentTarget.style.background = "#e3f2fd";
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        {sender || "New Message"}
      </div>
      <div style={{ fontSize: "14px", marginBottom: "4px" }}>{message}</div>
      <small style={{ color: "#666", fontSize: "12px" }}>
        Click to open chat
      </small>
    </motion.div>
  );
};

export default ChatToast;
