import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RoleBasedRoute from '../components/auth/RoleBasedRoute.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage.jsx'));
const EnrollmentPage = lazy(() => import('../pages/enrollment/EnrollmentPage.jsx'));
const StudentRecordsPage = lazy(() => import('../pages/students/StudentRecordsPage.jsx'));
const PaymentHubPage = lazy(() => import('../pages/payments/PaymentHubPage.jsx'));
const SettingsPage = lazy(() => import('../pages/school-setup/SettingsPage.jsx'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage.jsx'));
const FacultyStaffPage = lazy(() => import('../pages/staff/FacultyStaffPage.jsx'));

function HomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading page...</div>}>
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
                <StudentRecordsPage />
              </RoleBasedRoute>
            }
          />
          <Route path="/students/graduated" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><StudentRecordsPage graduatedOnly /></RoleBasedRoute>} />
          <Route path="/enrollment" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><EnrollmentPage /></RoleBasedRoute>} />
          <Route path="/payments" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><PaymentHubPage /></RoleBasedRoute>} />
          <Route path="/payments/receipts" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><PaymentHubPage receipts /></RoleBasedRoute>} />
          <Route path="/settings" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><SettingsPage /></RoleBasedRoute>} />
          <Route path="/settings/users" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><SettingsPage section="users" /></RoleBasedRoute>} />
          <Route path="/settings/promotion" element={<Navigate to="/settings" replace />} />
          <Route path="/graduated-students" element={<Navigate to="/students/graduated" replace />} />
          <Route path="/school-setup" element={<Navigate to="/settings" replace />} />
          <Route path="/fees" element={<Navigate to="/payments?setup=fees" replace />} />
          <Route path="/receipts" element={<Navigate to="/payments/receipts" replace />} />
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
                <FacultyStaffPage />
              </RoleBasedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
