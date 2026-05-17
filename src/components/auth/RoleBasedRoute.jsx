import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

function RoleBasedRoute({ allowedRoles, children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Checking permissions...
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RoleBasedRoute;
