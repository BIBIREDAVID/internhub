import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";

const steps = ["Setup", "Offer", "Manager Intro", "Orientation", "First Task"];

export default function HROnboarding() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const interns = useMemo(() => users.filter((user) => user.role === "intern"), [users]);

  if (loading) {
    return (
      <Layout pageTitle="Onboarding">
        <div style={styles.loading}>Loading onboarding...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Onboarding">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Onboarding</h2>
          <p style={styles.sub}>Track checklist progress, document readiness, and where each intern stands.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Interns", value: interns.length, color: "#3b82f6" },
          { label: "Started", value: interns.filter((intern) => (intern.onboardingStep ?? 0) > 0).length, color: "#22c55e" },
          { label: "Midway", value: interns.filter((intern) => (intern.onboardingStep ?? 0) >= 2 && (intern.onboardingStep ?? 0) < 5).length, color: "#f59e0b" },
          { label: "Done", value: interns.filter((intern) => (intern.onboardingStep ?? 0) >= 5).length, color: "#a855f7" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Checklist Progress</div>
        <div style={styles.list}>
          {interns.length === 0 ? (
            <p style={styles.empty}>No interns found.</p>
          ) : (
            interns.map((intern) => {
              const currentStep = intern.onboardingStep ?? 0;
              const progressPct = Math.min(100, Math.round((currentStep / steps.length) * 100));
              const documentStatus = intern.onboardingChecklist ? "Checklist ready" : "Legacy step count";
              return (
                <div key={intern.id} style={styles.row}>
                  <div style={styles.rowMain}>
                    <div style={styles.rowHeader}>
                      <div>
                        <div style={styles.rowTitle}>{intern.name || "Unnamed intern"}</div>
                        <div style={styles.rowMeta}>{intern.department || "No department"} · {intern.email || "No email"}</div>
                      </div>
                      <span style={styles.pill}>{progressPct}%</span>
                    </div>

                    <div style={styles.progressWrap}>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
                      </div>
                      <div style={styles.progressText}>{currentStep} / {steps.length} steps</div>
                    </div>

                    <div style={styles.stepRow}>
                      {steps.map((step, index) => (
                        <div key={step} style={styles.stepChipWrap}>
                          <div style={{
                            ...styles.stepChip,
                            background: index < currentStep ? "#22c55e" : index === currentStep ? "#3b82f6" : "#334155",
                          }}>
                            {index < currentStep ? "✓" : index + 1}
                          </div>
                          <div style={styles.stepText}>{step}</div>
                        </div>
                      ))}
                    </div>

                    <div style={styles.docRow}>
                      <span style={styles.tag}>{documentStatus}</span>
                      <span style={styles.tag}>{intern.onboardingChecklist ? "Documents tracked" : "Using onboardingStep"}</span>
                    </div>
                  </div>
                </div>
              );
            })
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
  row: { background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  rowMain: { display: "flex", flexDirection: "column", gap: "12px" },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  pill: { padding: "4px 10px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px" },
  progressWrap: { display: "flex", alignItems: "center", gap: "12px" },
  progressBar: { flex: 1, height: "8px", background: "#334155", borderRadius: "999px", overflow: "hidden" },
  progressFill: { height: "100%", background: "#3b82f6", borderRadius: "999px" },
  progressText: { color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" },
  stepRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" },
  stepChipWrap: { display: "flex", alignItems: "center", gap: "8px" },
  stepChip: { width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700", flexShrink: 0 },
  stepText: { color: "#e2e8f0", fontSize: "12px" },
  docRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  tag: { padding: "4px 10px", borderRadius: "999px", background: "#334155", color: "#cbd5e1", fontSize: "11px" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
};
