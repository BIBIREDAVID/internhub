import { theme } from "../theme";

/** items: [{ label, value, color }] */
export default function StatsRow({ items }) {
  return (
    <div style={styles.statsRow}>
      {items.map((stat) => (
        <div key={stat.label} style={styles.statCard}>
          <div style={{ ...styles.statValue, color: stat.color || theme.text }}>{stat.value}</div>
          <div style={styles.statLabel}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" },
  statCard: { background: theme.surface, borderRadius: "12px", padding: "20px", textAlign: "center", border: `1px solid ${theme.border}` },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: theme.faint, fontSize: "13px" },
};
