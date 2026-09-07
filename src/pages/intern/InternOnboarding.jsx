import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";

const onboardingSteps = [
  { id: "account_setup", label: "Account Setup", description: "Confirm your access details and contact info." },
  { id: "offer_letter", label: "Sign Offer Letter", description: "Review and sign your internship agreement." },
  { id: "meet_manager", label: "Meet Your Manager", description: "Schedule a quick intro with your manager." },
  { id: "hr_orientation", label: "Complete HR Orientation", description: "Finish your policy and onboarding orientation." },
  { id: "first_task", label: "First Task Assigned", description: "Receive and acknowledge your first assignment." },
];

export default function InternOnboarding() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const checklist = useMemo(() => {
    const existing = Array.isArray(profile?.onboardingChecklist) ? profile.onboardingChecklist : null;
    if (existing && existing.length === onboardingSteps.length) {
      return existing.map((item, index) => ({
        id: onboardingSteps[index].id,
        label: onboardingSteps[index].label,
        description: onboardingSteps[index].description,
        completed: Boolean(item.completed),
        completedAt: item.completedAt || null,
      }));
    }

    const completedCount = profile?.onboardingStep ?? 0;
    return onboardingSteps.map((step, index) => ({
      ...step,
      completed: index < completedCount,
      completedAt: index < completedCount ? new Date().toISOString() : null,
    }));
  }, [profile]);

  const completedCount = checklist.filter((step) => step.completed).length;
  const currentStep = checklist.findIndex((step) => !step.completed);
  const activeStep = currentStep === -1 ? onboardingSteps.length - 1 : currentStep;
  const progressPct = Math.min(100, Math.round((completedCount / onboardingSteps.length) * 100));

  const steps = useMemo(
    () =>
      checklist.map((step, index) => ({
        ...step,
        number: index + 1,
        current: index === activeStep && !step.completed,
      })),
    [activeStep, checklist]
  );

  async function persistChecklist(nextChecklist) {
    setSaving(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, {
        onboardingChecklist: nextChecklist,
        onboardingStep: nextChecklist.filter((item) => item.completed).length,
      }, { merge: true });
    } catch (error) {
      console.error("Onboarding save error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't save your progress. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStep(stepId) {
    const nextChecklist = checklist.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          completed: !step.completed,
          completedAt: !step.completed ? new Date().toISOString() : null,
        };
      }
      return step;
    });

    await persistChecklist(nextChecklist);
  }

  async function completeNextStep() {
    const nextIndex = checklist.findIndex((step) => !step.completed);
    if (nextIndex === -1) return;

    const nextChecklist = checklist.map((step, index) =>
      index === nextIndex
        ? { ...step, completed: true, completedAt: new Date().toISOString() }
        : step
    );
    await persistChecklist(nextChecklist);
  }

  async function resetChecklist() {
    const nextChecklist = onboardingSteps.map((step) => ({
      ...step,
      completed: false,
      completedAt: null,
    }));
    await persistChecklist(nextChecklist);
  }

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
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              style={styles.stepButton}
            >
              <div
                style={{
                  ...styles.stepDot,
                  background: step.completed ? theme.success : step.current ? theme.primary : theme.border,
                }}
              >
                {step.completed ? "✓" : step.number}
              </div>
              <div style={styles.stepContent}>
                <div
                  style={{
                    ...styles.stepLabel,
                    color: step.completed ? theme.success : step.current ? theme.text : theme.muted,
                  }}
                >
                  {step.label}
                </div>
                <div style={styles.stepDescription}>{step.description}</div>
                <div style={styles.stepMeta}>
                  {step.completed ? "Completed" : step.current ? "Current step" : "Upcoming"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Your Details</div>
        <div style={styles.detailsGrid}>
          <div>
            <div style={styles.detailLabel}>Department</div>
            <div style={styles.detailValue}>{profile?.department || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Cohort</div>
            <div style={styles.detailValue}>{profile?.cohortId || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Start Date</div>
            <div style={styles.detailValue}>{profile?.startDate || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>End Date</div>
            <div style={styles.detailValue}>{profile?.endDate || "Not set"}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  loading: { color: theme.muted, padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryBtn: {
    padding: "10px 16px",
    background: theme.primary,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  secondaryBtn: {
    padding: "10px 16px",
    background: theme.surface,
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  card: {
    background: theme.surface,
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
    marginBottom: "16px",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: 0, color: theme.text },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "14px",
  },
  progressMeta: { color: theme.muted, fontSize: "12px", marginTop: "4px" },
  progressPct: { color: theme.primary, fontSize: "18px", fontWeight: "700" },
  progressBar: { height: "10px", background: theme.border, borderRadius: "999px", overflow: "hidden" },
  progressFill: { height: "100%", background: theme.primary, borderRadius: "999px" },
  stepList: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" },
  stepButton: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    border: "1px solid #334155",
    borderRadius: "12px",
    background: theme.bg,
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
  },
  stepDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  stepContent: { flex: 1 },
  stepLabel: { fontSize: "14px", fontWeight: "600" },
  stepDescription: { color: theme.faint, fontSize: "12px", marginTop: "2px", lineHeight: 1.5 },
  stepMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginTop: "16px",
  },
  detailLabel: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  detailValue: { color: theme.text, fontSize: "14px", fontWeight: "600" },
};
