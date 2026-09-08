import { useState } from "react";
import { theme } from "../../../theme";
import TaskComments from "../../../components/TaskComments";

export default function InternTaskItem({ task, onChangeStatus }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div style={styles.taskItem}>
      <div style={styles.taskTop}>
        <div>
          <div style={styles.taskTitle}>{task.title || "Untitled task"}</div>
          <div style={styles.taskMeta}>{task.description || "No description provided."}</div>
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

      <div style={styles.taskBottom}>
        <span style={styles.metaPill}>Due {task.dueDate || "unscheduled"}</span>
        <span style={styles.metaPill}>{task.priority || "medium"} priority</span>
        {task.managerId && <span style={styles.metaPill}>Assigned by manager</span>}
        <button onClick={() => setShowComments((current) => !current)} style={styles.commentsBtn}>
          {showComments ? "Hide comments" : "Comments"}
        </button>
      </div>

      {showComments && <TaskComments taskId={task.id} />}
    </div>
  );
}

const styles = {
  taskItem: { background: theme.bg, borderRadius: "10px", padding: "14px", border: `1px solid ${theme.border}` },
  taskTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" },
  taskTitle: { fontWeight: "700", fontSize: "14px", color: theme.text },
  taskMeta: { color: theme.muted, fontSize: "13px", marginTop: "4px", lineHeight: 1.5 },
  statusSelect: { border: "none", color: "#fff", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", fontWeight: "700" },
  taskBottom: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px", alignItems: "center" },
  metaPill: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: theme.muted, fontSize: "11px" },
  commentsBtn: { padding: "4px 10px", borderRadius: "999px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.primary, fontSize: "11px", fontWeight: "600", cursor: "pointer" },
};
