import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import HRDashboard from "./pages/hr/HRDashboard";
import HRApplications from "./pages/hr/HRApplications";
import HRPipeline from "./pages/hr/HRPipeline";
import HRInterns from "./pages/hr/HRInterns";
import HROnboarding from "./pages/hr/HROnboarding";
import HRAttendance from "./pages/hr/HRAttendance";
import HRReports from "./pages/hr/HRReports";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerInterns from "./pages/manager/ManagerInterns";
import ManagerTasks from "./pages/manager/ManagerTasks";
import ManagerAttendance from "./pages/manager/ManagerAttendance";
import InternDashboard from "./pages/intern/InternDashboard";
import InternTasks from "./pages/intern/InternTasks";
import InternAttendance from "./pages/intern/InternAttendance";
import InternOnboarding from "./pages/intern/InternOnboarding";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

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

        <Route path="/hr/reports" element={
          <ProtectedRoute allowedRoles={["hr"]}>
            <HRReports />
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
    </BrowserRouter>
  );
}
