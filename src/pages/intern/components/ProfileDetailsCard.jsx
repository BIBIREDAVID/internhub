import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { notifyError, notifySuccess, friendlyFirestoreError } from "../../../utils/toast";
import { theme } from "../../../theme";

export default function ProfileDetailsCard({ currentUser, profile }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setName(profile?.name || "");
    setDepartment(profile?.department || "");
    setEditing(true);
  }

  async function save() {
    if (!name.trim()) {
      notifyError("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: name.trim(),
        department: department.trim(),
      });
      notifySuccess("Profile updated.");
      setEditing(false);
    } catch (error) {
      console.error("Profile update error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setName(profile?.name || "");
    setDepartment(profile?.department || "");
    setEditing(false);
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>Your Details</div>
        {!editing && (
          <button onClick={startEditing} style={styles.editBtn}>Edit</button>
        )}
      </div>

      {editing ? (
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} style={styles.input} placeholder="e.g. Engineering" />
          </div>
          <div style={styles.formActions}>
            <button onClick={cancel} disabled={saving} style={styles.cancelBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={styles.saveBtn}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      ) : (
        <div style={styles.detailsGrid}>
          <div>
            <div style={styles.detailLabel}>Name</div>
            <div style={styles.detailValue}>{profile?.name || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Department</div>
            <div style={styles.detailValue}>{profile?.department || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Cohort</div>
            <div style={styles.detailValue}>{profile?.cohortId || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>Start Date</div>
            <div style={styles.detailValue}>{profile?.startDate || "Not set"}</div>
          </div>
          <div>
            <div style={styles.detailLabel}>End Date</div>
            <div style={styles.detailValue}>{profile?.endDate || "Not set"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: theme.surface, borderRadius: "12px", padding: "20px", border: `1px solid ${theme.border}`, marginBottom: "16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: 0, color: theme.text },
  editBtn: { padding: "6px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.primary, fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginTop: "16px" },
  detailLabel: { color: theme.muted, fontSize: "12px", marginBottom: "4px" },
  detailValue: { color: theme.text, fontSize: "14px", fontWeight: "600" },
  form: { display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px", maxWidth: "360px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: theme.muted, fontSize: "12px", fontWeight: "500" },
  input: { padding: "10px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "14px" },
  formActions: { display: "flex", gap: "10px" },
  cancelBtn: { padding: "8px 14px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: "transparent", color: theme.muted, fontSize: "13px", cursor: "pointer" },
  saveBtn: { padding: "8px 14px", borderRadius: "8px", border: "none", background: theme.primary, color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
};
