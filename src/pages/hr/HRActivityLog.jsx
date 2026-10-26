import Layout from "../../components/Layout";
import { notifyError, friendlyApiError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";
import { PageSkeleton } from "../../components/Skeleton";

const actionLabels = {
  reassign_manager: "Reassigned manager",
  reassign_intern: "Reassigned intern's manager",
  deactivate_intern: "Deactivated user",
  reactivate_intern: "Reactivated user",
  update_application_status: "Updated application status",
  send_invite: "Sent invite",
  resend_invite: "Resent invite",
};

function describe(entry) {
  const label = actionLabels[entry.action] || entry.action;
  const d = entry.details || {};
  switch (entry.action) {
    case "reassign_intern":
      return `${label}: ${entry.target_id} (${d.from || "unassigned"} → ${d.to || "unassigned"})`;
    case "deactivate_intern":
    case "reactivate_intern":
      return `${label}: ${entry.target_id}`;
    case "update_application_status":
      return `${label}: ${entry.target_id} → ${d.status || d.stage}`;
    case "send_invite":
    case "resend_invite":
      return `${label}: ${entry.target_id} (${d.role || d.managerId ? d.role : ""})`;
    default:
      return label;
  }
}

export default function HRActivityLog() {
  const { docs: entries, loading, hasMore, loadMore } = usePaginatedCollection(
    "activity-log",
    {},
    30,
    (error) => notifyError(friendlyApiError(error, "Couldn't load the activity log."))
  );

  if (loading) {
    return (
      <Layout pageTitle="Activity Log">
        <PageSkeleton stats={0} rows={6} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Activity Log">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Activity Log</h2>
          <p style={styles.sub}>An audit trail of HR actions — manager reassignments, application decisions, and invites.</p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.list}>
          {entries.length === 0 ? (
            <p style={styles.empty}>No activity recorded yet.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.entry_id} style={styles.row}>
                <div style={styles.rowMain}>
                  <div style={styles.rowTitle}>{describe(entry)}</div>
                  <div style={styles.rowMeta}>
                    {entry.actor_email || "Unknown"} · {new Date(entry.created_at).toLocaleString()}
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
    </Layout>
  );
}

const styles = {
  header: { marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px 14px" },
  rowMain: {},
  rowTitle: { color: theme.text, fontWeight: "600", fontSize: "13px" },
  rowMeta: { color: theme.faint, fontSize: "12px", marginTop: "3px" },
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
