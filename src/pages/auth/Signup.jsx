import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useAuth } from "../../contexts/useAuth";
import { theme } from "../../theme";

const dashboardByRole = {
  hr: "/hr/dashboard",
  manager: "/manager/dashboard",
  intern: "/intern/dashboard",
};

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserRole } = useAuth();

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    let credential;

    try {
      credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 8 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("Something went wrong creating your account. Please try again.");
      }
      setLoading(false);
      return;
    }

    const inviteRef = doc(db, "invites", normalizedEmail);
    let invite;

    try {
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        await credential.user.delete();
        setError("No invitation found for this email. Ask HR to invite you first.");
        setLoading(false);
        return;
      }

      invite = inviteSnap.data();
      const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
      if (invite.expiresAt && expiresAt.getTime() < Date.now()) {
        await credential.user.delete();
        setError("This invitation has expired. Ask HR to resend it.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Invite lookup error:", err);
      await credential.user.delete().catch(() => {});
      setError("Couldn't verify your invitation. Please try again.");
      setLoading(false);
      return;
    }

    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        email: normalizedEmail,
        name: invite.name || "",
        role: invite.role,
        managerId: invite.managerId || null,
        onboardingChecklist: [],
        onboardingStep: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Account provisioning error:", err);
      await credential.user.delete().catch(() => {});
      setError("Couldn't finish setting up your account (the invite may have just expired). Ask HR to resend it and try again.");
      setLoading(false);
      return;
    }

    try {
      await deleteDoc(inviteRef);
    } catch (err) {
      // The account is provisioned; a stale invite doc left behind is
      // harmless (it just can't be redeemed again) — not worth failing over.
      console.warn("Couldn't clean up invite after signup:", err);
    }

    await refreshUserRole();
    navigate(dashboardByRole[invite.role] || "/login");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>InternHub</h1>
        <p style={styles.subtitle}>Create your account (invite required)</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSignup} style={styles.form}>
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

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Repeat your password"
              minLength={8}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
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
