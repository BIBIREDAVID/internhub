import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";
import { useAttendanceStats } from "./hooks/useAttendanceStats";
import WeekStrip from "./components/WeekStrip";
import AttendanceHistoryList from "./components/AttendanceHistoryList";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function displayTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    const profileUnsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error("Profile load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load your profile."));
        setLoading(false);
      }
    );

    const attendanceQuery = query(collection(db, "attendance"), where("internId", "==", currentUser.uid));
    const recordsUnsub = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setRecords(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      },
      (error) => {
        console.error("Attendance load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load attendance records."));
      }
    );

    return () => {
      profileUnsub();
      recordsUnsub();
    };
  }, [currentUser]);

  const {
    sortedRecords,
    todaysRecord,
    presentCount,
    absentCount,
    lateCount,
    attendanceRate,
    weeklyPresent,
    weeklyLate,
    weeklyAbsent,
    lastFiveDays,
    attendedStreak,
  } = useAttendanceStats(records, today);

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
    } catch (error) {
      console.error("Check-in error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't check in. Please try again."));
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
    } catch (error) {
      console.error("Check-out error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't check out. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout pageTitle="Attendance">
        <PageSkeleton stats={4} rows={3} />
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

      <StatsRow
        items={[
          { label: "Present", value: presentCount, color: theme.success },
          { label: "Late", value: lateCount, color: theme.warning },
          { label: "Absent", value: absentCount, color: theme.danger },
          { label: "Attendance Rate", value: `${attendanceRate}%`, color: theme.primary },
        ]}
      />

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Attendance Summary</h3>
            <p style={styles.cardSub}>A quick look at the last few days and this week's movement.</p>
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

        <WeekStrip days={lastFiveDays} />
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
        <AttendanceHistoryList records={sortedRecords} />
      </div>
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryBtn: { padding: "10px 16px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  secondaryBtn: { padding: "10px 16px", background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}`, marginBottom: "16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  cardSub: { color: theme.muted, fontSize: "12px", margin: "4px 0 0" },
  summaryBadge: { padding: "6px 10px", borderRadius: "999px", background: theme.bg, border: `1px solid ${theme.border}`, color: theme.muted, fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" },
  summaryPanel: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "14px" },
  summaryLabel: { color: theme.muted, fontSize: "12px", marginBottom: "6px" },
  summaryValue: { color: theme.text, fontSize: "16px", fontWeight: "700" },
  summaryMeta: { color: theme.muted, fontSize: "12px", marginTop: "4px", lineHeight: 1.5 },
  empty: { color: theme.muted, fontSize: "13px", margin: 0 },
  todayRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" },
  todayLabel: { color: theme.faint, fontSize: "12px", marginBottom: "4px" },
  todayValue: { color: theme.text, fontSize: "14px", fontWeight: "600" },
};
