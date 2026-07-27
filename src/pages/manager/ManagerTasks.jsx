import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

const emptyTask = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
  status: "pending",
};

export default function ManagerTasks() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedInternId, setSelectedInternId] = useState("");
  const [form, setForm] = useState(emptyTask);

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

    return () => {
      unsubInterns();
      unsubTasks();
    };
  }, [currentUser]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => filter === "all" || task.status === filter);
  }, [filter, tasks]);

  function openCreate(internId = "") {
    setEditingTask(null);
    setSelectedInternId(internId);
    setForm(emptyTask);
    setShowModal(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setSelectedInternId(task.internId || "");
    setForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "medium",
      status: task.status || "pending",
    });
    setShowModal(true);
  }

  async function saveTask() {
    const payload = {
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      internId: selectedInternId,
      managerId: currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    if (editingTask) {
      await updateDoc(doc(db, "tasks", editingTask.id), payload);
    } else {
      await addDoc(collection(db, "tasks"), {
        ...payload,
        createdAt: new Date().toISOString(),
      });
    }

    setShowModal(false);
    setEditingTask(null);
    setSelectedInternId("");
    setForm(emptyTask);
  }

  async function changeStatus(taskId, status) {
    await updateDoc(doc(db, "tasks", taskId), { status, updatedAt: new Date().toISOString() });
  }

  async function removeTask(taskId) {
    await deleteDoc(doc(db, "tasks", taskId));
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;

  if (loading) {
    return (
      <Layout pageTitle="Tasks">
        <div style={styles.loading}>Loading tasks...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Tasks">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Tasks</h2>
          <p style={styles.sub}>Create, edit, and update the work assigned to your interns.</p>
        </div>
        <button onClick={() => openCreate()} style={styles.primaryBtn}>+ New Task</button>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Total Tasks", value: tasks.length, color: "#3b82f6" },
          { label: "In Progress", value: inProgress, color: "#f59e0b" },
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "Open", value: tasks.length - completed, color: "#a855f7" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.toolbar}>
        {["all", "pending", "in-progress", "completed"].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              ...styles.filterBtn,
              background: filter === value ? "#3b82f6" : "#1e293b",
              color: filter === value ? "#fff" : "#94a3b8",
              borderColor: filter === value ? "#3b82f6" : "#334155",
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Task Board</div>
        <div style={styles.taskList}>
          {visibleTasks.length === 0 ? (
            <p style={styles.empty}>No tasks match this filter.</p>
          ) : (
            visibleTasks.map((task) => {
              const intern = interns.find((item) => item.id === task.internId);
              return (
                <div key={task.id} style={styles.taskCard}>
                  <div style={styles.taskTop}>
                    <div>
                      <div style={styles.taskTitle}>{task.title}</div>
                      <div style={styles.taskMeta}>
                        {intern?.name || "No intern"} · Due {task.dueDate || "unscheduled"} · {task.priority || "medium"} priority
                      </div>
                    </div>
                    <select
                      value={task.status || "pending"}
                      onChange={(event) => changeStatus(task.id, event.target.value)}
                      style={{
                        ...styles.statusSelect,
                        background:
                          task.status === "completed"
                            ? "#166534"
                            : task.status === "in-progress"
                              ? "#1d4ed8"
                              : "#92400e",
                      }}
                    >
                      <option value="pending">pending</option>
                      <option value="in-progress">in-progress</option>
                      <option value="completed">completed</option>
                    </select>
                  </div>
                  <div style={styles.taskDesc}>{task.description || "No description provided."}</div>
                  <div style={styles.taskActions}>
                    <button onClick={() => openEdit(task)} style={styles.actionBtn}>Edit</button>
                    <button onClick={() => removeTask(task.id)} style={styles.dangerBtn}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingTask ? "Edit Task" : "Create Task"}</h3>

            <div style={styles.field}>
              <label style={styles.label}>Assign To</label>
              <select
                value={selectedInternId}
                onChange={(event) => setSelectedInternId(event.target.value)}
                style={styles.input}
              >
                <option value="">Choose an intern</option>
                {interns.map((intern) => (
                  <option key={intern.id} value={intern.id}>{intern.name || intern.email}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Title</label>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ ...styles.input, height: "90px", resize: "vertical" }} />
            </div>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Priority</label>
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} style={styles.input}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Status</label>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={styles.input}>
                <option value="pending">pending</option>
                <option value="in-progress">in-progress</option>
                <option value="completed">completed</option>
              </select>
            </div>
            <div style={styles.modalBtns}>
              <button onClick={() => { setShowModal(false); setEditingTask(null); setSelectedInternId(""); setForm(emptyTask); }} style={styles.cancelBtn}>Cancel</button>
              <button onClick={saveTask} disabled={!selectedInternId || !form.title} style={styles.primaryBtn}>{editingTask ? "Save Changes" : "Create Task"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

const styles = {
  loading: { color: "#94a3b8", padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  primaryBtn: { padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#1e293b", borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #334155" },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  taskList: { display: "flex", flexDirection: "column", gap: "12px" },
  taskCard: { background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  taskTop: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  taskTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  taskMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "4px" },
  taskDesc: { color: "#cbd5e1", fontSize: "13px", marginTop: "10px", lineHeight: 1.5 },
  statusSelect: { border: "none", color: "#fff", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", fontWeight: "700" },
  taskActions: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" },
  actionBtn: { padding: "7px 10px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  dangerBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #b91c1c", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { background: "#1e293b", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "520px", border: "1px solid #334155" },
  modalTitle: { fontSize: "17px", fontWeight: "700", margin: "0 0 20px 0", color: "#f1f5f9" },
  field: { marginBottom: "14px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  label: { display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px", fontWeight: "500" },
  input: { width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9", fontSize: "14px", boxSizing: "border-box" },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: { padding: "10px 20px", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
};
