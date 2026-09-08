import { useMemo } from "react";

function weekStart() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Derives every attendance-page metric from the raw record list in one place. */
export function useAttendanceStats(records, today) {
  return useMemo(() => {
    const sortedRecords = [...records].sort((left, right) => {
      const leftDate = new Date(`${left.date || "1970-01-01"}T00:00:00`);
      const rightDate = new Date(`${right.date || "1970-01-01"}T00:00:00`);
      return rightDate - leftDate;
    });

    const todaysRecord = records.find((record) => record.date === today) || null;
    const presentCount = records.filter((record) => record.status === "present").length;
    const absentCount = records.filter((record) => record.status === "absent").length;
    const lateCount = records.filter((record) => record.status === "late").length;
    const attendanceRate = records.length ? Math.round((presentCount / records.length) * 100) : 0;

    const recentWindowStart = weekStart();
    const recentRecords = records.filter(
      (record) => new Date(`${record.date || "1970-01-01"}T00:00:00`) >= recentWindowStart
    );
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
        if (record.status !== "present" && record.status !== "late") return streak;
        if (index === 0) return 1;

        const previous = list[index - 1];
        const currentDate = new Date(`${record.date}T00:00:00`);
        const previousDate = new Date(`${previous.date}T00:00:00`);
        const diffDays = Math.round((currentDate - previousDate) / 86400000);

        if (diffDays === 1 && (previous.status === "present" || previous.status === "late")) {
          return streak + 1;
        }
        return streak;
      }, 0);

    return {
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
    };
  }, [records, today]);
}
