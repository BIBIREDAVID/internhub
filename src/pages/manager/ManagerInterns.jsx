import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

export default function ManagerInterns() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const internsQuery = query(collection(db, "users"), where("managerId", "==", currentUser.uid));
    const tasksQuery = query(collection(db, "tasks"), where("managerId", "==", currentUser.uid));

    const unsubInterns = onSnapshot(internsQuery, (snapshot) => {
      setInterns(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      setLoading(false);
    });

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      setAttendance(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
    });

    return () => {
      unsubInterns();
      unsubTasks();
      unsubAttendance();
    };
  }, [currentUser]);

  const today = new Date().toISOString().slice(0, 10);

  const internRows = useMemo(() => {
    return interns.map((intern) => {
      const internTasks = tasks.filter((task) => task.internId === intern.id);
      const completedTasks = internTasks.filter((task) => task.status === "completed");
      const currentAttendance = attendance.find((record) => record.internId === intern.id && record.date === today);
      const attendanceRecords = attendance.filter((record) => record.internId === intern.id);
      const activeStep = intern.onboardingStep ?? 0;
      const onboardingPct = Math.round((activeStep / 5) * 100);
      const taskPct = internTasks.length ? Math.round((completedTasks.length / internTasks.length) * 100) : 0;

      return {
        ...intern,
        internTasks,
        completedTasks,
        currentAttendance,
        attendanceRecords,
        onboardingPct,
        taskPct,
      };
    });
  }, [attendance, interns, tasks, today]);

  const stats = useMemo(() => {
    const active = internRows.filter((intern) => intern.currentAttendance?.status === "present" || intern.currentAttendance?.status === "late").length;
    const taskCompletion = internRows.length
      ? Math.round(internRows.reduce((sum, intern) => sum + intern.taskPct, 0) / internRows.length)
      : 0;
    const fullyOnboarded = internRows.filter((intern) => (intern.onboardingStep ?? 0) >= 5).length;
    return { active, taskCompletion, fullyOnboarded };
  }, [internRows]);

  if (loading) {
    return (
      <Layout pageTitle="My Interns">
        <div style={styles.loading}>Loading interns...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Interns">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>My Interns</h2>
          <p style={styles.sub}>Track progress, onboarding, and daily attendance for your assigned interns.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Assigned Interns", value: internRows.length, color: "#3b82f6" },
          { label: "Active Today", value: stats.active, color: "#22c55e" },
          { label: "Avg Task Progress", value: `${stats.taskCompletion}%`, color: "#a855f7" },
          { label: "Fully Onboarded", value: stats.fullyOnboarded, color: "#f59e0b" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Intern Progress</div>
        <div style={styles.list}>
          {internRows.length === 0 ? (
            <p style={styles.empty}>No interns assigned yet.</p>
          ) : (
            internRows.map((intern) => (
              <div key={intern.id} style={styles.row}>
                <div style={styles.avatar}>{intern.name?.[0]?.toUpperCase() || "I"}</div>
                <div style={styles.rowMain}>
                  <div style={styles.rowHeader}>
                    <div>
                      <div style={styles.rowTitle}>{intern.name || "Unnamed intern"}</div>
                      <div style={styles.rowMeta}>
                        {intern.department || "No department"} · {intern.email || "No email"}
                      </div>
                    </div>
                    <div style={styles.quickActions}>
                      <button onClick={() => navigate("/manager/tasks")} style={styles.quickBtn}>Assign Task</button>
                      <button onClick={() => navigate("/manager/attendance")} style={styles.quickBtnSecondary}>Attendance</button>
                    </div>
                  </div>

                  <div style={styles.progressGrid}>
                    <div>
                      <div style={styles.progressLabel}>Tasks</div>
                      <div style={styles.barWrap}>
                        <div style={{ ...styles.barFill, width: `${intern.taskPct}%` }} />
                      </div>
                      <div style={styles.progressText}>{intern.taskPct}% complete</div>
                    </div>
                    <div>
                      <div style={styles.progressLabel}>Onboarding</div>
                      <div style={styles.barWrap}>
                        <div style={{ ...styles.barFill, width: `${intern.onboardingPct}%` }} />
                      </div>
                      <div style={styles.progressText}>{intern.onboardingPct}% complete</div>
                    </div>
                  </div>

                  <div style={styles.badges}>
                    <span style={styles.badge}>{intern.internTasks.length} tasks</span>
                    <span style={styles.badge}>{intern.completedTasks.length} completed</span>
                    <span style={styles.badge}>
                      Today: {intern.currentAttendance?.status || "no record"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  loading: { color: "#94a3b8", padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    gap: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#3b82f6",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    flexShrink: 0,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  quickActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  quickBtn: {
    padding: "7px 10px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  quickBtnSecondary: {
    padding: "7px 10px",
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  progressGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" },
  progressLabel: { color: "#94a3b8", fontSize: "12px", marginBottom: "6px" },
  barWrap: { height: "8px", background: "#334155", borderRadius: "999px", overflow: "hidden" },
  barFill: { height: "100%", background: "#3b82f6", borderRadius: "999px" },
  progressText: { color: "#94a3b8", fontSize: "12px", marginTop: "6px" },
  badges: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#334155",
    color: "#cbd5e1",
    fontSize: "11px",
  },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
};
