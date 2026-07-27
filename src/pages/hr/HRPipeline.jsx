import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";

const stages = ["new", "screening", "interview", "offer", "onboarding", "rejected"];

export default function HRPipeline() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "applications")),
      (snapshot) => {
        setApplications(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Pipeline error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const grouped = useMemo(() => {
    return stages.reduce((accumulator, stage) => {
      accumulator[stage] = applications.filter((application) => (application.stage || application.status || "new") === stage);
      return accumulator;
    }, {});
  }, [applications]);

  const counts = useMemo(() => {
    return stages.reduce((accumulator, stage) => {
      accumulator[stage] = grouped[stage]?.length || 0;
      return accumulator;
    }, {});
  }, [grouped]);

  if (loading) {
    return (
      <Layout pageTitle="Hiring Pipeline">
        <div style={styles.loading}>Loading pipeline...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Hiring Pipeline">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Hiring Pipeline</h2>
          <p style={styles.sub}>Move candidates from application to onboarding with a clear stage view.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {stages.map((stage) => (
          <div key={stage} style={styles.statCard}>
            <div style={styles.statValue}>{counts[stage] || 0}</div>
            <div style={styles.statLabel}>{stage}</div>
          </div>
        ))}
      </div>

      <div style={styles.board}>
        {stages.map((stage) => (
          <div key={stage} style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>{stage}</h3>
              <span style={styles.columnCount}>{counts[stage] || 0}</span>
            </div>
            <div style={styles.columnList}>
              {(grouped[stage] || []).length === 0 ? (
                <p style={styles.empty}>Nothing here yet.</p>
              ) : (
                grouped[stage].map((application) => (
                  <div key={application.id} style={styles.card}>
                    <div style={styles.cardTitle}>{application.name || "Applicant"}</div>
                    <div style={styles.cardMeta}>{application.department || "General"} · {application.email || "No email"}</div>
                    <div style={styles.cardTags}>
                      <span style={styles.tag}>{application.status || "new"}</span>
                      <span style={styles.tag}>{application.cohortId || "No cohort"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles = {
  loading: { color: "#94a3b8", padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "24px" },
  statCard: { background: "#1e293b", borderRadius: "12px", padding: "16px", textAlign: "center", border: "1px solid #334155" },
  statValue: { color: "#f8fafc", fontSize: "22px", fontWeight: "700" },
  statLabel: { color: "#94a3b8", fontSize: "12px", marginTop: "4px", textTransform: "capitalize" },
  board: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  column: { background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "16px" },
  columnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  columnTitle: { margin: 0, fontSize: "14px", fontWeight: "700", color: "#f8fafc", textTransform: "capitalize" },
  columnCount: { color: "#94a3b8", fontSize: "12px" },
  columnList: { display: "flex", flexDirection: "column", gap: "10px" },
  card: { background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "12px" },
  cardTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  cardMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  cardTags: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" },
  tag: { padding: "4px 8px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
};
