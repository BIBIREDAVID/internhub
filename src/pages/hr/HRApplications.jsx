import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

const statuses = ["all", "new", "shortlisted", "rejected", "hired"];

export default function HRApplications() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const appQuery = query(collection(db, "applications"));
    const unsubscribe = onSnapshot(
      appQuery,
      (snapshot) => {
        setApplications(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Applications error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === "all" || (application.status || "new") === filter),
    [applications, filter]
  );

  async function updateApplication(applicationId, nextStatus) {
    await updateDoc(doc(db, "applications", applicationId), {
      status: nextStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.uid,
    });
  }

  const counts = useMemo(() => {
    return statuses.slice(1).reduce((summary, status) => {
      summary[status] = applications.filter((application) => (application.status || "new") === status).length;
      return summary;
    }, {});
  }, [applications]);

  if (loading) {
    return (
      <Layout pageTitle="Applications">
        <div style={styles.loading}>Loading applications...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Applications">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Applications</h2>
          <p style={styles.sub}>Review applicants, shortlist promising candidates, or reject with a clear status.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "New", value: counts.new || 0, color: "#3b82f6" },
          { label: "Shortlisted", value: counts.shortlisted || 0, color: "#22c55e" },
          { label: "Rejected", value: counts.rejected || 0, color: "#ef4444" },
          { label: "Hired", value: counts.hired || 0, color: "#a855f7" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.toolbar}>
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterBtn,
              background: filter === status ? "#3b82f6" : "#1e293b",
              color: filter === status ? "#fff" : "#94a3b8",
              borderColor: filter === status ? "#3b82f6" : "#334155",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Applicant List</div>
        <div style={styles.list}>
          {visibleApplications.length === 0 ? (
            <p style={styles.empty}>No applications match this filter.</p>
          ) : (
            visibleApplications.map((application) => (
              <div key={application.id} style={styles.row}>
                <div style={styles.avatar}>{application.name?.[0]?.toUpperCase() || "A"}</div>
                <div style={styles.rowMain}>
                  <div style={styles.rowHeader}>
                    <div>
                      <div style={styles.rowTitle}>{application.name || "Unnamed applicant"}</div>
                      <div style={styles.rowMeta}>
                        {application.email || "No email"} · {application.department || "General"}
                      </div>
                    </div>
                    <div style={styles.actions}>
                      <button onClick={() => setSelected(application)} style={styles.openBtn}>Open</button>
                      <button onClick={() => updateApplication(application.id, "shortlisted")} style={styles.shortlistBtn}>
                        Shortlist
                      </button>
                      <button onClick={() => updateApplication(application.id, "rejected")} style={styles.rejectBtn}>
                        Reject
                      </button>
                    </div>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.pill}>{application.status || "new"}</span>
                    <span style={styles.pill}>{application.cohortId || "No cohort"}</span>
                    <span style={styles.pill}>{application.educationLevel || "Applicant"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{selected.name || "Applicant"}</h3>
                <p style={styles.modalSub}>{selected.email || "No email provided"}</p>
              </div>
              <button onClick={() => setSelected(null)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.detailsGrid}>
              <div>
                <div style={styles.detailLabel}>Department</div>
                <div style={styles.detailValue}>{selected.department || "Not set"}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Cohort</div>
                <div style={styles.detailValue}>{selected.cohortId || "Not set"}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Status</div>
                <div style={styles.detailValue}>{selected.status || "new"}</div>
              </div>
              <div>
                <div style={styles.detailLabel}>Created</div>
                <div style={styles.detailValue}>{selected.createdAt || "Unknown"}</div>
              </div>
            </div>

            <div style={styles.noteBox}>
              <div style={styles.detailLabel}>Notes</div>
              <div style={styles.noteText}>{selected.notes || "No notes attached."}</div>
            </div>

            <div style={styles.modalBtns}>
              <button onClick={() => updateApplication(selected.id, "shortlisted")} style={styles.shortlistBtn}>Shortlist</button>
              <button onClick={() => updateApplication(selected.id, "rejected")} style={styles.rejectBtn}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  loading: { color: "#94a3b8", padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#1e293b", borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #334155" },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  openBtn: { padding: "7px 10px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  shortlistBtn: { padding: "7px 10px", background: "#166534", color: "#fff", border: "1px solid #22c55e", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  metaRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: "100%", maxWidth: "560px", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "24px" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#f8fafc" },
  modalSub: { margin: "4px 0 0", color: "#94a3b8", fontSize: "13px" },
  closeBtn: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "24px", lineHeight: 1 },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" },
  detailLabel: { color: "#94a3b8", fontSize: "12px", marginBottom: "4px" },
  detailValue: { color: "#f8fafc", fontSize: "14px", fontWeight: "600" },
  noteBox: { marginTop: "16px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  noteText: { marginTop: "4px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5 },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
};
