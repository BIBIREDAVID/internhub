import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";

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
        <PageSkeleton stats={6} rows={0} />
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

      <StatsRow
        items={stages.map((stage) => ({
          label: stage.charAt(0).toUpperCase() + stage.slice(1),
          value: counts[stage] || 0,
        }))}
      />

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
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  board: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  column: { background: theme.surface, border: "1px solid #334155", borderRadius: "14px", padding: "16px" },
  columnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  columnTitle: { margin: 0, fontSize: "14px", fontWeight: "700", color: theme.text, textTransform: "capitalize" },
  columnCount: { color: theme.muted, fontSize: "12px" },
  columnList: { display: "flex", flexDirection: "column", gap: "10px" },
  card: { background: theme.bg, border: "1px solid #334155", borderRadius: "12px", padding: "12px" },
  cardTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  cardMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  cardTags: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" },
  tag: { padding: "4px 8px", borderRadius: "999px", background: theme.border, color: "#cbd5e1", fontSize: "11px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
