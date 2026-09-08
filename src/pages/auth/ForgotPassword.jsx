import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../firebase";
import { theme } from "../../theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (err) {
      // Don't reveal whether an account exists for this email — only surface
      // errors that mean the request itself was malformed or blocked.
      if (err.code !== "auth/user-not-found") {
        setLoading(false);
        setError("Something went wrong. Please try again.");
        return;
      }
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>InternHub</h1>
        <p style={styles.subtitle}>Reset your password</p>

        {sent ? (
          <div style={styles.success}>
            If an account exists for that email, a password reset link is on its way. Check your inbox.
          </div>
        ) : (
          <>
            {error && <div style={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Sending..." : "Send Reset Link"}
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
    color: "#fff",
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
    color: "#fff",
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
