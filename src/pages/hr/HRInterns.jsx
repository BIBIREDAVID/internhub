import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";

const internConstraints = [where("role", "==", "intern")];

export default function HRInterns() {
  const [managers, setManagers] = useState([]);
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

  async function assignManager(internId, managerId) {
    try {
      await updateDoc(doc(db, "users", internId), { managerId });
    } catch (error) {
      console.error("Assign manager error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't assign manager. Please try again."));
    }
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

      <div style={styles.card}>
        <div style={styles.cardTitle}>Roster</div>
        <div style={styles.list}>
          {interns.length === 0 ? (
            <p style={styles.empty}>No intern records found.</p>
          ) : (
            interns.map((intern) => (
              <div key={intern.id} style={styles.row}>
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
                        onChange={(event) => assignManager(intern.id, event.target.value)}
                        style={styles.input}
                      >
                        <option value="">Unassigned</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
                        ))}
                      </select>
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
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: theme.bg, border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  rowGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" },
  label: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  value: { color: theme.text, fontSize: "14px", fontWeight: "600" },
  input: { width: "100%", padding: "10px 12px", background: theme.surfaceAlt, border: "1px solid #334155", borderRadius: "8px", color: theme.text, fontSize: "14px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px", whiteSpace: "nowrap" },
  tags: { display: "flex", gap: "8px", flexWrap: "wrap" },
  tag: { padding: "4px 10px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
