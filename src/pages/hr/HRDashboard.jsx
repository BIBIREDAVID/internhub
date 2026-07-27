import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

export default function HRDashboard() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Users error:", error);
        setLoading(false);
      }
    );

    const unsubscribeTasks = onSnapshot(
      collection(db, "tasks"),
      (snapshot) => setTasks(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
      (error) => console.error("Tasks error:", error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, []);

  const interns = useMemo(() => users.filter((user) => user.role === "intern"), [users]);
  const managers = useMemo(() => users.filter((user) => user.role === "manager"), [users]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks]);
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task) => {
      if (!task.dueDate || task.status === "completed") {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    });
  }, [tasks]);

  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const recentTasks = [...tasks]
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 5);
  const recentInterns = [...interns].slice(0, 5);

  if (loading) {
    return (
      <Layout pageTitle="HR Dashboard">
        <div style={styles.loading}>Loading HR data...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="HR Dashboard">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>HR Dashboard</h2>
          <p style={styles.sub}>
            Welcome back{currentUser?.email ? `, ${currentUser.email}` : ""}. Here’s the current team snapshot.
          </p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Interns", value: interns.length, color: "#3b82f6" },
          { label: "Managers", value: managers.length, color: "#a855f7" },
          { label: "Active Tasks", value: activeTasks.length, color: "#f59e0b" },
          { label: "Completion Rate", value: `${completionRate}%`, color: "#22c55e" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Interns</h3>
          {recentInterns.length === 0 ? (
            <p style={styles.empty}>No intern records yet.</p>
          ) : (
            <div style={styles.list}>
              {recentInterns.map((intern) => (
                <div key={intern.id} style={styles.row}>
                  <div style={styles.avatar}>{intern.name?.[0]?.toUpperCase() || "I"}</div>
                  <div style={styles.rowMain}>
                    <div style={styles.rowTitle}>{intern.name || "Unnamed intern"}</div>
                    <div style={styles.rowMeta}>
                      {intern.department || "No department"} · {intern.email || "No email"}
                    </div>
                  </div>
                  <div style={styles.pill}>{intern.cohortId ? `Cohort ${intern.cohortId}` : "Intern"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Tasks</h3>
          {recentTasks.length === 0 ? (
            <p style={styles.empty}>No tasks assigned yet.</p>
          ) : (
            <div style={styles.list}>
              {recentTasks.map((task) => {
                const intern = interns.find((user) => user.id === task.internId);
                return (
                  <div key={task.id} style={styles.taskItem}>
                    <div style={styles.taskTop}>
                      <div>
                        <div style={styles.rowTitle}>{task.title || "Untitled task"}</div>
                        <div style={styles.rowMeta}>
                          {intern?.name || "Unknown intern"} · Due {task.dueDate || "unscheduled"}
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.status,
                          background:
                            task.status === "completed"
                              ? "#166534"
                              : task.status === "in-progress"
                                ? "#1d4ed8"
                                : "#92400e",
                        }}
                      >
                        {task.status || "pending"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Attention Needed</h3>
        {overdueTasks.length === 0 ? (
          <p style={styles.empty}>No overdue tasks right now.</p>
        ) : (
          <div style={styles.list}>
            {overdueTasks.map((task) => (
              <div key={task.id} style={styles.row}>
                <div style={styles.avatar}>!</div>
                <div style={styles.rowMain}>
                  <div style={styles.rowTitle}>{task.title || "Untitled task"}</div>
                  <div style={styles.rowMeta}>Due date passed: {task.dueDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "16px" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#0f172a",
    borderRadius: "8px",
    padding: "12px",
    border: "1px solid #334155",
  },
  taskItem: {
    background: "#0f172a",
    borderRadius: "8px",
    padding: "12px",
    border: "1px solid #334155",
  },
  taskTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: "600", fontSize: "14px", color: "#f1f5f9" },
  rowMeta: { color: "#64748b", fontSize: "12px", marginTop: "2px" },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "14px",
    color: "#fff",
    flexShrink: 0,
  },
  pill: {
    marginLeft: "auto",
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#334155",
    color: "#cbd5e1",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  status: {
    padding: "2px 10px",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  empty: { color: "#64748b", fontSize: "13px" },
};
