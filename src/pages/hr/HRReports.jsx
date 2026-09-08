import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import Layout from "../../components/Layout";
import { notifyError, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import StatsRow from "../../components/StatsRow";
import { PageSkeleton } from "../../components/Skeleton";

const pipelineStages = ["new", "screening", "interview", "offer", "onboarding", "rejected"];

function daysAgoKey(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function HRReports() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collections = [
      { name: "users", setter: setUsers },
      { name: "tasks", setter: setTasks },
      { name: "attendance", setter: setAttendance },
      { name: "applications", setter: setApplications },
    ];

    let pending = collections.length;
    const unsubs = collections.map(({ name, setter }) =>
      onSnapshot(
        collection(db, name),
        (snapshot) => {
          setter(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
          pending = Math.max(0, pending - 1);
          if (pending === 0) setLoading(false);
        },
        (error) => {
          console.error(`Reports ${name} load error:`, error);
          notifyError(friendlyFirestoreError(error, `Couldn't load ${name} for reports.`));
          pending = Math.max(0, pending - 1);
          if (pending === 0) setLoading(false);
        }
      )
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const interns = useMemo(() => users.filter((user) => user.role === "intern"), [users]);
  const managers = useMemo(() => users.filter((user) => user.role === "manager"), [users]);

  const taskStats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in-progress").length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    return { total: tasks.length, completed, inProgress, pending, rate };
  }, [tasks]);

  const onboardingStats = useMemo(() => {
    if (interns.length === 0) return { avgStep: 0, totalSteps: 5, complete: 0 };
    const totalSteps = 5;
    const sumSteps = interns.reduce((sum, intern) => sum + (intern.onboardingStep || 0), 0);
    const complete = interns.filter((intern) => (intern.onboardingStep || 0) >= totalSteps).length;
    return { avgStep: sumSteps / interns.length, totalSteps, complete };
  }, [interns]);

  const attendanceStats = useMemo(() => {
    const last7 = new Set(Array.from({ length: 7 }, (_, index) => daysAgoKey(index)));
    const recent = attendance.filter((record) => last7.has(record.date));
    const present = recent.filter((record) => record.status === "present").length;
    const late = recent.filter((record) => record.status === "late").length;
    const absent = recent.filter((record) => record.status === "absent").length;
    const rate = recent.length ? Math.round(((present + late) / recent.length) * 100) : 0;
    return { total: recent.length, present, late, absent, rate };
  }, [attendance]);

  const pipelineCounts = useMemo(() => {
    return pipelineStages.reduce((accumulator, stage) => {
      accumulator[stage] = applications.filter(
        (application) => (application.stage || application.status || "new") === stage
      ).length;
      return accumulator;
    }, {});
  }, [applications]);

  const maxPipelineCount = Math.max(1, ...pipelineStages.map((stage) => pipelineCounts[stage] || 0));

  if (loading) {
    return (
      <Layout pageTitle="Reports">
        <PageSkeleton stats={4} rows={4} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Reports">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Reports</h2>
          <p style={styles.sub}>Team-wide insights across recruitment, onboarding, tasks, and attendance.</p>
        </div>
      </div>

      <StatsRow
        items={[
          { label: "Total Interns", value: interns.length, color: theme.primary },
          { label: "Total Managers", value: managers.length, color: theme.info },
          { label: "Task Completion", value: `${taskStats.rate}%`, color: theme.success },
          { label: "7-Day Attendance", value: `${attendanceStats.rate}%`, color: theme.warning },
        ]}
      />

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recruitment Pipeline</div>
          <div style={styles.pipeline}>
            {pipelineStages.map((stage) => {
              const count = pipelineCounts[stage] || 0;
              return (
                <div key={stage} style={styles.pipelineRow}>
                  <div style={styles.pipelineLabel}>{stage}</div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${(count / maxPipelineCount) * 100}%`,
                        background: stage === "rejected" ? theme.danger : theme.primary,
                      }}
                    />
                  </div>
                  <div style={styles.pipelineCount}>{count}</div>
                </div>
              );
            })}
            {applications.length === 0 && <p style={styles.empty}>No applications recorded yet.</p>}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Task Breakdown</div>
          <div style={styles.taskBreakdown}>
            {[
              { label: "Completed", value: taskStats.completed, color: theme.success },
              { label: "In Progress", value: taskStats.inProgress, color: theme.warning },
              { label: "Pending", value: taskStats.pending, color: theme.faint },
            ].map((row) => (
              <div key={row.label} style={styles.pipelineRow}>
                <div style={styles.pipelineLabel}>{row.label}</div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${taskStats.total ? (row.value / taskStats.total) * 100 : 0}%`,
                      background: row.color,
                    }}
                  />
                </div>
                <div style={styles.pipelineCount}>{row.value}</div>
              </div>
            ))}
            {taskStats.total === 0 && <p style={styles.empty}>No tasks assigned yet.</p>}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Onboarding Progress</div>
          <p style={styles.metric}>
            Average step {onboardingStats.avgStep.toFixed(1)} / {onboardingStats.totalSteps}
          </p>
          <p style={styles.metricSub}>
            {onboardingStats.complete} of {interns.length} intern{interns.length === 1 ? "" : "s"} fully onboarded
          </p>
          <div style={styles.barTrack}>
            <div
              style={{
                ...styles.barFill,
                width: `${interns.length ? (onboardingStats.avgStep / onboardingStats.totalSteps) * 100 : 0}%`,
                background: theme.info,
              }}
            />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Attendance (Last 7 Days)</div>
          <div style={styles.taskBreakdown}>
            {[
              { label: "Present", value: attendanceStats.present, color: theme.success },
              { label: "Late", value: attendanceStats.late, color: theme.warning },
              { label: "Absent", value: attendanceStats.absent, color: theme.danger },
            ].map((row) => (
              <div key={row.label} style={styles.pipelineRow}>
                <div style={styles.pipelineLabel}>{row.label}</div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${attendanceStats.total ? (row.value / attendanceStats.total) * 100 : 0}%`,
                      background: row.color,
                    }}
                  />
                </div>
                <div style={styles.pipelineCount}>{row.value}</div>
              </div>
            ))}
            {attendanceStats.total === 0 && <p style={styles.empty}>No attendance records in the last 7 days.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "4px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  pipeline: { display: "flex", flexDirection: "column", gap: "10px" },
  taskBreakdown: { display: "flex", flexDirection: "column", gap: "10px" },
  pipelineRow: { display: "grid", gridTemplateColumns: "100px 1fr 32px", alignItems: "center", gap: "10px" },
  pipelineLabel: { color: theme.muted, fontSize: "12px", textTransform: "capitalize" },
  pipelineCount: { color: theme.text, fontSize: "12px", fontWeight: "600", textAlign: "right" },
  barTrack: { background: theme.bg, borderRadius: "999px", height: "8px", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: "999px", transition: "width 0.2s ease" },
  metric: { fontSize: "20px", fontWeight: "700", margin: "0 0 4px 0" },
  metricSub: { color: theme.faint, fontSize: "12px", margin: "0 0 14px 0" },
  empty: { color: theme.faint, fontSize: "13px", margin: 0 },
};
