import { theme } from "../../../theme";

export default function TaskCard({ task, intern, onChangeStatus, onEdit, onDelete }) {
  return (
    <div style={styles.taskCard}>
      <div style={styles.taskTop}>
        <div>
          <div style={styles.taskTitle}>{task.title}</div>
          <div style={styles.taskMeta}>
            {intern?.name || "No intern"} · Due {task.dueDate || "unscheduled"} · {task.priority || "medium"} priority
          </div>
        </div>
        <select
          value={task.status || "pending"}
          onChange={(event) => onChangeStatus(task.id, event.target.value)}
          style={{
            ...styles.statusSelect,
            background:
              task.status === "completed" ? theme.successSoft : task.status === "in-progress" ? "#1d4ed8" : theme.warningSoft,
          }}
        >
          <option value="pending">pending</option>
          <option value="in-progress">in-progress</option>
          <option value="completed">completed</option>
        </select>
      </div>
      <div style={styles.taskDesc}>{task.description || "No description provided."}</div>
      <div style={styles.taskActions}>
        <button onClick={() => onEdit(task)} style={styles.actionBtn}>Edit</button>
        <button onClick={() => onDelete(task.id)} style={styles.dangerBtn}>Delete</button>
      </div>
    </div>
  );
}

const styles = {
  taskCard: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px" },
  taskTop: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  taskTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  taskMeta: { color: theme.muted, fontSize: "12px", marginTop: "4px" },
  taskDesc: { color: "#cbd5e1", fontSize: "13px", marginTop: "10px", lineHeight: 1.5 },
  statusSelect: { border: "none", color: "#fff", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", fontWeight: "700" },
  taskActions: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" },
  actionBtn: { padding: "7px 10px", background: theme.surface, color: "#e2e8f0", border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  dangerBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #b91c1c", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
};
