import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const navItems = {
  hr: [
    { label: "Dashboard", path: "/hr/dashboard", icon: "📊" },
    { label: "Applications", path: "/hr/applications", icon: "📋" },
    { label: "Interns", path: "/hr/interns", icon: "👥" },
    { label: "Attendance", path: "/hr/attendance", icon: "🕐" },
    { label: "Reports", path: "/hr/reports", icon: "📈" },
  ],
  manager: [
    { label: "Dashboard", path: "/manager/dashboard", icon: "📊" },
    { label: "My Interns", path: "/manager/interns", icon: "👥" },
    { label: "Tasks", path: "/manager/tasks", icon: "✅" },
    { label: "Attendance", path: "/manager/attendance", icon: "🕐" },
  ],
  intern: [
    { label: "Dashboard", path: "/intern/dashboard", icon: "📊" },
    { label: "My Tasks", path: "/intern/tasks", icon: "✅" },
    { label: "Attendance", path: "/intern/attendance", icon: "🕐" },
    { label: "Onboarding", path: "/intern/onboarding", icon: "🚀" },
  ],
};

export default function Layout({ children }) {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(true);

  // Detect system color scheme
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const items = navItems[userRole] || [];
  const t = dark ? darkTokens : lightTokens;

  return (
    <div style={{ ...styles.container, background: t.bg, color: t.text }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={styles.overlay}
        />
      )}

      {/* Sidebar */}
      <div style={{
        ...styles.sidebar,
        background: t.surface,
        borderRight: `1px solid ${t.border}`,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      }}>
        <div style={{ ...styles.logo, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ ...styles.logoText, color: t.accent }}>InternHub</span>
          <button onClick={() => setSidebarOpen(false)} style={styles.closeBtn}>✕</button>
        </div>

        <div style={{ ...styles.roleBadge, background: t.bg, color: t.accent }}>
          {userRole?.toUpperCase()} PORTAL
        </div>

        <nav style={styles.nav}>
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  ...styles.navItem,
                  background: active ? t.accent : "transparent",
                  color: active ? "#fff" : t.muted,
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={handleLogout} style={{ ...styles.logoutBtn, borderTop: `1px solid ${t.border}` }}>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {/* Topbar */}
        <div style={{
          ...styles.topbar,
          background: t.surface,
          borderBottom: `1px solid ${t.border}`,
        }}>
          <div style={styles.topbarLeft}>
            <button onClick={() => setSidebarOpen(true)} style={{ ...styles.menuBtn, color: t.muted }}>
              ☰
            </button>
            <span style={{ ...styles.pageTitle, color: t.text }}>
              {items.find((i) => i.path === location.pathname)?.label || "Dashboard"}
            </span>
          </div>
          <div style={styles.topbarRight}>
            {/* Dark/light toggle */}
            <button
              onClick={() => setDark(!dark)}
              style={{ ...styles.themeBtn, background: t.bg, color: t.muted, border: `1px solid ${t.border}` }}
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <div style={{ ...styles.avatar, background: t.accent }}>
              {currentUser?.email?.[0]?.toUpperCase()}
            </div>
            <span style={{ ...styles.email, color: t.muted }}>{currentUser?.email}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ ...styles.content, background: t.bg }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Token sets
const darkTokens = {
  bg: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  accent: "#3b82f6",
};

const lightTokens = {
  bg: "#f1f5f9",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#2563eb",
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: "240px",
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
    transition: "transform 0.25s ease",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 16px",
  },
  logoText: {
    fontWeight: "700",
    fontSize: "18px",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
  },
  roleBadge: {
    margin: "12px 16px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "1px",
    textAlign: "center",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "8px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    width: "100%",
    textAlign: "left",
    transition: "background 0.15s",
  },
  navIcon: { fontSize: "16px", flexShrink: 0 },
  navLabel: {},
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 20px",
    background: "transparent",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: "100%",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: "60px",
    flexShrink: 0,
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  menuBtn: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
  },
  pageTitle: {
    fontSize: "17px",
    fontWeight: "600",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  themeBtn: {
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "14px",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "13px",
    color: "#fff",
    flexShrink: 0,
  },
  email: {
    fontSize: "13px",
    display: "none", // hidden on mobile, shown on larger screens via inline override
  },
};