import { theme } from "../../../theme";

export default function ChecklistStep({ step, onToggle }) {
  return (
    <button onClick={() => onToggle(step.id)} style={styles.stepButton}>
      <div
        style={{
          ...styles.stepDot,
          background: step.completed ? theme.success : step.current ? theme.primary : theme.border,
        }}
      >
        {step.completed ? "✓" : step.number}
      </div>
      <div style={styles.stepContent}>
        <div style={{ ...styles.stepLabel, color: step.completed ? theme.success : step.current ? theme.text : theme.muted }}>
          {step.label}
        </div>
        <div style={styles.stepDescription}>{step.description}</div>
        <div style={styles.stepMeta}>{step.completed ? "Completed" : step.current ? "Current step" : "Upcoming"}</div>
      </div>
    </button>
  );
}

const styles = {
  stepButton: { display: "flex", alignItems: "flex-start", gap: "12px", width: "100%", border: `1px solid ${theme.border}`, borderRadius: "12px", background: theme.bg, padding: "12px", textAlign: "left", cursor: "pointer" },
  stepDot: { width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: "700", flexShrink: 0 },
  stepContent: { flex: 1 },
  stepLabel: { fontSize: "14px", fontWeight: "600" },
  stepDescription: { color: theme.faint, fontSize: "12px", marginTop: "2px", lineHeight: 1.5 },
  stepMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
};
