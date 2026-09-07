import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

export default function InternTasks() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const profileUnsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error("Profile load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load your profile."));
        setLoading(false);
      }
    );

    const tasksQuery = query(collection(db, "tasks"), where("internId", "==", currentUser.uid));
    const tasksUnsub = onSnapshot(
      tasksQuery,
      (snapshot) => {
        setTasks(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      },
      (error) => {
        console.error("Tasks load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load tasks."));
      }
    );

    return () => {
      profileUnsub();
      tasksUnsub();
    };
  }, [currentUser]);

  const filteredTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks]
  );

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((left, right) => {
        const leftDate = new Date(left.dueDate || "9999-12-31");
        const rightDate = new Date(right.dueDate || "9999-12-31");
        return leftDate - rightDate;
      }),
    [filteredTasks]
  );

  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;
  const pending = tasks.filter((task) => task.status === "pending").length;
  const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  async function updateStatus(taskId, status) {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status });
    } catch (error) {
      console.error("Update task status error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't update the task. Please try again."));
    }
  }

  if (loading) {
    return (
      <Layout pageTitle="My Tasks">
        <div style={styles.loading}>Loading your tasks...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Tasks">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>My Tasks</h2>
          <p style={styles.sub}>
            {profile?.name ? `${profile.name} · ` : ""}
            Track every task assigned to you and update progress as you go.
          </p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Completed", value: completed, color: theme.success },
          { label: "In Progress", value: inProgress, color: theme.primary },
          { label: "Pending", value: pending, color: theme.warning },
          { label: "Completion Rate", value: `${completionRate}%`, color: theme.info },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.toolbar}>
        {filterOptions.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              style={{
                ...styles.filterBtn,
                background: active ? theme.primary : theme.surface,
                color: active ? "#fff" : theme.muted,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={styles.card}>
        {sortedTasks.length === 0 ? (
          <p style={styles.empty}>No tasks match this filter yet.</p>
        ) : (
          <div style={styles.list}>
            {sortedTasks.map((task) => (
              <div key={task.id} style={styles.taskItem}>
                <div style={styles.taskTop}>
                  <div>
                    <div style={styles.taskTitle}>{task.title || "Untitled task"}</div>
                    <div style={styles.taskMeta}>{task.description || "No description provided."}</div>
                  </div>
                  <select
                    value={task.status || "pending"}
                    onChange={(event) => updateStatus(task.id, event.target.value)}
                    style={{
                      ...styles.statusSelect,
                      background:
                        task.status === "completed"
                          ? theme.successSoft
                          : task.status === "in-progress"
                            ? "#1d4ed8"
                            : theme.warningSoft,
                    }}
                  >
                    <option value="pending">pending</option>
                    <option value="in-progress">in-progress</option>
                    <option value="completed">completed</option>
                  </select>
                </div>

                <div style={styles.taskBottom}>
                  <span style={styles.metaPill}>Due {task.dueDate || "unscheduled"}</span>
                  <span style={styles.metaPill}>{task.priority || "medium"} priority</span>
                  {task.managerId && <span style={styles.metaPill}>Assigned by manager</span>}
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
  loading: { color: theme.muted, padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: theme.surface,
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    border: "1px solid #334155",
  },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: theme.faint, fontSize: "13px" },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "16px",
  },
  filterBtn: {
    borderRadius: "999px",
    border: "1px solid",
    padding: "8px 14px",
    fontSize: "13px",
    cursor: "pointer",
  },
  card: {
    background: theme.surface,
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
  },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  taskItem: {
    background: theme.bg,
    borderRadius: "10px",
    padding: "14px",
    border: "1px solid #334155",
  },
  taskTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },
  taskTitle: { fontWeight: "700", fontSize: "14px", color: theme.text },
  taskMeta: { color: theme.muted, fontSize: "13px", marginTop: "4px", lineHeight: 1.5 },
  statusSelect: {
    border: "none",
    color: "#fff",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "700",
  },
  taskBottom: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" },
  metaPill: {
    padding: "4px 10px",
    borderRadius: "999px",
    background: theme.border,
    color: "#cbd5e1",
    fontSize: "11px",
  },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
