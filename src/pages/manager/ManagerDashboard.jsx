import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import InternProgressCard from "./components/InternProgressCard";
import AssignTaskModal from "./components/AssignTaskModal";

const emptyTask = { title: "", description: "", dueDate: "", priority: "medium" };

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [newTask, setNewTask] = useState(emptyTask);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users"), where("managerId", "==", currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInterns(all.filter((u) => u.role === "intern"));
        setLoading(false);
      },
      (error) => {
        console.error("Interns error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load your interns."));
        setLoading(false);
      }
    );
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "tasks"), where("managerId", "==", currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error("Tasks error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load tasks."));
      }
    );
    return unsub;
  }, [currentUser]);

  function openAssignTask(intern) {
    setSelectedIntern(intern);
    setShowTaskForm(true);
  }

  function closeTaskForm() {
    setShowTaskForm(false);
    setSelectedIntern(null);
    setNewTask(emptyTask);
  }

  async function handleAssignTask() {
    if (!selectedIntern) return;
    try {
      await addDoc(collection(db, "tasks"), {
        ...newTask,
        internId: selectedIntern.id,
        managerId: currentUser.uid,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      closeTaskForm();
    } catch (error) {
      console.error("Assign task error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't assign the task. Please try again."));
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    } catch (error) {
      console.error("Update task status error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't update the task. Please try again."));
    }
  }

  if (loading) {
    return (
      <Layout>
        <PageSkeleton stats={4} rows={3} />
      </Layout>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Manager Dashboard</h2>
          <p style={styles.sub}>{interns.length} intern{interns.length !== 1 ? "s" : ""} under your supervision</p>
        </div>
        <button onClick={() => setShowTaskForm(true)} style={styles.primaryBtn}>+ Assign Task</button>
      </div>

      <StatsRow
        items={[
          { label: "Total Interns", value: interns.length, color: theme.primary },
          { label: "Tasks Assigned", value: totalTasks, color: theme.info },
          { label: "Tasks Completed", value: completedTasks, color: theme.success },
          { label: "Completion Rate", value: totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%", color: theme.warning },
        ]}
      />

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>My Interns</h3>
          {interns.length === 0 && <p style={styles.empty}>No interns assigned yet.</p>}
          {interns.map((intern) => (
            <InternProgressCard
              key={intern.id}
              intern={intern}
              tasks={tasks.filter((t) => t.internId === intern.id)}
              onAssignTask={openAssignTask}
            />
          ))}
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
                        background: task.status === "completed" ? theme.successStrong
                          : task.status === "in-progress" ? "#1d4ed8" : theme.warningSoft,
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
        <AssignTaskModal
          interns={interns}
          selectedIntern={selectedIntern}
          onSelectIntern={setSelectedIntern}
          task={newTask}
          onChangeTask={setNewTask}
          onCancel={closeTaskForm}
          onSubmit={handleAssignTask}
        />
      )}
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  primaryBtn: { padding: "10px 20px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  taskList: { display: "flex", flexDirection: "column", gap: "10px" },
  taskItem: { background: theme.bg, borderRadius: "8px", padding: "12px", border: `1px solid ${theme.border}` },
  taskTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  taskTitle: { fontWeight: "600", fontSize: "13px", color: theme.text },
  statusSelect: { padding: "2px 8px", borderRadius: "20px", border: "none", color: "#fff", fontSize: "11px", fontWeight: "600", cursor: "pointer" },
  taskMeta: { color: theme.faint, fontSize: "12px" },
  empty: { color: theme.faint, fontSize: "13px" },
};
