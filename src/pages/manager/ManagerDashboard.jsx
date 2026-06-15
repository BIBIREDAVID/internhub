import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "", description: "", dueDate: "", priority: "medium"
  });

  // Fetch interns — single where clause, filter role client-side
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users"),
      where("managerId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInterns(all.filter((u) => u.role === "intern"));
        setLoading(false);
      },
      (err) => { console.error("Interns error:", err); setLoading(false); }
    );
    return unsub;
  }, [currentUser]);

  // Fetch tasks
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "tasks"),
      where("managerId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q,
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Tasks error:", err)
    );
    return unsub;
  }, [currentUser]);

  async function handleAssignTask(e) {
    e.preventDefault();
    if (!selectedIntern) return;
    await addDoc(collection(db, "tasks"), {
      ...newTask,
      internId: selectedIntern.id,
      managerId: currentUser.uid,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    setNewTask({ title: "", description: "", dueDate: "", priority: "medium" });
    setShowTaskForm(false);
    setSelectedIntern(null);
  }

  async function handleStatusChange(taskId, newStatus) {
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
  }

  if (loading) return (
    <Layout>
      <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center" }}>Loading...</div>
    </Layout>
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Manager Dashboard</h2>
          <p style={styles.sub}>{interns.length} intern{interns.length !== 1 ? "s" : ""} under your supervision</p>
        </div>
        <button onClick={() => setShowTaskForm(true)} style={styles.primaryBtn}>
          + Assign Task
        </button>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Total Interns", value: interns.length, color: "#3b82f6" },
          { label: "Tasks Assigned", value: totalTasks, color: "#a855f7" },
          { label: "Tasks Completed", value: completedTasks, color: "#22c55e" },
          { label: "Completion Rate", value: totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%", color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>My Interns</h3>
          {interns.length === 0 && <p style={styles.empty}>No interns assigned yet.</p>}
          {interns.map((intern) => {
            const internTasks = tasks.filter((t) => t.internId === intern.id);
            const internCompleted = internTasks.filter((t) => t.status === "completed").length;
            const pct = internTasks.length ? Math.round((internCompleted / internTasks.length) * 100) : 0;
            return (
              <div key={intern.id} style={styles.internCard}>
                <div style={styles.internTop}>
                  <div style={styles.internAvatar}>
                    {intern.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={styles.internInfo}>
                    <div style={styles.internName}>{intern.name}</div>
                    <div style={styles.internMeta}>{intern.department} · {intern.email}</div>
                  </div>
                  <button
                    onClick={() => { setSelectedIntern(intern); setShowTaskForm(true); }}
                    style={styles.assignBtn}
                  >
                    Assign Task
                  </button>
                </div>
                <div style={styles.progressWrap}>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                  </div>
                  <span style={styles.progressPct}>{pct}%</span>
                </div>
                <div style={styles.internStats}>
                  <span style={styles.internStat}>{internTasks.length} tasks</span>
                  <span style={styles.internStat}>{internCompleted} completed</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>All Assigned Tasks</h3>
          <div style={styles.taskList}>
            {tasks.length === 0 && <p style={styles.empty}>No tasks assigned yet.</p>}
            {tasks.map((task) => {
              const intern = interns.find((i) => i.id === task.internId);
              return (
                <div key={task.id} style={styles.taskItem}>
                  <div style={styles.taskTop}>
                    <span style={styles.taskTitle}>{task.title}</span>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        background: task.status === "completed" ? "#16a34a"
                          : task.status === "in-progress" ? "#1d4ed8" : "#92400e",
                      }}
                    >
                      <option value="pending">pending</option>
                      <option value="in-progress">in-progress</option>
                      <option value="completed">completed</option>
                    </select>
                  </div>
                  <div style={styles.taskMeta}>
                    👤 {intern?.name || "Unknown"} · Due: {task.dueDate} · {task.priority} priority
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showTaskForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Assign Task{selectedIntern ? ` to ${selectedIntern.name}` : ""}
            </h3>

            {!selectedIntern && (
              <div style={styles.field}>
                <label style={styles.label}>Select Intern</label>
                <select
                  style={styles.input}
                  onChange={(e) => setSelectedIntern(interns.find(i => i.id === e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>Choose an intern...</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Task Title</label>
              <input
                style={styles.input}
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="e.g. Build login page"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                style={{ ...styles.input, height: "80px", resize: "vertical" }}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task details..."
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                style={styles.input}
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Priority</label>
              <select
                style={styles.input}
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div style={styles.modalBtns}>
              <button onClick={() => { setShowTaskForm(false); setSelectedIntern(null); }} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleAssignTask} style={styles.primaryBtn}>
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  primaryBtn: {
    padding: "10px 20px", background: "#3b82f6", color: "#fff",
    border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px",
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px", marginBottom: "24px",
  },
  statCard: {
    background: "#1e293b", borderRadius: "12px", padding: "20px",
    textAlign: "center", border: "1px solid #334155",
  },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  internCard: {
    background: "#0f172a", borderRadius: "8px", padding: "14px",
    border: "1px solid #334155", marginBottom: "12px",
  },
  internTop: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  internAvatar: {
    width: "36px", height: "36px", borderRadius: "50%", background: "#3b82f6",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "700", fontSize: "14px", color: "#fff", flexShrink: 0,
  },
  internInfo: { flex: 1 },
  internName: { fontWeight: "600", fontSize: "14px", color: "#f1f5f9" },
  internMeta: { color: "#64748b", fontSize: "12px", marginTop: "2px" },
  assignBtn: {
    padding: "6px 12px", background: "transparent", border: "1px solid #334155",
    color: "#94a3b8", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
  },
  progressWrap: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  progressBar: { flex: 1, height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#3b82f6", borderRadius: "3px" },
  progressPct: { color: "#3b82f6", fontWeight: "700", fontSize: "12px" },
  internStats: { display: "flex", gap: "12px" },
  internStat: { color: "#64748b", fontSize: "12px" },
  taskList: { display: "flex", flexDirection: "column", gap: "10px" },
  taskItem: { background: "#0f172a", borderRadius: "8px", padding: "12px", border: "1px solid #334155" },
  taskTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  taskTitle: { fontWeight: "600", fontSize: "13px", color: "#f1f5f9" },
  statusSelect: {
    padding: "2px 8px", borderRadius: "20px", border: "none",
    color: "#fff", fontSize: "11px", fontWeight: "600", cursor: "pointer",
  },
  taskMeta: { color: "#64748b", fontSize: "12px" },
  empty: { color: "#64748b", fontSize: "13px" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
  },
  modal: {
    background: "#1e293b", borderRadius: "16px", padding: "28px",
    width: "100%", maxWidth: "460px", border: "1px solid #334155",
  },
  modalTitle: { fontSize: "17px", fontWeight: "700", margin: "0 0 20px 0", color: "#f1f5f9" },
  field: { marginBottom: "14px" },
  label: { display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px", fontWeight: "500" },
  input: {
    width: "100%", padding: "10px 12px", background: "#0f172a",
    border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9",
    fontSize: "14px", boxSizing: "border-box",
  },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: {
    padding: "10px 20px", background: "transparent", border: "1px solid #334155",
    color: "#94a3b8", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
  },
};