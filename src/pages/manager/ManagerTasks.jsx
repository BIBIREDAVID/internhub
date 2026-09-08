import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import TaskCard from "./components/TaskCard";
import TaskFormModal from "./components/TaskFormModal";

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

    const unsubInterns = onSnapshot(
      internsQuery,
      (snapshot) => {
        setInterns(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Interns load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load your interns."));
        setLoading(false);
      }
    );

    const unsubTasks = onSnapshot(
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

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
    setSelectedInternId("");
    setForm(emptyTask);
  }

  async function saveTask() {
    if (!form.title.trim()) {
      notifyError("Task title is required.");
      return;
    }
    if (!selectedInternId) {
      notifyError("Select an intern to assign this task to.");
      return;
    }

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

    try {
      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), payload);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      closeModal();
    } catch (error) {
      console.error("Save task error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't save the task. Please try again."));
    }
  }

  async function changeStatus(taskId, status) {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Update task status error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't update the task. Please try again."));
    }
  }

  async function removeTask(taskId) {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (error) {
      console.error("Delete task error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't delete the task. Please try again."));
    }
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;

  if (loading) {
    return (
      <Layout pageTitle="Tasks">
        <PageSkeleton stats={4} rows={4} />
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

      <StatsRow
        items={[
          { label: "Total Tasks", value: tasks.length, color: theme.primary },
          { label: "In Progress", value: inProgress, color: theme.warning },
          { label: "Completed", value: completed, color: theme.success },
          { label: "Open", value: tasks.length - completed, color: theme.info },
        ]}
      />

      <div style={styles.toolbar}>
        {["all", "pending", "in-progress", "completed"].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              ...styles.filterBtn,
              background: filter === value ? theme.primary : theme.surface,
              color: filter === value ? "#fff" : theme.muted,
              borderColor: filter === value ? theme.primary : theme.border,
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
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                intern={interns.find((item) => item.id === task.internId)}
                onChangeStatus={changeStatus}
                onEdit={openEdit}
                onDelete={removeTask}
              />
            ))
          )}
        </div>
      </div>

      {showModal && (
        <TaskFormModal
          interns={interns}
          selectedInternId={selectedInternId}
          onSelectIntern={setSelectedInternId}
          form={form}
          onChangeForm={setForm}
          editingTask={editingTask}
          onCancel={closeModal}
          onSave={saveTask}
        />
      )}
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  primaryBtn: { padding: "10px 20px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  taskList: { display: "flex", flexDirection: "column", gap: "12px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
