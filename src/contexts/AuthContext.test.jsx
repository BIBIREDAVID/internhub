import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

let authStateCallback;
const mockGetDoc = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, callback) => {
    authStateCallback = callback;
    return () => {};
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args) => args,
  getDoc: (...args) => mockGetDoc(...args),
}));

vi.mock("../firebase", () => ({
  auth: { currentUser: null },
  db: {},
}));

function Consumer() {
  const { currentUser, userRole, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div>user: {currentUser ? currentUser.uid : "none"}</div>
      <div>role: {userRole ?? "none"}</div>
    </div>
  );
}

beforeEach(() => {
  authStateCallback = undefined;
  mockGetDoc.mockReset();
});

describe("AuthContext", () => {
  it("has no user and no role when signed out", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateCallback).toBeDefined());
    await authStateCallback(null);

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
    expect(screen.getByText("role: none")).toBeInTheDocument();
  });

  it("resolves the role from the user's Firestore doc when signed in", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: "manager" }) });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateCallback).toBeDefined());
    await authStateCallback({ uid: "manager-1" });

    await waitFor(() => expect(screen.getByText("user: manager-1")).toBeInTheDocument());
    expect(screen.getByText("role: manager")).toBeInTheDocument();
  });

  it("treats a missing users/{uid} doc as no role, not a crash", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateCallback).toBeDefined());
    await authStateCallback({ uid: "ghost-1" });

    await waitFor(() => expect(screen.getByText("user: ghost-1")).toBeInTheDocument());
    expect(screen.getByText("role: none")).toBeInTheDocument();
  });
});
