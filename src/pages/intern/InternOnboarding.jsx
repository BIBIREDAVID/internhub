import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/useAuth";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { PageSkeleton } from "../../components/Skeleton";
import { useOnboardingChecklist, onboardingSteps } from "./hooks/useOnboardingChecklist";
import ChecklistStep from "./components/ChecklistStep";
import ProfileDetailsCard from "./components/ProfileDetailsCard";

export default function InternOnboarding() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error("Profile load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load your onboarding profile."));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const { steps, completedCount, progressPct, saving, toggleStep, completeNextStep, resetChecklist } =
    useOnboardingChecklist(currentUser, profile);

  if (loading) {
    return (
      <Layout pageTitle="Onboarding">
        <PageSkeleton stats={0} rows={5} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Onboarding">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Onboarding</h2>
          <p style={styles.sub}>
            {profile?.name ? `${profile.name} · ` : ""}
            Track your onboarding progress and move to the next milestone.
          </p>
        </div>

        <div style={styles.actions}>
          <button onClick={completeNextStep} disabled={saving || completedCount >= onboardingSteps.length} style={styles.primaryBtn}>
            {completedCount >= onboardingSteps.length ? "All Done" : saving ? "Saving..." : "Complete Next Step"}
          </button>
          <button onClick={resetChecklist} disabled={saving || completedCount === 0} style={styles.secondaryBtn}>
            Reset Progress
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.progressHeader}>
          <div>
            <div style={styles.cardTitle}>Progress</div>
            <div style={styles.progressMeta}>
              Step {Math.min(completedCount, onboardingSteps.length)} of {onboardingSteps.length}
            </div>
          </div>
          <div style={styles.progressPct}>{progressPct}%</div>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Checklist</div>
        <div style={styles.stepList}>
          {steps.map((step) => (
            <ChecklistStep key={step.id} step={step} onToggle={toggleStep} />
          ))}
        </div>
      </div>

      <ProfileDetailsCard currentUser={currentUser} profile={profile} />
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryBtn: { padding: "10px 16px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  secondaryBtn: { padding: "10px 16px", background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}`, marginBottom: "16px" },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: 0, color: theme.text },
  progressHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "14px" },
  progressMeta: { color: theme.muted, fontSize: "12px", marginTop: "4px" },
  progressPct: { color: theme.primary, fontSize: "18px", fontWeight: "700" },
  progressBar: { height: "10px", background: theme.border, borderRadius: "999px", overflow: "hidden" },
  progressFill: { height: "100%", background: theme.primary, borderRadius: "999px" },
  stepList: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" },
};
