import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, notifySuccess, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import { logActivity } from "../../utils/activityLog";

const internConstraints = [where("role", "==", "intern")];

export default function HRInterns() {
  const { currentUser } = useAuth();
  const [managers, setManagers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bulkManagerId, setBulkManagerId] = useState("");
  const { docs: interns, loading, hasMore, loadMore } = usePaginatedCollection(
    "users",
    internConstraints,
    25,
    (error) => notifyError(friendlyFirestoreError(error, "Couldn't load interns."))
  );

  useEffect(() => {
    const unsubManagers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "manager")),
      (snapshot) => {
        setManagers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      },
      (error) => {
        console.error("Managers load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load managers."));
      }
    );

    return unsubManagers;
  }, []);

  const managerIds = useMemo(() => new Set(managers.map((manager) => manager.id)), [managers]);
  const managerName = (managerId) => managers.find((manager) => manager.id === managerId)?.name;

  async function updateManagerAssignment(internId, managerId, internName) {
    await updateDoc(doc(db, "users", internId), { managerId: managerId || null });
    logActivity({
      actor: currentUser,
      action: "reassign_manager",
      targetType: "user",
      targetId: internId,
      details: { internName, managerId: managerId || null, managerName: managerName(managerId) || null },
    });
  }

  async function assignManager(internId, managerId, internName) {
    try {
      await updateManagerAssignment(internId, managerId, internName);
    } catch (error) {
      console.error("Assign manager error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't assign manager. Please try again."));
    }
  }

  function toggleSelected(internId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(internId)) next.delete(internId);
      else next.add(internId);
      return next;
    });
  }

  async function applyBulkManager() {
    if (selected.size === 0) {
      notifyError("Select at least one intern first.");
      return;
    }
    const internIds = [...selected];
    const results = await Promise.allSettled(
      internIds.map((internId) => {
        const intern = interns.find((item) => item.id === internId);
        return updateManagerAssignment(internId, bulkManagerId, intern?.name);
      })
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed === 0) {
      notifySuccess(`Updated manager for ${internIds.length} intern${internIds.length === 1 ? "" : "s"}.`);
    } else {
      notifyError(`${failed} of ${internIds.length} updates failed. Please retry those.`);
    }
    setSelected(new Set());
    setBulkManagerId("");
  }

  if (loading) {
    return (
      <Layout pageTitle="All Interns">
        <PageSkeleton stats={4} rows={5} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="All Interns">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>All Interns</h2>
          <p style={styles.sub}>Browse the roster, inspect profiles, and assign a manager when needed.</p>
        </div>
      </div>

      <StatsRow
        items={[
          { label: "Interns", value: interns.length, color: theme.primary },
          { label: "Managers", value: managers.length, color: theme.info },
          { label: "Assigned", value: interns.filter((intern) => intern.managerId).length, color: theme.success },
          { label: "Unassigned", value: interns.filter((intern) => !intern.managerId).length, color: theme.warning },
        ]}
      />

      {selected.size > 0 && (
        <div style={styles.bulkBar}>
          <span style={styles.bulkLabel}>{selected.size} selected</span>
          <select value={bulkManagerId} onChange={(e) => setBulkManagerId(e.target.value)} style={styles.bulkSelect}>
            <option value="">Unassign</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
            ))}
          </select>
          <button onClick={applyBulkManager} style={styles.bulkApplyBtn}>Apply to selected</button>
          <button onClick={() => setSelected(new Set())} style={styles.bulkClearBtn}>Clear</button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardTitle}>Roster</div>
        <div style={styles.list}>
          {interns.length === 0 ? (
            <p style={styles.empty}>No intern records found.</p>
          ) : (
            interns.map((intern) => {
              const orphanedManager = intern.managerId && !managerIds.has(intern.managerId);
              return (
                <div key={intern.id} style={styles.row}>
                  <input
                    type="checkbox"
                    checked={selected.has(intern.id)}
                    onChange={() => toggleSelected(intern.id)}
                    style={styles.checkbox}
                  />
                  <div style={styles.avatar}>{intern.name?.[0]?.toUpperCase() || "I"}</div>
                  <div style={styles.rowMain}>
                    <div style={styles.rowHeader}>
                      <div>
                        <div style={styles.rowTitle}>{intern.name || "Unnamed intern"}</div>
                        <div style={styles.rowMeta}>{intern.email || "No email"} · {intern.department || "No department"}</div>
                      </div>
                      <span style={styles.pill}>{intern.cohortId || "No cohort"}</span>
                    </div>

                    <div style={styles.rowGrid}>
                      <div>
                        <div style={styles.label}>Manager</div>
                        <select
                          value={intern.managerId || ""}
                          onChange={(event) => assignManager(intern.id, event.target.value, intern.name)}
                          style={styles.input}
                        >
                          <option value="">Unassigned</option>
                          {managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
                          ))}
                        </select>
                        {orphanedManager && (
                          <div style={styles.warning}>
                            Assigned manager no longer has manager access — reassign above.
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={styles.label}>Department</div>
                        <div style={styles.value}>{intern.department || "Not set"}</div>
                      </div>
                      <div>
                        <div style={styles.label}>Onboarding</div>
                        <div style={styles.value}>{intern.onboardingStep ?? 0} / 5 steps</div>
                      </div>
                      <div>
                        <div style={styles.label}>Tags</div>
                        <div style={styles.tags}>
                          {intern.department && <span style={styles.tag}>{intern.department}</span>}
                          {intern.cohortId && <span style={styles.tag}>Cohort {intern.cohortId}</span>}
                          {intern.managerId ? <span style={styles.tag}>Assigned</span> : <span style={styles.tag}>Needs manager</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
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
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  bulkBar: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" },
  bulkLabel: { color: theme.text, fontSize: "13px", fontWeight: "600" },
  bulkSelect: { padding: "8px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "13px" },
  bulkApplyBtn: { padding: "8px 14px", borderRadius: "8px", border: "none", background: theme.primary, color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  bulkClearBtn: { padding: "8px 14px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px" },
  checkbox: { marginTop: "12px", width: "16px", height: "16px", flexShrink: 0, cursor: "pointer" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  rowGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" },
  label: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  value: { color: theme.text, fontSize: "14px", fontWeight: "600" },
  input: { width: "100%", padding: "10px 12px", background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "14px" },
  warning: { color: theme.warning, fontSize: "11px", marginTop: "6px", lineHeight: 1.4 },
  pill: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px", whiteSpace: "nowrap" },
  tags: { display: "flex", gap: "8px", flexWrap: "wrap" },
  tag: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};