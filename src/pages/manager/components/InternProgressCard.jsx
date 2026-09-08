import { theme } from "../../../theme";

export default function InternProgressCard({ intern, tasks, onAssignTask }) {
  const internCompleted = tasks.filter((task) => task.status === "completed").length;
  const pct = tasks.length ? Math.round((internCompleted / tasks.length) * 100) : 0;

  return (
    <div style={styles.internCard}>
      <div style={styles.internTop}>
        <div style={styles.internAvatar}>{intern.name?.[0]?.toUpperCase()}</div>
        <div style={styles.internInfo}>
          <div style={styles.internName}>{intern.name}</div>
          <div style={styles.internMeta}>{intern.department} · {intern.email}</div>
        </div>
        <button onClick={() => onAssignTask(intern)} style={styles.assignBtn}>Assign Task</button>
      </div>
      <div style={styles.progressWrap}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        </div>
        <span style={styles.progressPct}>{pct}%</span>
      </div>
      <div style={styles.internStats}>
        <span style={styles.internStat}>{tasks.length} tasks</span>
        <span style={styles.internStat}>{internCompleted} completed</span>
      </div>
    </div>
  );
}

const styles = {
  internCard: { background: theme.bg, borderRadius: "8px", padding: "14px", border: `1px solid ${theme.border}`, marginBottom: "12px" },
  internTop: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  internAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", color: "#fff", flexShrink: 0 },
  internInfo: { flex: 1 },
  internName: { fontWeight: "600", fontSize: "14px", color: theme.text },
  internMeta: { color: theme.faint, fontSize: "12px", marginTop: "2px" },
  assignBtn: { padding: "6px 12px", background: "transparent", border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  progressWrap: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  progressBar: { flex: 1, height: "6px", background: theme.border, borderRadius: "3px", overflow: "hidden" },
  progressFill: { height: "100%", background: theme.primary, borderRadius: "3px" },
  progressPct: { color: theme.primary, fontWeight: "700", fontSize: "12px" },
  internStats: { display: "flex", gap: "12px" },
  internStat: { color: theme.faint, fontSize: "12px" },
};
