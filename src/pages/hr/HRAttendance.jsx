import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HRAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubAttendance = onSnapshot(query(collection(db, "attendance")), (snapshot) => {
      setAttendance(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
    });

    return () => {
      unsubAttendance();
      unsubUsers();
    };
  }, []);

  const visibleRecords = useMemo(() => {
    return attendance
      .filter((record) => filter === "all" || record.status === filter)
      .filter((record) => {
        const intern = users.find((user) => user.id === record.internId);
        const searchText = `${intern?.name || ""} ${intern?.email || ""} ${record.date || ""}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .sort((left, right) => new Date(`${right.date}T00:00:00`) - new Date(`${left.date}T00:00:00`));
  }, [attendance, filter, search, users]);

  const stats = useMemo(() => {
    return {
      present: attendance.filter((record) => record.status === "present").length,
      late: attendance.filter((record) => record.status === "late").length,
      absent: attendance.filter((record) => record.status === "absent").length,
      comments: attendance.filter((record) => record.managerComment).length,
    };
  }, [attendance]);

  if (loading) {
    return (
      <Layout pageTitle="Attendance">
        <div style={styles.loading}>Loading attendance...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Attendance">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Attendance</h2>
          <p style={styles.sub}>Track attendance, exceptions, lateness flags, and manager comments.</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Present", value: stats.present, color: "#22c55e" },
          { label: "Late", value: stats.late, color: "#f59e0b" },
          { label: "Absent", value: stats.absent, color: "#ef4444" },
          { label: "Comments", value: stats.comments, color: "#3b82f6" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search intern or date..."
          style={styles.searchInput}
        />
        {["all", "present", "late", "absent"].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              ...styles.filterBtn,
              background: filter === value ? "#3b82f6" : "#1e293b",
              color: filter === value ? "#fff" : "#94a3b8",
              borderColor: filter === value ? "#3b82f6" : "#334155",
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Attendance Table</div>
        <div style={styles.list}>
          {visibleRecords.length === 0 ? (
            <p style={styles.empty}>No attendance records match this filter.</p>
          ) : (
            visibleRecords.map((record) => {
              const intern = users.find((user) => user.id === record.internId);
              return (
                <div key={record.id} style={styles.row}>
                  <div style={styles.rowMain}>
                    <div style={styles.rowHeader}>
                      <div>
                        <div style={styles.rowTitle}>{intern?.name || "Unknown intern"}</div>
                        <div style={styles.rowMeta}>
                          {record.date} · In {displayTime(record.checkIn)} · Out {displayTime(record.checkOut)}
                        </div>
                      </div>
                      <div style={styles.rowRight}>
                        <span
                          style={{
                            ...styles.statusPill,
                            background:
                              record.status === "present"
                                ? "#166534"
                                : record.status === "late"
                                  ? "#92400e"
                                  : "#991b1b",
                          }}
                        >
                          {record.status || "present"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.commentBox}>
                      <div style={styles.commentLabel}>Exception / comment</div>
                      <div style={styles.commentText}>{record.managerComment || "None"}</div>
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
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  searchInput: { flex: "1 1 240px", padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "14px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  rowMain: { display: "flex", flexDirection: "column", gap: "12px" },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  rowRight: { display: "flex", alignItems: "center", gap: "8px" },
  statusPill: { padding: "4px 10px", borderRadius: "999px", color: "#fff", fontSize: "11px", fontWeight: "700" },
  commentBox: { marginTop: "10px", background: "#111827", border: "1px solid #334155", borderRadius: "10px", padding: "12px" },
  commentLabel: { color: "#94a3b8", fontSize: "12px", marginBottom: "4px" },
  commentText: { color: "#e2e8f0", fontSize: "13px", lineHeight: 1.5 },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
};
