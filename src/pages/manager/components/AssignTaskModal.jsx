import { theme } from "../../../theme";

export default function AssignTaskModal({ interns, selectedIntern, onSelectIntern, task, onChangeTask, onCancel, onSubmit }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Assign Task{selectedIntern ? ` to ${selectedIntern.name}` : ""}</h3>

        {!selectedIntern && (
          <div style={styles.field}>
            <label style={styles.label}>Select Intern</label>
            <select
              style={styles.input}
              onChange={(e) => onSelectIntern(interns.find((i) => i.id === e.target.value))}
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
            value={task.title}
            onChange={(e) => onChangeTask({ ...task, title: e.target.value })}
            placeholder="e.g. Build login page"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, height: "80px", resize: "vertical" }}
            value={task.description}
            onChange={(e) => onChangeTask({ ...task, description: e.target.value })}
            placeholder="Task details..."
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Due Date</label>
          <input
            type="date"
            style={styles.input}
            value={task.dueDate}
            onChange={(e) => onChangeTask({ ...task, dueDate: e.target.value })}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Priority</label>
          <select style={styles.input} value={task.priority} onChange={(e) => onChangeTask({ ...task, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={styles.modalBtns}>
          <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          <button onClick={onSubmit} disabled={!selectedIntern || !task.title.trim()} style={styles.primaryBtn}>
            Assign Task
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { background: theme.surface, borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "460px", border: `1px solid ${theme.border}` },
  modalTitle: { fontSize: "17px", fontWeight: "700", margin: "0 0 20px 0", color: theme.text },
  field: { marginBottom: "14px" },
  label: { display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px", fontWeight: "500" },
  input: { width: "100%", padding: "10px 12px", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "14px", boxSizing: "border-box" },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: { padding: "10px 20px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  primaryBtn: { padding: "10px 20px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
};
