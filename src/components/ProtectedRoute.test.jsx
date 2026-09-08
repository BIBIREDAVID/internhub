import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const mockUseAuth = vi.fn();
vi.mock("../contexts/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtected(allowedRoles) {
  return render(
    <MemoryRouter initialEntries={["/hr/dashboard"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Secret HR Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when there is no signed-in user", () => {
    mockUseAuth.mockReturnValue({ currentUser: null, userRole: null });
    renderProtected(["hr"]);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret HR Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when the signed-in user's role isn't allowed", () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: "u1" }, userRole: "intern" });
    renderProtected(["hr"]);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret HR Content")).not.toBeInTheDocument();
  });

  it("renders the protected content when the role is allowed", () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: "u1" }, userRole: "hr" });
    renderProtected(["hr"]);
    expect(screen.getByText("Secret HR Content")).toBeInTheDocument();
  });

  it("renders the protected content when no allowedRoles restriction is given", () => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: "u1" }, userRole: "anything" });
    renderProtected(undefined);
    expect(screen.getByText("Secret HR Content")).toBeInTheDocument();
  });
});
