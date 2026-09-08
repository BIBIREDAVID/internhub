import { theme } from "../../../theme";

export default function TaskFormModal({ interns, selectedInternId, onSelectIntern, form, onChangeForm, editingTask, onCancel, onSave }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>{editingTask ? "Edit Task" : "Create Task"}</h3>

        <div style={styles.field}>
          <label style={styles.label}>Assign To</label>
          <select value={selectedInternId} onChange={(event) => onSelectIntern(event.target.value)} style={styles.input}>
            <option value="">Choose an intern</option>
            {interns.map((intern) => (
              <option key={intern.id} value={intern.id}>{intern.name || intern.email}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input value={form.title} onChange={(event) => onChangeForm({ ...form, title: event.target.value })} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={form.description}
            onChange={(event) => onChangeForm({ ...form, description: event.target.value })}
            style={{ ...styles.input, height: "90px", resize: "vertical" }}
          />
        </div>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>Due Date</label>
            <input type="date" value={form.dueDate} onChange={(event) => onChangeForm({ ...form, dueDate: event.target.value })} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <select value={form.priority} onChange={(event) => onChangeForm({ ...form, priority: event.target.value })} style={styles.input}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Status</label>
          <select value={form.status} onChange={(event) => onChangeForm({ ...form, status: event.target.value })} style={styles.input}>
            <option value="pending">pending</option>
            <option value="in-progress">in-progress</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <div style={styles.modalBtns}>
          <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          <button onClick={onSave} disabled={!selectedInternId || !form.title} style={styles.primaryBtn}>
            {editingTask ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { background: theme.surface, borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "520px", border: `1px solid ${theme.border}` },
  modalTitle: { fontSize: "17px", fontWeight: "700", margin: "0 0 20px 0", color: theme.text },
  field: { marginBottom: "14px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  label: { display: "block", color: theme.muted, fontSize: "13px", marginBottom: "6px", fontWeight: "500" },
  input: { width: "100%", padding: "10px 12px", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "14px", boxSizing: "border-box" },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: { padding: "10px 20px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  primaryBtn: { padding: "10px 20px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
};
