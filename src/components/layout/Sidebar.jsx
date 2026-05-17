import { NavLink, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Building2,
  ClipboardList,
  FileBarChart,
  Gauge,
  GraduationCap,
  LogOut,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';
import useAuth from '../../hooks/useAuth.js';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Gauge, roles: ['admin', 'staff'] },
  { label: 'Students', path: '/students', icon: GraduationCap, roles: ['admin', 'staff'] },
  { label: 'School Setup', path: '/school-setup', icon: Building2, roles: ['admin', 'staff'] },
  { label: 'Enrollment', path: '/enrollment', icon: ClipboardList, roles: ['admin', 'staff'] },
  { label: 'Enrollment Fee', path: '/fees', icon: WalletCards, roles: ['admin', 'staff'] },
  { label: 'Payments', path: '/payments', icon: Banknote, roles: ['admin', 'staff'] },
  { label: 'Receipts', path: '/receipts', icon: ReceiptText, roles: ['admin', 'staff'] },
  { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['admin', 'staff'] },
  { label: 'Staff Management', path: '/staff', icon: Users, roles: ['admin', 'staff'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'staff'] },
];

function Sidebar() {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const visibleNavigationItems = navigationItems.filter((item) =>
    item.roles.includes(profile?.role),
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col">
        <div>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              OLGTPS
            </p>
            <h1 className="mt-2 text-lg font-bold leading-tight text-slate-950">
              Payment and Enrollment Management System
            </h1>
          </div>

          <nav className="space-y-1" aria-label="Main navigation">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    ].join(' ')
                  }
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <LogOut aria-hidden="true" size={18} />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {profile?.full_name || 'OLGTPS User'}
          </p>
          <p className="mt-1 text-xs capitalize text-slate-500">{profile?.role}</p>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold transition',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  ].join(' ')
                }
              >
                <Icon aria-hidden="true" size={18} />
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <LogOut aria-hidden="true" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <ConfirmationModal
        isOpen={isLogoutConfirmOpen}
        title="Log out?"
        message="You will be signed out and returned to the login page."
        confirmLabel="Log out"
        variant="danger"
        isProcessing={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}

export default Sidebar;
