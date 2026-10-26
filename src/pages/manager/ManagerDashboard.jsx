import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../contexts/useAuth";
import Layout from "../../components/Layout";
import { notifyError, friendlyApiError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import InternProgressCard from "./components/InternProgressCard";
import AssignTaskModal from "./components/AssignTaskModal";
import WeeklyDigest from "./components/WeeklyDigest";

const emptyTask = { title: "", description: "", due_date: "", priority: "medium" };

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [newTask, setNewTask] = useState(emptyTask);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/users"), api.get("/tasks"), api.get("/attendance")])
      .then(([internsData, tasksData, attendanceData]) => {
        if (cancelled) return;
        setInterns(internsData.filter((u) => u.role === "intern"));
        setTasks(tasksData);
        setAttendance(attendanceData);
      })
      .catch((error) => {
        console.error("Dashboard load error:", error);
        notifyError(friendlyApiError(error, "Couldn't load dashboard data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!selectedIntern) {
      notifyError("Select an intern to assign this task to.");
      return;
    }
    if (!newTask.title.trim()) {
      notifyError("Task title is required.");
      return;
    }
    if (newTask.due_date && newTask.due_date < new Date().toISOString().slice(0, 10)) {
      notifyError("Due date can't be in the past.");
      return;
    }
    try {
      const task = await api.post("/tasks", {
        ...newTask,
        intern_id: selectedIntern.uid,
        manager_id: currentUser.uid,
      });
      setTasks((current) => [task, ...current]);
      closeTaskForm();
    } catch (error) {
      console.error("Assign task error:", error);
      notifyError(friendlyApiError(error, "Couldn't assign the task. Please try again."));
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks((current) => current.map((task) => (task.task_id === taskId ? updated : task)));
    } catch (error) {
      console.error("Update task status error:", error);
      notifyError(friendlyApiError(error, "Couldn't update the task. Please try again."));
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

      <WeeklyDigest interns={interns} tasks={tasks} attendance={attendance} />

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>My Interns</h3>
          {interns.length === 0 && <p style={styles.empty}>No interns assigned yet.</p>}
          {interns.map((intern) => (
            <InternProgressCard
              key={intern.uid}
              intern={intern}
              tasks={tasks.filter((t) => t.intern_id === intern.uid)}
              onAssignTask={openAssignTask}
            />
          ))}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>All Assigned Tasks</h3>
          <div style={styles.taskList}>
            {tasks.length === 0 && <p style={styles.empty}>No tasks assigned yet.</p>}
            {tasks.map((task) => {
              const intern = interns.find((i) => i.uid === task.intern_id);
              return (
                <div key={task.task_id} style={styles.taskItem}>
                  <div style={styles.taskTop}>
                    <span style={styles.taskTitle}>{task.title}</span>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
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
                    👤 {intern?.name || "Unknown"} · Due: {task.due_date} · {task.priority} priority
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
