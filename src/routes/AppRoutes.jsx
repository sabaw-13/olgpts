import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RoleBasedRoute from '../components/auth/RoleBasedRoute.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import EnrollmentPage from '../pages/enrollment/EnrollmentPage.jsx';
import FeesPage from '../pages/fees/FeesPage.jsx';
import PaymentsPage from '../pages/payments/PaymentsPage.jsx';
import ReceiptsPage from '../pages/receipts/ReceiptsPage.jsx';
import ReportsPage from '../pages/reports/ReportsPage.jsx';
import SchoolSetupPage from '../pages/school-setup/SchoolSetupPage.jsx';
import StaffManagementPage from '../pages/staff/StaffManagementPage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

function HomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path="/dashboard"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <DashboardPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <EnrollmentPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/graduated-students"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <EnrollmentPage graduatedOnly />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/school-setup"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <SchoolSetupPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/enrollment"
          element={<Navigate to="/students" replace />}
        />
        <Route
          path="/fees"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <FeesPage />
            </RoleBasedRoute>
          }
        />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route
          path="/receipts"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <ReceiptsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <ReportsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <StaffManagementPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleBasedRoute allowedRoles={['admin', 'staff']}>
              <SettingsPage />
            </RoleBasedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
