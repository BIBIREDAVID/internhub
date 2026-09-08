import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { notifyError, notifySuccess, friendlyFirestoreError } from "../../utils/toast";
import { theme } from "../../theme";
import { PageSkeleton } from "../../components/Skeleton";

const emptyForm = { email: "", name: "", role: "intern", managerId: "" };

export default function HRInvites() {
  const { currentUser } = useAuth();
  const [invites, setInvites] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubInvites = onSnapshot(
      query(collection(db, "invites")),
      (snapshot) => {
        setInvites(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Invites load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load invites."));
        setLoading(false);
      }
    );

    const unsubManagers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "manager")),
      (snapshot) => {
        setManagers(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      },
      (error) => {
        console.error("Managers load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load managers."));
      }
    );

    return () => {
      unsubInvites();
      unsubManagers();
    };
  }, []);

  async function sendInvite(e) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (!email || !name) {
      notifyError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "invites", email), {
        email,
        name,
        role: form.role,
        managerId: form.role === "intern" && form.managerId ? form.managerId : null,
        invitedBy: currentUser.uid,
        invitedAt: new Date().toISOString(),
      });
      notifySuccess(`Invite sent for ${email}.`);
      setForm(emptyForm);
    } catch (error) {
      console.error("Send invite error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't send the invite. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function cancelInvite(email) {
    try {
      await deleteDoc(doc(db, "invites", email));
      notifySuccess("Invite cancelled.");
    } catch (error) {
      console.error("Cancel invite error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't cancel the invite. Please try again."));
    }
  }

  if (loading) {
    return (
      <Layout pageTitle="Invites">
        <PageSkeleton stats={0} rows={3} />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Invites">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Invites</h2>
          <p style={styles.sub}>
            InternHub has no admin console — this is how new HR, manager, and intern accounts get created.
            Send an invite here, then have the person sign up at <strong>/signup</strong> with this exact email.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Send an Invite</div>
          <form onSubmit={sendInvite} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                style={styles.input}
                placeholder="Jordan Lee"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                style={styles.input}
                placeholder="jordan@company.com"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((current) => ({ ...current, role: e.target.value, managerId: "" }))}
                style={styles.input}
              >
                <option value="intern">Intern</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
              </select>
            </div>
            {form.role === "intern" && (
              <div style={styles.field}>
                <label style={styles.label}>Manager (optional)</label>
                <select
                  value={form.managerId}
                  onChange={(e) => setForm((current) => ({ ...current, managerId: e.target.value }))}
                  style={styles.input}
                >
                  <option value="">Unassigned — assign later</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Pending Invites ({invites.length})</div>
          <div style={styles.list}>
            {invites.length === 0 ? (
              <p style={styles.empty}>No pending invites.</p>
            ) : (
              invites.map((invite) => (
                <div key={invite.id} style={styles.row}>
                  <div>
                    <div style={styles.rowTitle}>{invite.name || "Unnamed"}</div>
                    <div style={styles.rowMeta}>{invite.email} · {invite.role}</div>
                  </div>
                  <button onClick={() => cancelInvite(invite.id)} style={styles.cancelBtn}>Cancel</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: "24px" },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { color: theme.faint, fontSize: "13px", marginTop: "8px", lineHeight: 1.6, maxWidth: "640px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" },
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}` },
  cardTitle: { fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: theme.muted, fontSize: "12px", fontWeight: "500" },
  input: { padding: "10px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "14px" },
  primaryBtn: { padding: "10px", borderRadius: "8px", border: "none", background: theme.primary, color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "4px" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px 14px" },
  rowTitle: { color: theme.text, fontWeight: "600", fontSize: "13px" },
  rowMeta: { color: theme.faint, fontSize: "12px", marginTop: "2px" },
  cancelBtn: { padding: "6px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.danger, fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  empty: { color: theme.faint, fontSize: "13px", margin: 0 },
};
