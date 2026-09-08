import { theme } from "../../../theme";

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const statusBg = {
  present: theme.successSoft,
  late: theme.warningSoft,
  absent: theme.dangerSoft,
};

export default function AttendanceHistoryList({ records }) {
  if (records.length === 0) {
    return <p style={styles.empty}>No attendance history yet.</p>;
  }

  return (
    <div style={styles.list}>
      {records.slice(0, 10).map((record) => (
        <div key={record.id} style={styles.row}>
          <div style={styles.rowMain}>
            <div style={styles.rowTitle}>{record.date}</div>
            <div style={styles.rowMeta}>
              In: {displayTime(record.checkIn)} · Out: {displayTime(record.checkOut)}
            </div>
          </div>
          <div style={{ ...styles.statusPill, background: statusBg[record.status] || statusBg.present }}>
            {record.status || "present"}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px" },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  statusPill: { padding: "4px 10px", borderRadius: "999px", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" },
};
