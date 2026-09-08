import { theme } from "../theme";

export function Skeleton({ width = "100%", height = "16px", radius = "6px", style }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: theme.border,
        animation: "skeleton-pulse 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function StatsRowSkeleton({ count = 4 }) {
  return (
    <div style={styles.statsRow}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={styles.statCard}>
          <Skeleton width="48px" height="28px" style={{ margin: "0 auto 8px" }} />
          <Skeleton width="70%" height="12px" style={{ margin: "0 auto" }} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div style={styles.list}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={styles.row}>
          <Skeleton width="36px" height="36px" radius="50%" />
          <div style={styles.rowBody}>
            <Skeleton width="45%" height="14px" />
            <Skeleton width="70%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches the common page shape: header + stat row + a card with list rows. */
export function PageSkeleton({ stats = 4, rows = 4 }) {
  return (
    <div>
      <div style={styles.header}>
        <Skeleton width="180px" height="22px" />
        <Skeleton width="320px" height="13px" style={{ marginTop: "10px" }} />
      </div>
      <StatsRowSkeleton count={stats} />
      <div style={styles.card}>
        <ListSkeleton rows={rows} />
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: "24px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" },
  statCard: { background: theme.surface, borderRadius: "12px", padding: "20px", textAlign: "center", border: `1px solid ${theme.border}` },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  row: { display: "flex", alignItems: "center", gap: "12px" },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: "8px" },
};
