// Shared theme tokens. The structural tokens (bg/surface/border/text/muted/
// faint) resolve to CSS custom properties defined in index.css, so they
// automatically follow the light/dark toggle (see ThemeContext) without any
// component needing to re-render — the browser just repaints on the
// `data-theme` attribute change. Accent/semantic colors (primary, success,
// warning, danger, info) stay constant across both themes by design, the
// same way a brand or status-badge color would on any product.
export const theme = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surfaceAlt: "var(--color-surface-alt)",
  border: "var(--color-border)",
  text: "var(--color-text)",
  muted: "var(--color-muted)",
  faint: "var(--color-faint)",

  primary: "#3b82f6",
  primaryStrong: "#2563eb",
  primarySoft: "#3b82f618",

  success: "#22c55e",
  successStrong: "#16a34a",
  successSoft: "#166534",
  successBg: "#dcfce7",

  warning: "#f59e0b",
  warningStrong: "#d97706",
  warningSoft: "#92400e",
  warningBg: "#fef3c7",

  danger: "#ef4444",
  dangerStrong: "#dc2626",
  dangerSoft: "#991b1b",
  dangerBg: "#fee2e2",

  info: "#a855f7",
};
