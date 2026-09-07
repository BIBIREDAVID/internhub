import { useEffect, useState } from "react";
import { subscribeToast } from "../utils/toast";

const AUTO_DISMISS_MS = 5000;

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((current) => [...current, toast]);
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={styles.wrap}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{ ...styles.toast, ...(toast.type === "error" ? styles.error : styles.success) }}
          onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: 1000,
    maxWidth: "360px",
  },
  toast: {
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "500",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    cursor: "pointer",
  },
  error: { background: "#dc2626", color: "#fff" },
  success: { background: "#16a34a", color: "#fff" },
};
