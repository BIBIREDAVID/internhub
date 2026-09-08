import { theme } from "../../../theme";

export default function ApplicationDetailModal({ application, onClose, onUpdateStatus }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{application.name || "Applicant"}</h3>
            <p style={styles.modalSub}>{application.email || "No email provided"}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.detailsGrid}>
          <div>
            <div style={styles.detailLabel}>Department</div>
            <div style={styles.detailValue}>{application.department || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Cohort</div>
            <div style={styles.detailValue}>{application.cohortId || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Status</div>
            <div style={styles.detailValue}>{application.status || "new"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Created</div>
            <div style={styles.detailValue}>{application.createdAt || "Unknown"}</div>
          </div>
        </div>

        <div style={styles.noteBox}>
          <div style={styles.detailLabel}>Notes</div>
          <div style={styles.noteText}>{application.notes || "No notes attached."}</div>
        </div>

        <div style={styles.modalBtns}>
          <button onClick={() => onUpdateStatus(application.id, "shortlisted")} style={styles.shortlistBtn}>Shortlist</button>
          <button onClick={() => onUpdateStatus(application.id, "rejected")} style={styles.rejectBtn}>Reject</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: "100%", maxWidth: "560px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "16px", padding: "24px" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { margin: 0, fontSize: "18px", fontWeight: "700", color: theme.text },
  modalSub: { margin: "4px 0 0", color: theme.muted, fontSize: "13px" },
  closeBtn: { background: "transparent", border: "none", color: theme.muted, cursor: "pointer", fontSize: "24px", lineHeight: 1 },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" },
  detailLabel: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  detailValue: { color: theme.text, fontSize: "14px", fontWeight: "600" },
  noteBox: { marginTop: "16px", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px" },
  noteText: { marginTop: "4px", color: theme.muted, fontSize: "13px", lineHeight: 1.5 },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
  shortlistBtn: { padding: "7px 10px", background: theme.successSoft, color: "#fff", border: "1px solid #22c55e", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
};
