import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import Layout from "../../components/Layout";
import { notifyError, friendlyApiError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ManagerAttendance() {
  const [interns, setInterns] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draftComments, setDraftComments] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/users"), api.get("/attendance")])
      .then(([internsData, attendanceData]) => {
        if (cancelled) return;
        setInterns(internsData);
        setAttendance(attendanceData);
      })
      .catch((error) => {
        console.error("Attendance load error:", error);
        notifyError(friendlyApiError(error, "Couldn't load attendance."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const visibleRecords = useMemo(() => {
    return attendance
      .filter((record) => {
        if (filter !== "all" && record.status !== filter) return false;
        const intern = interns.find((item) => item.uid === record.intern_id);
        const searchText = `${intern?.name || ""} ${intern?.email || ""} ${record.date || ""}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .sort((left, right) => new Date(`${right.date}T00:00:00`) - new Date(`${left.date}T00:00:00`));
  }, [attendance, filter, interns, search]);

  const stats = useMemo(() => {
    const todaysRecords = visibleRecords.filter((record) => record.date === today);
    const present = todaysRecords.filter((record) => record.status === "present").length;
    const late = todaysRecords.filter((record) => record.status === "late").length;
    const comments = visibleRecords.filter((record) => record.manager_comment).length;
    return { present, late, comments };
  }, [today, visibleRecords]);

  async function saveComment(recordId, managerComment) {
    try {
      const updated = await api.patch(`/attendance/${recordId}`, { manager_comment: managerComment });
      setAttendance((current) => current.map((record) => (record.attendance_id === recordId ? updated : record)));
    } catch (error) {
      console.error("Save comment error:", error);
      notifyError(friendlyApiError(error, "Couldn't save the comment. Please try again."));
    }
  }

  async function updateStatus(recordId, status) {
    try {
      const updated = await api.patch(`/attendance/${recordId}`, { status });
      setAttendance((current) => current.map((record) => (record.attendance_id === recordId ? updated : record)));
    } catch (error) {
      console.error("Update attendance status error:", error);
      notifyError(friendlyApiError(error, "Couldn't update the status. Please try again."));
    }
  }

  if (loading) {
    return (
      <Layout pageTitle="Attendance">
        <PageSkeleton stats={4} rows={4} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Attendance">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Attendance</h2>
          <p style={styles.sub}>Monitor team attendance, correct statuses, and add manager comments.</p>
        </div>
      </div>

      <StatsRow
        items={[
          { label: "Checked In Today", value: stats.present, color: theme.success },
          { label: "Late Today", value: stats.late, color: theme.warning },
          { label: "Comments Added", value: stats.comments, color: theme.primary },
          { label: "Tracked Records", value: visibleRecords.length, color: theme.info },
        ]}
      />

      <div style={styles.toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by intern or date..."
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
        <div style={styles.cardTitle}>Attendance Log</div>
        <div style={styles.list}>
          {visibleRecords.length === 0 ? (
            <p style={styles.empty}>No attendance records match this filter.</p>
          ) : (
            visibleRecords.map((record) => {
              const intern = interns.find((item) => item.uid === record.intern_id);
              return (
                <div key={record.attendance_id} style={styles.row}>
                  <div style={styles.rowMain}>
                    <div style={styles.rowHeader}>
                      <div>
                        <div style={styles.rowTitle}>{intern?.name || "Unknown intern"}</div>
                        <div style={styles.rowMeta}>
                          {record.date} · Check in {displayTime(record.check_in)} · Check out {displayTime(record.check_out)}
                        </div>
                      </div>
                      <div style={styles.rowRight}>
                        <select
                          value={record.status || "present"}
                          onChange={(event) => updateStatus(record.attendance_id, event.target.value)}
                          style={{
                            ...styles.statusSelect,
                            background:
                              record.status === "present"
                                ? theme.successSoft
                                : record.status === "late"
                                  ? theme.warningSoft
                                  : theme.dangerSoft,
                          }}
                        >
                          <option value="present">present</option>
                          <option value="late">late</option>
                          <option value="absent">absent</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      value={draftComments[record.attendance_id] ?? record.manager_comment ?? ""}
                      onChange={(event) =>
                        setDraftComments((current) => ({ ...current, [record.attendance_id]: event.target.value }))
                      }
                      onBlur={() => saveComment(record.attendance_id, draftComments[record.attendance_id] ?? record.manager_comment ?? "")}
                      placeholder="Add a manager comment..."
                      style={styles.commentBox}
                    />
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  searchInput: { flex: "1 1 240px", padding: "10px 12px", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "14px" },
  filterBtn: { borderRadius: "999px", border: "1px solid", padding: "8px 14px", fontSize: "13px", cursor: "pointer" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px" },
  rowMain: { display: "flex", flexDirection: "column", gap: "10px" },
  rowHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" },
  rowTitle: { color: theme.text, fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: theme.muted, fontSize: "12px", marginTop: "4px" },
  rowRight: { display: "flex", alignItems: "center", gap: "8px" },
  statusSelect: { border: "none", color: "#fff", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", fontWeight: "700" },
  commentBox: { width: "100%", minHeight: "76px", resize: "vertical", background: theme.surfaceAlt, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "10px 12px", boxSizing: "border-box", fontSize: "13px" },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
};
