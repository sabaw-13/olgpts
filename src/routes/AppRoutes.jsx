import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RoleBasedRoute from '../components/auth/RoleBasedRoute.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage.jsx'));
const EnrollmentPage = lazy(() => import('../pages/enrollment/EnrollmentPage.jsx'));
const FeesPage = lazy(() => import('../pages/fees/FeesPage.jsx'));
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage.jsx'));
const ReceiptsPage = lazy(() => import('../pages/receipts/ReceiptsPage.jsx'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage.jsx'));
const SchoolSetupPage = lazy(() => import('../pages/school-setup/SchoolSetupPage.jsx'));
const StaffManagementPage = lazy(() => import('../pages/staff/StaffManagementPage.jsx'));

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
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
