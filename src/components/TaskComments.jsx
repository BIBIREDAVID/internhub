import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/useAuth";
import { notifyError, friendlyFirestoreError } from "../utils/toast";
import { theme } from "../theme";

export default function TaskComments({ taskId }) {
  const { currentUser, userRole } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "tasks", taskId, "comments"), orderBy("createdAt", "asc")),
      (snapshot) => {
        setComments(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Comments load error:", error);
        notifyError(friendlyFirestoreError(error, "Couldn't load comments."));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [taskId]);

  async function postComment(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "tasks", taskId, "comments"), {
        authorId: currentUser.uid,
        authorName: currentUser.email,
        authorRole: userRole,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      });
      setText("");
    } catch (error) {
      console.error("Post comment error:", error);
      notifyError(friendlyFirestoreError(error, "Couldn't post your comment. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.wrap}>
      {loading ? (
        <p style={styles.empty}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={styles.empty}>No comments yet.</p>
      ) : (
        <div style={styles.list}>
          {comments.map((comment) => (
            <div key={comment.id} style={styles.comment}>
              <div style={styles.commentMeta}>
                <span style={styles.commentAuthor}>{comment.authorName || "Someone"}</span>
                <span style={styles.commentTime}>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <div style={styles.commentText}>{comment.text}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={postComment} style={styles.form}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          style={styles.input}
        />
        <button type="submit" disabled={sending || !text.trim()} style={styles.sendBtn}>
          {sending ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${theme.border}` },
  empty: { color: theme.muted, fontSize: "12px", margin: "0 0 10px" },
  list: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "10px" },
  comment: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "10px" },
  commentMeta: { display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "4px" },
  commentAuthor: { color: theme.text, fontSize: "12px", fontWeight: "600" },
  commentTime: { color: theme.faint, fontSize: "11px" },
  commentText: { color: theme.muted, fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-wrap" },
  form: { display: "flex", gap: "8px", alignItems: "flex-end" },
  input: { flex: 1, minHeight: "44px", resize: "vertical", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "13px", boxSizing: "border-box" },
  sendBtn: { padding: "8px 14px", borderRadius: "8px", border: "none", background: theme.primary, color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", flexShrink: 0 },
};
