import { useMemo, useState } from "react";
import { api } from "../../../api";
import { notifyError, friendlyApiError } from "../../../utils/toast";

export const onboardingSteps = [
  { id: "account_setup", label: "Account Setup", description: "Confirm your access details and contact info." },
  { id: "offer_letter", label: "Sign Offer Letter", description: "Review and sign your internship agreement." },
  { id: "meet_manager", label: "Meet Your Manager", description: "Schedule a quick intro with your manager." },
  { id: "hr_orientation", label: "Complete HR Orientation", description: "Finish your policy and onboarding orientation." },
  { id: "first_task", label: "First Task Assigned", description: "Receive and acknowledge your first assignment." },
];

/** Derives the checklist from a user profile and exposes actions to mutate it. */
export function useOnboardingChecklist(currentUser, profile) {
  const [saving, setSaving] = useState(false);

  const checklist = useMemo(() => {
    const existing = Array.isArray(profile?.onboarding_checklist) ? profile.onboarding_checklist : null;
    if (existing && existing.length === onboardingSteps.length) {
      return existing.map((item, index) => ({
        id: onboardingSteps[index].id,
        label: onboardingSteps[index].label,
        description: onboardingSteps[index].description,
        completed: Boolean(item.completed),
        completedAt: item.completedAt || null,
      }));
    }

    const completedCount = profile?.onboarding_step ?? 0;
    return onboardingSteps.map((step, index) => ({
      ...step,
      completed: index < completedCount,
      completedAt: index < completedCount ? new Date().toISOString() : null,
    }));
  }, [profile]);

  const completedCount = checklist.filter((step) => step.completed).length;
  const currentStepIndex = checklist.findIndex((step) => !step.completed);
  const activeStep = currentStepIndex === -1 ? onboardingSteps.length - 1 : currentStepIndex;
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
      await api.patch(`/users/${currentUser.uid}`, {
        onboarding_checklist: nextChecklist,
        onboarding_step: nextChecklist.filter((item) => item.completed).length,
      });
    } catch (error) {
      console.error("Onboarding save error:", error);
      notifyError(friendlyApiError(error, "Couldn't save your progress. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStep(stepId) {
    const nextChecklist = checklist.map((step) =>
      step.id === stepId
        ? { ...step, completed: !step.completed, completedAt: !step.completed ? new Date().toISOString() : null }
        : step
    );
    await persistChecklist(nextChecklist);
  }

  async function completeNextStep() {
    const nextIndex = checklist.findIndex((step) => !step.completed);
    if (nextIndex === -1) return;

    const nextChecklist = checklist.map((step, index) =>
      index === nextIndex ? { ...step, completed: true, completedAt: new Date().toISOString() } : step
    );
    await persistChecklist(nextChecklist);
  }

  async function resetChecklist() {
    const nextChecklist = onboardingSteps.map((step) => ({ ...step, completed: false, completedAt: null }));
    await persistChecklist(nextChecklist);
  }

  return { steps, completedCount, progressPct, saving, toggleStep, completeNextStep, resetChecklist };
}
