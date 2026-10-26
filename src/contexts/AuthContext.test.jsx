import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
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
  api.get.mockReset();
});

describe("AuthContext", () => {
  it("has no user and no role when signed out", async () => {
    api.get.mockRejectedValue(Object.assign(new Error("Not authenticated"), { status: 401 }));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
    expect(screen.getByText("role: none")).toBeInTheDocument();
  });

  it("resolves the role from /auth/me when signed in", async () => {
    api.get.mockResolvedValue({ uid: "manager-1", role: "manager" });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("user: manager-1")).toBeInTheDocument());
    expect(screen.getByText("role: manager")).toBeInTheDocument();
  });

  it("treats a failed /auth/me lookup as no user, not a crash", async () => {
    api.get.mockRejectedValue(Object.assign(new Error("Not authenticated"), { status: 401 }));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
    expect(screen.getByText("role: none")).toBeInTheDocument();
  });
});
