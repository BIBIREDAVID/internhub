import { Component } from "react";
import { theme } from "../theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={styles.wrap}>
          <div style={styles.card}>
            <p style={styles.kicker}>Something went wrong</p>
            <h1 style={styles.title}>This page hit an unexpected error</h1>
            <p style={styles.message}>
              Your data is safe — reloading usually fixes this. If it keeps happening, contact HR.
            </p>
            <button onClick={() => window.location.reload()} style={styles.button}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.bg,
    padding: "24px",
  },
  card: {
    maxWidth: "440px",
    width: "100%",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    padding: "32px",
    textAlign: "left",
  },
  kicker: {
    margin: 0,
    color: theme.danger,
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 12px",
    fontSize: "20px",
    fontWeight: "700",
    color: theme.text,
  },
  message: {
    margin: "0 0 20px",
    color: theme.muted,
    fontSize: "14px",
    lineHeight: 1.6,
  },
  button: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: theme.primary,
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
