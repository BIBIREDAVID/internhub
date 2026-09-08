import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/useTheme";
import Toaster from "./Toaster";
import { theme } from "../theme";

const navItems = {
  hr: [
    { section: "OVERVIEW", items: [
      { label: "Dashboard", path: "/hr/dashboard", icon: "⊞" },
    ]},
    { section: "RECRUITMENT", items: [
      { label: "Applications", path: "/hr/applications", icon: "📋", badge: null },
      { label: "Hiring Pipeline", path: "/hr/pipeline", icon: "⋯" },
    ]},
    { section: "WORKFORCE", items: [
      { label: "All Interns", path: "/hr/interns", icon: "👤" },
      { label: "Invites", path: "/hr/invites", icon: "✉️" },
      { label: "Onboarding", path: "/hr/onboarding", icon: "🚀", badge: null },
      { label: "Attendance", path: "/hr/attendance", icon: "🕐" },
    ]},
    { section: "ANALYTICS", items: [
      { label: "Reports", path: "/hr/reports", icon: "📈" },
      { label: "Activity Log", path: "/hr/activity", icon: "📜" },
    ]},
  ],
  manager: [
    { section: "OVERVIEW", items: [
      { label: "Dashboard", path: "/manager/dashboard", icon: "⊞" },
    ]},
    { section: "WORKFORCE", items: [
      { label: "My Interns", path: "/manager/interns", icon: "👤" },
      { label: "Tasks", path: "/manager/tasks", icon: "✅" },
      { label: "Attendance", path: "/manager/attendance", icon: "🕐" },
    ]},
  ],
  intern: [
    { section: "OVERVIEW", items: [
      { label: "Dashboard", path: "/intern/dashboard", icon: "⊞" },
    ]},
    { section: "MY WORK", items: [
      { label: "My Tasks", path: "/intern/tasks", icon: "✅" },
      { label: "Attendance", path: "/intern/attendance", icon: "🕐" },
      { label: "Onboarding", path: "/intern/onboarding", icon: "🚀" },
    ]},
  ],
};

export default function Layout({ children, topbarActions, pageTitle }) {
  const { currentUser, userRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the mobile nav drawer on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const sections = navItems[userRole] || [];

  // Find current page label
  let currentLabel = pageTitle || "Dashboard";
  sections.forEach(s => s.items.forEach(i => {
    if (i.path === location.pathname) currentLabel = pageTitle || i.label;
  }));

  return (
    <div style={{ ...s.root, background: theme.bg, color: theme.text }}>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={s.overlay} />}

      {/* Sidebar */}
      <div style={{
        ...s.sidebar,
        background: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      }}>
        {/* Logo */}
        <div style={{ ...s.logoWrap, borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <div style={{ ...s.logoText, color: theme.primary }}>InternHub</div>
            <div style={{ ...s.logoSub, color: theme.muted }}>
              {userRole === "hr" ? "HR Administration" : userRole === "manager" ? "Team Management" : "Intern Portal"}
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ ...s.closeBtn, color: theme.muted }}>✕</button>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {sections.map((section) => (
            <div key={section.section} style={s.navSection}>
              <div style={{ ...s.sectionLabel, color: theme.muted }}>{section.section}</div>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      ...s.navItem,
                      background: active ? theme.primary + "18" : "transparent",
                      color: active ? theme.primary : theme.text,
                      fontWeight: active ? "600" : "400",
                      borderLeft: active ? `3px solid ${theme.primary}` : "3px solid transparent",
                    }}
                  >
                    <span style={s.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span style={{ ...s.badge, background: theme.primary }}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ ...s.userWrap, borderTop: `1px solid ${theme.border}` }}>
          <div style={{ ...s.userAvatar, background: theme.primary }}>
            {currentUser?.email?.[0]?.toUpperCase()}
          </div>
          <div style={s.userInfo}>
            <div style={{ ...s.userName, color: theme.text }}>{currentUser?.email?.split("@")[0]}</div>
            <div style={{ ...s.userRole, color: theme.muted }}>{userRole === "hr" ? "HR Manager" : userRole === "manager" ? "Team Manager" : "Intern"}</div>
          </div>
          <button onClick={handleLogout} style={{ ...s.logoutBtn, color: theme.muted }} title="Logout">⏻</button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={{
          ...s.topbar,
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={s.topbarLeft}>
            <button onClick={() => setSidebarOpen(true)} style={{ ...s.menuBtn, color: theme.muted }}>☰</button>
            <h1 style={{ ...s.pageTitle, color: theme.text }}>{currentLabel}</h1>
          </div>
          <div style={s.topbarRight}>
            <button
              onClick={toggleTheme}
              style={{ ...s.themeBtn, background: theme.bg, color: theme.muted, border: `1px solid ${theme.border}` }}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            {topbarActions}
          </div>
        </div>

        {/* Content */}
        <div style={{ ...s.content, background: theme.bg }}>
          {children}
        </div>
      </div>

      <Toaster />
    </div>
  );
}

const s = {
  root: { display: "flex", height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10 },
  sidebar: { position: "fixed", top: 0, left: 0, height: "100vh", width: "220px", display: "flex", flexDirection: "column", zIndex: 20, transition: "transform 0.25s ease" },
  logoWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px" },
  logoText: { fontSize: "17px", fontWeight: "700" },
  logoSub: { fontSize: "11px", marginTop: "2px" },
  closeBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" },
  nav: { flex: 1, overflowY: "auto", padding: "8px 0" },
  navSection: { marginBottom: "8px" },
  sectionLabel: { fontSize: "10px", fontWeight: "600", letterSpacing: "0.8px", padding: "8px 16px 4px" },
  navItem: { display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 16px", border: "none", cursor: "pointer", fontSize: "13.5px", textAlign: "left", transition: "all 0.15s" },
  navIcon: { fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 },
  badge: { marginLeft: "auto", minWidth: "18px", height: "18px", borderRadius: "9px", fontSize: "10px", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" },
  userWrap: { display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px" },
  userAvatar: { width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", color: "#fff", flexShrink: 0 },
  userInfo: { flex: 1, overflow: "hidden" },
  userName: { fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: "11px", marginTop: "1px" },
  logoutBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: "58px", flexShrink: 0 },
  topbarLeft: { display: "flex", alignItems: "center", gap: "12px" },
  menuBtn: { background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px", lineHeight: 1 },
  pageTitle: { fontSize: "18px", fontWeight: "600", margin: 0 },
  topbarRight: { display: "flex", alignItems: "center", gap: "10px" },
  themeBtn: { borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "14px" },
  content: { flex: 1, overflow: "auto", padding: "24px" },
};
