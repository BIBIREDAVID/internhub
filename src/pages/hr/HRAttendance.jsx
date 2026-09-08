import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { usePaginatedCollection } from "../../hooks/usePaginatedCollection";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import { downloadCsv } from "../../utils/csv";

const attendanceConstraints = [orderBy("date", "desc")];

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HRAttendance() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { docs: attendance, loading, hasMore, loadMore } = usePaginatedCollection(
    "attendance",
    attendanceConstraints,
    30,
    (error) => notifyError(friendlyFirestoreError(error, "Couldn't load attendance."))
  );

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, "users")),
      (snapshot) => {
        setUsers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      },
      (error) => {
        console.error("Users load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load user data."));
      }
    );

    return unsubUsers;
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

  function exportCsv() {
    downloadCsv(
      `attendance-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "internName", label: "Intern" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        { key: "checkIn", label: "Check In" },
        { key: "checkOut", label: "Check Out" },
        { key: "managerComment", label: "Manager Comment" },
      ],
      visibleRecords.map((record) => ({
        ...record,
        internName: users.find((user) => user.id === record.internId)?.name || "Unknown",
      }))
    );
  }

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
        <PageSkeleton stats={4} rows={5} />
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
        <button onClick={exportCsv} style={styles.exportBtn}>Export CSV</button>
      </div>

      <StatsRow
        items={[
          { label: "Present", value: stats.present, color: theme.success },
          { label: "Late", value: stats.late, color: theme.warning },
          { label: "Absent", value: stats.absent, color: theme.danger },
          { label: "Comments", value: stats.comments, color: theme.primary },
        ]}
      />

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
              background: filter === value ? theme.primary : theme.surface,
              color: filter === value ? "#fff" : theme.muted,
              borderColor: filter === value ? theme.primary : theme.border,
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
                                ? theme.successSoft
                                : record.status === "late"
                                  ? theme.warningSoft
                                  : theme.dangerSoft,
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
        {hasMore && (
          <button onClick={loadMore} style={styles.loadMoreBtn}>Load more</button>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  loadMoreBtn: { marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  exportBtn: { padding: "8px 14px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, fontSize: "13px", fontWeight: "600", cursor: "pointer", flexShrink: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  searchInput: { flex: "1 1 240px", padding: "10px 12px", background: theme.bg, border: "1px solid #334155", borderRadius: "8px", color: theme.text, fontSize: "14px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: "1px solid #334155" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { background: theme.bg, border: "1px solid #334155", borderRadius: "12px", padding: "14px" },
  rowMain: { display: "flex", flexDirection: "column", gap: "12px" },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "3px" },
  rowRight: { display: "flex", alignItems: "center", gap: "8px" },
  statusPill: { padding: "4px 10px", borderRadius: "999px", color: "#fff", fontSize: "11px", fontWeight: "700" },
  commentBox: { marginTop: "10px", background: theme.surfaceAlt, border: "1px solid #334155", borderRadius: "10px", padding: "12px" },
  commentLabel: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  commentText: { color: "#e2e8f0", fontSize: "13px", lineHeight: 1.5 },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
