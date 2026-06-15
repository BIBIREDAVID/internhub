import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

export default function InternDashboard() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch profile
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid))
      .then((snap) => {
        if (snap.exists()) setProfile(snap.data());
        else console.log("No user document found!");
      })
      .catch((err) => console.error("Profile fetch error:", err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Live tasks listener
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "tasks"),
      where("internId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q,
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Tasks error:", err)
    );
    return unsub;
  }, [currentUser]);

  if (loading) return (
    <Layout>
      <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading your dashboard...</div>
    </Layout>
  );

  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const progressPct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const onboardingSteps = [
    "Account Setup",
    "Sign Offer Letter",
    "Meet Your Manager",
    "Complete HR Orientation",
    "First Task Assigned",
  ];

  return (
    <Layout>
      <div style={styles.welcome}>
        <h2 style={styles.welcomeTitle}>Welcome back, {profile?.name?.split(" ")[0]} 👋</h2>
        <p style={styles.welcomeSub}>
          {profile?.department} · Cohort {profile?.cohortId} · {profile?.startDate} → {profile?.endDate}
        </p>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "In Progress", value: inProgress, color: "#3b82f6" },
          { label: "Pending", value: pending, color: "#f59e0b" },
          { label: "Total Tasks", value: tasks.length, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>My Tasks</h3>
          <div style={styles.taskList}>
            {tasks.length === 0 && <p style={styles.empty}>No tasks assigned yet.</p>}
            {tasks.map((task) => (
              <div key={task.id} style={styles.taskItem}>
                <div style={styles.taskTop}>
                  <span style={styles.taskTitle}>{task.title}</span>
                  <span style={{
                    ...styles.badge,
                    background: task.status === "completed" ? "#16a34a"
                      : task.status === "in-progress" ? "#1d4ed8" : "#92400e",
                  }}>
                    {task.status}
                  </span>
                </div>
                <p style={styles.taskDesc}>{task.description}</p>
                <div style={styles.taskBottom}>
                  <span style={styles.taskMeta}>Due: {task.dueDate}</span>
                  <span style={{
                    ...styles.priorityDot,
                    background: task.priority === "high" ? "#ef4444"
                      : task.priority === "medium" ? "#f59e0b" : "#64748b",
                  }} />
                  <span style={styles.taskMeta}>{task.priority} priority</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Overall Progress</h3>
            <div style={styles.progressWrap}>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
              </div>
              <span style={styles.progressPct}>{progressPct}%</span>
            </div>
            <p style={styles.progressSub}>{completed} of {tasks.length} tasks completed</p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Onboarding Progress</h3>
            <div style={styles.stepList}>
              {onboardingSteps.map((step, i) => {
                const done = i < (profile?.onboardingStep || 0);
                const current = i === (profile?.onboardingStep || 0);
                return (
                  <div key={step} style={styles.step}>
                    <div style={{
                      ...styles.stepDot,
                      background: done ? "#22c55e" : current ? "#3b82f6" : "#334155",
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{
                      ...styles.stepLabel,
                      color: done ? "#22c55e" : current ? "#f1f5f9" : "#64748b",
                    }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  welcome: { marginBottom: "24px" },
  welcomeTitle: { fontSize: "22px", fontWeight: "700", margin: 0 },
  welcomeSub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    border: "1px solid #334155",
  },
  statValue: { fontSize: "32px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "16px",
  },
  card: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
    marginBottom: "16px",
  },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  taskList: { display: "flex", flexDirection: "column", gap: "12px" },
  taskItem: {
    background: "#0f172a",
    borderRadius: "8px",
    padding: "14px",
    border: "1px solid #334155",
  },
  taskTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  taskTitle: { fontWeight: "600", fontSize: "14px" },
  badge: {
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#fff",
  },
  taskDesc: { color: "#64748b", fontSize: "13px", margin: "0 0 8px 0" },
  taskBottom: { display: "flex", alignItems: "center", gap: "6px" },
  taskMeta: { color: "#475569", fontSize: "12px" },
  priorityDot: { width: "6px", height: "6px", borderRadius: "50%" },
  rightCol: { display: "flex", flexDirection: "column" },
  progressWrap: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" },
  progressBar: { flex: 1, height: "8px", background: "#334155", borderRadius: "4px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#3b82f6", borderRadius: "4px", transition: "width 0.3s ease" },
  progressPct: { color: "#3b82f6", fontWeight: "700", fontSize: "14px" },
  progressSub: { color: "#64748b", fontSize: "13px", margin: 0 },
  stepList: { display: "flex", flexDirection: "column", gap: "12px" },
  step: { display: "flex", alignItems: "center", gap: "10px" },
  stepDot: {
    width: "24px", height: "24px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700", color: "#fff", flexShrink: 0,
  },
  stepLabel: { fontSize: "13px", fontWeight: "500" },
  empty: { color: "#64748b", fontSize: "13px" },
};