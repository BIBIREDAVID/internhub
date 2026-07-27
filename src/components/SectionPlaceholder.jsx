import Layout from "./Layout";

export default function SectionPlaceholder({ title, description, pageTitle }) {
  return (
    <Layout pageTitle={pageTitle || title}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.kicker}>Coming soon</p>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.description}>{description}</p>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  wrap: {
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    maxWidth: "560px",
    width: "100%",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "left",
  },
  kicker: {
    margin: 0,
    color: "#3b82f6",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 12px",
    fontSize: "24px",
    fontWeight: "700",
    color: "#f8fafc",
  },
  description: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.6,
  },
};
