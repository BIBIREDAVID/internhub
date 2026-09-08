import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard"));
const HRApplications = lazy(() => import("./pages/hr/HRApplications"));
const HRPipeline = lazy(() => import("./pages/hr/HRPipeline"));
const HRInterns = lazy(() => import("./pages/hr/HRInterns"));
const HRInvites = lazy(() => import("./pages/hr/HRInvites"));
const HROnboarding = lazy(() => import("./pages/hr/HROnboarding"));
const HRAttendance = lazy(() => import("./pages/hr/HRAttendance"));
const HRReports = lazy(() => import("./pages/hr/HRReports"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerInterns = lazy(() => import("./pages/manager/ManagerInterns"));
const ManagerTasks = lazy(() => import("./pages/manager/ManagerTasks"));
const ManagerAttendance = lazy(() => import("./pages/manager/ManagerAttendance"));
const InternDashboard = lazy(() => import("./pages/intern/InternDashboard"));
const InternTasks = lazy(() => import("./pages/intern/InternTasks"));
const InternAttendance = lazy(() => import("./pages/intern/InternAttendance"));
const InternOnboarding = lazy(() => import("./pages/intern/InternOnboarding"));

function RouteFallback() {
  return <div style={{ minHeight: "100vh", background: "#0f172a" }} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/hr/dashboard" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRDashboard />
            </ProtectedRoute>
          } />

          <Route path="/hr/applications" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRApplications />
            </ProtectedRoute>
          } />

          <Route path="/hr/pipeline" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRPipeline />
            </ProtectedRoute>
          } />

          <Route path="/hr/interns" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRInterns />
            </ProtectedRoute>
          } />

          <Route path="/hr/invites" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRInvites />
            </ProtectedRoute>
          } />

          <Route path="/hr/onboarding" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HROnboarding />
            </ProtectedRoute>
          } />

          <Route path="/hr/attendance" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRAttendance />
            </ProtectedRoute>
          } />

          <Route path="/hr/reports" element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HRReports />
            </ProtectedRoute>
          } />

          <Route path="/manager/dashboard" element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/manager/interns" element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerInterns />
            </ProtectedRoute>
          } />

          <Route path="/manager/tasks" element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerTasks />
            </ProtectedRoute>
          } />

          <Route path="/manager/attendance" element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerAttendance />
            </ProtectedRoute>
          } />

          <Route path="/intern/dashboard" element={
            <ProtectedRoute allowedRoles={["intern"]}>
              <InternDashboard />
            </ProtectedRoute>
          } />

          <Route
            path="/intern/tasks"
            element={
              <ProtectedRoute allowedRoles={["intern"]}>
                <InternTasks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/intern/attendance"
            element={
              <ProtectedRoute allowedRoles={["intern"]}>
                <InternAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/intern/onboarding"
            element={
              <ProtectedRoute allowedRoles={["intern"]}>
                <InternOnboarding />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
