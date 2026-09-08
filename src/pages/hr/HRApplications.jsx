import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, notifySuccess, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import ApplicationDetailModal from "./components/ApplicationDetailModal";
import { logActivity } from "../../utils/activityLog";
import { downloadCsv } from "../../utils/csv";

const statuses = ["all", "new", "shortlisted", "rejected", "hired"];

export default function HRApplications() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(new Set());

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

  async function updateApplicationStatus(applicationId, nextStatus, applicantName) {
    await updateDoc(doc(db, "applications", applicationId), {
      status: nextStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.uid,
    });
    logActivity({
      actor: currentUser,
      action: "application_status_change",
      targetType: "application",
      targetId: applicationId,
      details: { applicantName, status: nextStatus },
    });
  }

  async function updateApplication(applicationId, nextStatus) {
    try {
      const applicant = applications.find((application) => application.id === applicationId);
      await updateApplicationStatus(applicationId, nextStatus, applicant?.name);
      setSelected((current) => (current?.id === applicationId ? null : current));
    } catch (error) {
      console.error("Update application error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't update the application. Please try again."));
    }
  }

  function toggleChecked(applicationId) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  async function applyBulkStatus(nextStatus) {
    if (checked.size === 0) {
      notifyError("Select at least one application first.");
      return;
    }
    const ids = [...checked];
    const results = await Promise.allSettled(
      ids.map((id) => {
        const applicant = applications.find((application) => application.id === id);
        return updateApplicationStatus(id, nextStatus, applicant?.name);
      })
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed === 0) {
      notifySuccess(`Marked ${ids.length} application${ids.length === 1 ? "" : "s"} as ${nextStatus}.`);
    } else {
      notifyError(`${failed} of ${ids.length} updates failed. Please retry those.`);
    }
    setChecked(new Set());
  }

  function exportCsv() {
    downloadCsv(
      `applications-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "department", label: "Department" },
        { key: "cohortId", label: "Cohort" },
        { key: "status", label: "Status" },
        { key: "reviewedAt", label: "Reviewed At" },
      ],
      visibleApplications
    );
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
        <PageSkeleton stats={4} rows={5} />
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
        <button onClick={exportCsv} style={styles.exportBtn}>Export CSV</button>
      </div>

      <StatsRow
        items={[
          { label: "New", value: counts.new || 0, color: theme.primary },
          { label: "Shortlisted", value: counts.shortlisted || 0, color: theme.success },
          { label: "Rejected", value: counts.rejected || 0, color: theme.danger },
          { label: "Hired", value: counts.hired || 0, color: theme.info },
        ]}
      />

      {checked.size > 0 && (
        <div style={styles.bulkBar}>
          <span style={styles.bulkLabel}>{checked.size} selected</span>
          <button onClick={() => applyBulkStatus("shortlisted")} style={styles.bulkShortlistBtn}>Shortlist selected</button>
          <button onClick={() => applyBulkStatus("rejected")} style={styles.bulkRejectBtn}>Reject selected</button>
          <button onClick={() => setChecked(new Set())} style={styles.bulkClearBtn}>Clear</button>
        </div>
      )}

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
                <input
                  type="checkbox"
                  checked={checked.has(application.id)}
                  onChange={() => toggleChecked(application.id)}
                  style={styles.checkbox}
                />
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
        <ApplicationDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateApplication}
        />
      )}
    </Layout>
  );
}

const styles = {
  exportBtn: { padding: "8px 14px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, fontSize: "13px", fontWeight: "600", cursor: "pointer", flexShrink: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  bulkBar: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" },
  bulkLabel: { color: theme.text, fontSize: "13px", fontWeight: "600" },
  bulkShortlistBtn: { padding: "8px 14px", borderRadius: "8px", border: "1px solid #22c55e", background: theme.successSoft, color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  bulkRejectBtn: { padding: "8px 14px", borderRadius: "8px", border: "1px solid #ef4444", background: "#7f1d1d", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  bulkClearBtn: { padding: "8px 14px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, fontSize: "13px", cursor: "pointer" },
  checkbox: { marginTop: "12px", width: "16px", height: "16px", flexShrink: 0, cursor: "pointer" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  openBtn: { padding: "7px 10px", background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  shortlistBtn: { padding: "7px 10px", background: theme.successSoft, color: "#fff", border: "1px solid #22c55e", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn: { padding: "7px 10px", background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  metaRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: theme.muted, fontSize: "11px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
