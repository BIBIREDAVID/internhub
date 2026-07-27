import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function weekStart() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function InternAttendance() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = todayKey();

  useEffect(() => {
    if (!currentUser) return;

    const profileUnsub = onSnapshot(doc(db, "users", currentUser.uid), (snapshot) => {
      setProfile(snapshot.exists() ? snapshot.data() : null);
      setLoading(false);
    });

    const attendanceQuery = query(collection(db, "attendance"), where("internId", "==", currentUser.uid));
    const recordsUnsub = onSnapshot(attendanceQuery, (snapshot) => {
      setRecords(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
    });

    return () => {
      profileUnsub();
      recordsUnsub();
    };
  }, [currentUser]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((left, right) => {
        const leftDate = new Date(`${left.date || "1970-01-01"}T00:00:00`);
        const rightDate = new Date(`${right.date || "1970-01-01"}T00:00:00`);
        return rightDate - leftDate;
      }),
    [records]
  );

  const todaysRecord = records.find((record) => record.date === today) || null;
  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.filter((record) => record.status === "absent").length;
  const lateCount = records.filter((record) => record.status === "late").length;
  const attendanceRate = records.length ? Math.round((presentCount / records.length) * 100) : 0;
  const recentWindowStart = weekStart();
  const recentRecords = records.filter((record) => new Date(`${record.date || "1970-01-01"}T00:00:00`) >= recentWindowStart);
  const weeklyPresent = recentRecords.filter((record) => record.status === "present").length;
  const weeklyLate = recentRecords.filter((record) => record.status === "late").length;
  const weeklyAbsent = recentRecords.filter((record) => record.status === "absent").length;
  const lastFiveDays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (4 - index));
    const key = date.toISOString().slice(0, 10);
    const record = records.find((item) => item.date === key);
    return {
      key,
      label: date.toLocaleDateString([], { weekday: "short" }),
      status: record?.status || "missing",
      record,
    };
  });
  const attendedStreak = [...records]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .reduce((streak, record, index, list) => {
      if (record.status !== "present" && record.status !== "late") {
        return streak;
      }

      if (index === 0) {
        return 1;
      }

      const previous = list[index - 1];
      const currentDate = new Date(`${record.date}T00:00:00`);
      const previousDate = new Date(`${previous.date}T00:00:00`);
      const diffDays = Math.round((currentDate - previousDate) / 86400000);

      if (diffDays === 1 && (previous.status === "present" || previous.status === "late")) {
        return streak + 1;
      }

      return streak;
    }, 0);

  async function checkIn() {
    setSaving(true);
    try {
      await setDoc(doc(db, "attendance", `${currentUser.uid}_${today}`), {
        internId: currentUser.uid,
        date: today,
        status: "present",
        checkIn: new Date().toISOString(),
        checkOut: todaysRecord?.checkOut || null,
        note: todaysRecord?.note || "",
      }, { merge: true });
    } finally {
      setSaving(false);
    }
  }

  async function checkOut() {
    setSaving(true);
    try {
      await setDoc(doc(db, "attendance", `${currentUser.uid}_${today}`), {
        internId: currentUser.uid,
        date: today,
        status: todaysRecord?.status === "late" ? "late" : "present",
        checkIn: todaysRecord?.checkIn || new Date().toISOString(),
        checkOut: new Date().toISOString(),
        note: todaysRecord?.note || "",
      }, { merge: true });
    } finally {
      setSaving(false);
    }
  }

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
          <p style={styles.sub}>
            {profile?.name ? `${profile.name} · ` : ""}
            Check in, check out, and review your attendance history.
          </p>
        </div>
        <div style={styles.actions}>
          <button disabled={saving || todaysRecord?.checkIn} onClick={checkIn} style={styles.primaryBtn}>
            {todaysRecord?.checkIn ? "Checked In" : saving ? "Saving..." : "Check In"}
          </button>
          <button disabled={saving || !todaysRecord?.checkIn || todaysRecord?.checkOut} onClick={checkOut} style={styles.secondaryBtn}>
            {todaysRecord?.checkOut ? "Checked Out" : saving ? "Saving..." : "Check Out"}
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        {[
          { label: "Present", value: presentCount, color: "#22c55e" },
          { label: "Late", value: lateCount, color: "#f59e0b" },
          { label: "Absent", value: absentCount, color: "#ef4444" },
          { label: "Attendance Rate", value: `${attendanceRate}%`, color: "#3b82f6" },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Attendance Summary</h3>
            <p style={styles.cardSub}>A quick look at the last few days and this week’s movement.</p>
          </div>
          <div style={styles.summaryBadge}>{attendedStreak} day streak</div>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryPanel}>
            <div style={styles.summaryLabel}>This week</div>
            <div style={styles.summaryValue}>{weeklyPresent + weeklyLate} marked days</div>
            <div style={styles.summaryMeta}>{weeklyPresent} present · {weeklyLate} late · {weeklyAbsent} absent</div>
          </div>
          <div style={styles.summaryPanel}>
            <div style={styles.summaryLabel}>Today</div>
            <div style={styles.summaryValue}>{todaysRecord?.status ? todaysRecord.status : "Not checked in yet"}</div>
            <div style={styles.summaryMeta}>
              Check in {displayTime(todaysRecord?.checkIn)} · Check out {displayTime(todaysRecord?.checkOut)}
            </div>
          </div>
        </div>

        <div style={styles.weekStrip}>
          {lastFiveDays.map((day) => (
            <div key={day.key} style={styles.dayTile}>
              <div style={styles.dayName}>{day.label}</div>
              <div
                style={{
                  ...styles.dayDot,
                  background:
                    day.status === "present"
                      ? "#22c55e"
                      : day.status === "late"
                        ? "#f59e0b"
                        : day.status === "absent"
                          ? "#ef4444"
                          : "#334155",
                }}
              />
              <div style={styles.dayStatus}>{day.status === "missing" ? "No record" : day.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Today</h3>
        {!todaysRecord ? (
          <p style={styles.empty}>No attendance record for today yet.</p>
        ) : (
          <div style={styles.todayRow}>
            <div>
              <div style={styles.todayLabel}>Status</div>
              <div style={styles.todayValue}>{todaysRecord.status || "present"}</div>
            </div>
            <div>
              <div style={styles.todayLabel}>Check in</div>
              <div style={styles.todayValue}>{displayTime(todaysRecord.checkIn)}</div>
            </div>
            <div>
              <div style={styles.todayLabel}>Check out</div>
              <div style={styles.todayValue}>{displayTime(todaysRecord.checkOut)}</div>
            </div>
            <div>
              <div style={styles.todayLabel}>Note</div>
              <div style={styles.todayValue}>{todaysRecord.note || "None"}</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Recent History</h3>
        {sortedRecords.length === 0 ? (
          <p style={styles.empty}>No attendance history yet.</p>
        ) : (
          <div style={styles.list}>
            {sortedRecords.slice(0, 10).map((record) => (
              <div key={record.id} style={styles.row}>
                <div style={styles.rowMain}>
                  <div style={styles.rowTitle}>{record.date}</div>
                  <div style={styles.rowMeta}>
                    In: {displayTime(record.checkIn)} · Out: {displayTime(record.checkOut)}
                  </div>
                </div>
                <div
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  loading: { color: "#94a3b8", padding: "40px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryBtn: {
    padding: "10px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  secondaryBtn: {
    padding: "10px 16px",
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    border: "1px solid #334155",
  },
  statValue: { fontSize: "28px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { color: "#64748b", fontSize: "13px" },
  card: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
    marginBottom: "16px",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  cardSub: { color: "#94a3b8", fontSize: "12px", margin: "4px 0 0" },
  summaryBadge: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  summaryPanel: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "14px",
  },
  summaryLabel: { color: "#94a3b8", fontSize: "12px", marginBottom: "6px" },
  summaryValue: { color: "#f8fafc", fontSize: "16px", fontWeight: "700" },
  summaryMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "4px", lineHeight: 1.5 },
  weekStrip: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px" },
  dayTile: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "12px 10px",
    textAlign: "center",
  },
  dayName: { color: "#94a3b8", fontSize: "12px", marginBottom: "8px" },
  dayDot: { width: "16px", height: "16px", borderRadius: "50%", margin: "0 auto 8px" },
  dayStatus: { color: "#e2e8f0", fontSize: "11px", textTransform: "capitalize" },
  empty: { color: "#94a3b8", fontSize: "13px", margin: 0 },
  todayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px",
  },
  todayLabel: { color: "#64748b", fontSize: "12px", marginBottom: "4px" },
  todayValue: { color: "#f8fafc", fontSize: "14px", fontWeight: "600" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "12px",
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: "14px" },
  rowMeta: { color: "#94a3b8", fontSize: "12px", marginTop: "3px" },
  statusPill: {
    padding: "4px 10px",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
};
