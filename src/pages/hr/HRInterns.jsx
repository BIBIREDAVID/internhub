import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";

export default function HRInterns() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      setLoading(false);
    });

    const unsubManagers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setManagers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })).filter((user) => user.role === "manager"));
    });

    return () => {
      unsubUsers();
      unsubManagers();
    };
  }, []);

  const interns = useMemo(() => users.filter((user) => user.role === "intern"), [users]);

  async function assignManager(internId, managerId) {
    await updateDoc(doc(db, "users", internId), { managerId });
  }

  if (loading) {
    return (
      <Layout pageTitle="All Interns">
        <div style={styles.loading}>Loading interns...</div>
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

      <div style={styles.statsRow}>
        {[
          { label: "Interns", value: interns.length, color: "#3b82f6" },
          { label: "Managers", value: managers.length, color: "#a855f7" },
          { label: "Assigned", value: interns.filter((intern) => intern.managerId).length, color: "#22c55e" },
          { label: "Unassigned", value: interns.filter((intern) => !intern.managerId).length, color: "#f59e0b" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

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
      </div>
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
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  rowGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" },
  label: { color: "#94a3b8", fontSize: "12px", marginBottom: "4px" },
  value: { color: "#f8fafc", fontSize: "14px", fontWeight: "600" },
  input: { width: "100%", padding: "10px 12px", background: "#111827", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "14px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px", whiteSpace: "nowrap" },
  tags: { display: "flex", gap: "8px", flexWrap: "wrap" },
  tag: { padding: "4px 10px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
};
