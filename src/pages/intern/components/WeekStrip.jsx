import { theme } from "../../../theme";

const statusColor = {
  present: theme.success,
  late: theme.warning,
  absent: theme.danger,
};

export default function WeekStrip({ days }) {
  return (
    <div style={styles.weekStrip}>
      {days.map((day) => (
        <div key={day.key} style={styles.dayTile}>
          <div style={styles.dayName}>{day.label}</div>
          <div style={{ ...styles.dayDot, background: statusColor[day.status] || theme.border }} />
          <div style={styles.dayStatus}>{day.status === "missing" ? "No record" : day.status}</div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  weekStrip: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" },
  dayTile: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px 10px", textAlign: "center" },
  dayName: { color: theme.muted, fontSize: "12px", marginBottom: "8px" },
  dayDot: { width: "16px", height: "16px", borderRadius: "50%", margin: "0 auto 8px" },
  dayStatus: { color: theme.text, fontSize: "11px", textTransform: "capitalize" },
};
