import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { theme } from "../../theme";
import { api } from "../../api";
import { friendlyApiError } from "../../utils/toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(friendlyApiError(err, "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>InternHub</h1>
        <p style={styles.subtitle}>Choose a new password</p>

        {done ? (
          <div style={styles.success}>
            Your password has been reset.{" "}
            <Link to="/login" style={styles.link}>Sign in</Link> with your new password.
          </div>
        ) : (
          <>
            {error && <div style={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Saving..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        <p style={styles.footer}>
          <Link to="/login" style={styles.link}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.bg,
  },
  card: {
    background: theme.surface,
    padding: "40px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  title: {
    color: theme.text,
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "4px",
    textAlign: "center",
  },
  subtitle: {
    color: theme.faint,
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "32px",
  },
  error: {
    background: theme.dangerBg,
    color: theme.dangerStrong,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "16px",
  },
  success: {
    background: theme.successBg,
    color: theme.successStrong,
    padding: "12px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: theme.muted,
    fontSize: "13px",
    fontWeight: "500",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${theme.border}`,
    background: theme.bg,
    color: theme.text,
    fontSize: "14px",
    outline: "none",
  },
  button: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: theme.primary,
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
  },
  footer: {
    marginTop: "20px",
    textAlign: "center",
    color: theme.faint,
    fontSize: "13px",
  },
  link: {
    color: theme.primary,
    fontWeight: "600",
  },
};
