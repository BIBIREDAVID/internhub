import { useMemo } from "react";
import { theme } from "../../../theme";

function weekStart() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function WeeklyDigest({ interns, tasks, attendance }) {
  const today = new Date().toISOString().slice(0, 10);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== "completed" && task.dueDate && task.dueDate < today)
      .map((task) => ({ ...task, intern: interns.find((i) => i.id === task.internId) }));
  }, [tasks, interns, today]);

  const dueSoonTasks = useMemo(() => {
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);
    const weekAheadKey = weekAhead.toISOString().slice(0, 10);
    return tasks.filter(
      (task) => task.status !== "completed" && task.dueDate && task.dueDate >= today && task.dueDate <= weekAheadKey
    );
  }, [tasks, today]);

  const attendanceGaps = useMemo(() => {
    const start = weekStart();
    return interns.filter((intern) => {
      const recent = attendance.filter(
        (record) => record.internId === intern.id && new Date(`${record.date}T00:00:00`) >= start
      );
      const absences = recent.filter((record) => record.status === "absent").length;
      const noRecordToday = !attendance.some((record) => record.internId === intern.id && record.date === today);
      return absences > 0 || noRecordToday;
    });
  }, [interns, attendance, today]);

  const allClear = overdueTasks.length === 0 && attendanceGaps.length === 0;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>This Week at a Glance</h3>
        {allClear && <span style={styles.allClear}>All clear</span>}
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Overdue tasks <span style={styles.count}>{overdueTasks.length}</span>
          </div>
          {overdueTasks.length === 0 ? (
            <p style={styles.empty}>Nothing overdue.</p>
          ) : (
            <ul style={styles.list}>
              {overdueTasks.slice(0, 5).map((task) => (
                <li key={task.id} style={styles.item}>
                  <span style={styles.itemTitle}>{task.title}</span>
                  <span style={styles.itemMeta}>{task.intern?.name || "Unknown"} · was due {task.dueDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Due within 7 days <span style={styles.count}>{dueSoonTasks.length}</span>
          </div>
          {dueSoonTasks.length === 0 ? (
            <p style={styles.empty}>Nothing coming up.</p>
          ) : (
            <ul style={styles.list}>
              {dueSoonTasks.slice(0, 5).map((task) => (
                <li key={task.id} style={styles.item}>
                  <span style={styles.itemTitle}>{task.title}</span>
                  <span style={styles.itemMeta}>Due {task.dueDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Attendance flags <span style={styles.count}>{attendanceGaps.length}</span>
          </div>
          {attendanceGaps.length === 0 ? (
            <p style={styles.empty}>No absences or missing check-ins this week.</p>
          ) : (
            <ul style={styles.list}>
              {attendanceGaps.slice(0, 5).map((intern) => (
                <li key={intern.id} style={styles.item}>
                  <span style={styles.itemTitle}>{intern.name || "Unnamed intern"}</span>
                  <span style={styles.itemMeta}>Absence or no check-in today</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}`, marginBottom: "16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: 0 },
  allClear: { padding: "4px 10px", borderRadius: "999px", background: theme.successSoft, color: "#fff", fontSize: "11px", fontWeight: "700" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  section: {},
  sectionTitle: { color: theme.muted, fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" },
  count: { color: theme.text, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "999px", padding: "1px 8px", fontSize: "11px" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" },
  item: { display: "flex", flexDirection: "column", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "8px 10px" },
  itemTitle: { color: theme.text, fontSize: "13px", fontWeight: "600" },
  itemMeta: { color: theme.faint, fontSize: "11px", marginTop: "2px" },
  empty: { color: theme.faint, fontSize: "12px", margin: 0 },
};
