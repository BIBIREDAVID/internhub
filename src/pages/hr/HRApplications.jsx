import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";

const statuses = ["all", "new", "shortlisted", "rejected", "hired"];

export default function HRApplications() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const { docs: applications, loading, hasMore, loadMore } = usePaginatedCollection(
    "applications",
    [],
    25,
    (error) => notifyError(friendlyFirestoreError(error, "Couldn't load applications."))
  );

  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === "all" || (application.status || "new") === filter),
    [applications, filter]
  );

  async function updateApplication(applicationId, nextStatus) {
    try {
      await updateDoc(doc(db, "applications", applicationId), {
        status: nextStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser.uid,
      });
    } catch (error) {
      console.error("Update application error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't update the application. Please try again."));
    }
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
          <p style={styles.sub}>Showing {applications.length} loaded application{applications.length === 1 ? "" : "s"}{hasMore ? " (more available)" : ""}. Counts below reflect loaded records.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "New", value: counts.new || 0, color: theme.primary },
          { label: "Shortlisted", value: counts.shortlisted || 0, color: theme.success },
          { label: "Rejected", value: counts.rejected || 0, color: theme.danger },
          { label: "Hired", value: counts.hired || 0, color: theme.info },
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
              background: filter === status ? theme.primary : theme.surface,
              color: filter === status ? "#fff" : theme.muted,
              borderColor: filter === status ? theme.primary : theme.border,
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
        {hasMore && (
          <button onClick={loadMore} style={styles.loadMoreBtn}>Load more</button>
        )}
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
  loading: { color: theme.muted, padding: "40px", textAlign: "center" },
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" },
  statCard: { background: theme.surface, borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #334155" },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: theme.faint, fontSize: "13px" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: theme.bg, border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  openBtn: { padding: "7px 10px", background: theme.surface, color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  shortlistBtn: { padding: "7px 10px", background: theme.successSoft, color: "#fff", border: "1px solid #22c55e", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  metaRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: "100%", maxWidth: "560px", background: theme.surface, border: "1px solid #334155", borderRadius: "16px", padding: "24px" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { margin: 0, fontSize: "18px", fontWeight: "700", color: theme.text },
  modalSub: { margin: "4px 0 0", color: theme.muted, fontSize: "13px" },
  closeBtn: { background: "transparent", border: "none", color: theme.muted, cursor: "pointer", fontSize: "24px", lineHeight: 1 },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" },
  detailLabel: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  detailValue: { color: theme.text, fontSize: "14px", fontWeight: "600" },
  noteBox: { marginTop: "16px", background: theme.bg, border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  noteText: { marginTop: "4px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5 },
  modalBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" },
};
