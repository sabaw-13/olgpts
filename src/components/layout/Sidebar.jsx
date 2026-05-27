import { NavLink, useNavigate } from 'react-router-dom';
import {
  Award,
  Banknote,
  Building2,
  FileBarChart,
  Gauge,
  GraduationCap,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';
import useAuth from '../../hooks/useAuth.js';

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Gauge, roles: ['admin', 'staff'] },
  { label: 'Students', path: '/students', icon: GraduationCap, roles: ['admin', 'staff'] },
  { label: 'Graduated Students', path: '/graduated-students', icon: Award, roles: ['admin', 'staff'] },
  { label: 'School Setup', path: '/school-setup', icon: Building2, roles: ['admin', 'staff'] },
  { label: 'Fees', path: '/fees', icon: WalletCards, roles: ['admin', 'staff'] },
  { label: 'Payments', path: '/payments', icon: Banknote, roles: ['admin', 'staff'] },
  { label: 'Receipts', path: '/receipts', icon: ReceiptText, roles: ['admin', 'staff'] },
  { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['admin', 'staff'] },
  { label: 'Staff Management', path: '/staff', icon: Users, roles: ['admin', 'staff'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'staff'] },
];

function Sidebar({ isDesktopExpanded = false, onDesktopExpandedChange }) {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
    setIsAccountMenuOpen(false);
  };

  const renderNavigation = ({ onNavigate, isDesktop = false } = {}) => (
    <nav
      className={isDesktop ? 'flex flex-col gap-1' : 'space-y-1'}
      aria-label="Main navigation"
    >
      {visibleNavigationItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              setIsAccountMenuOpen(false);
              onNavigate?.();
            }}
            className={({ isActive }) =>
              [
                'flex w-full items-center rounded-md border-l-4 text-sm font-medium transition',
                isDesktop && !isDesktopExpanded ? 'h-10 justify-center px-0' : 'gap-3 px-3 py-2',
                isDesktop && isDesktopExpanded ? 'h-11 justify-start' : '',
                isActive
                  ? 'border-[#f5bb2e] bg-white/15 text-[#f5bb2e]'
                  : 'border-transparent text-blue-50 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
            title={isDesktop ? item.label : undefined}
          >
            <Icon aria-hidden="true" className="shrink-0" size={isDesktop ? 20 : 18} />
            <span
              className={
                isDesktop
                  ? [
                      'overflow-hidden whitespace-nowrap transition-all duration-200',
                      isDesktopExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0',
                    ].join(' ')
                  : ''
              }
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );

  const openLogoutConfirm = () => {
    setIsAccountMenuOpen(false);
    setIsLogoutConfirmOpen(true);
    closeMobileSidebar();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d9e3f5] bg-white text-[#1f3f93] shadow-sm hover:bg-[#f8fbff] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 hidden h-screen overflow-hidden border-r border-[#193a86] bg-gradient-to-b from-[#24499d] via-[#1f3f93] to-[#173274] px-3 py-4 text-white shadow-xl shadow-blue-950/15 transition-[width] duration-300 ease-out lg:flex lg:flex-col',
          isDesktopExpanded ? 'w-72' : 'w-20',
        ].join(' ')}
        onMouseEnter={() => onDesktopExpandedChange?.(true)}
        onMouseLeave={() => {
          setIsAccountMenuOpen(false);
          onDesktopExpandedChange?.(false);
        }}
      >
        {!isDesktopExpanded ? (
          <>
            <div className="flex shrink-0 justify-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#f5bb2e] text-sm font-black text-[#132a63] shadow-lg shadow-blue-950/20">
                OL
              </div>
            </div>

            <nav
              className="mt-6 flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden"
              aria-label="Main navigation"
            >
              {visibleNavigationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={({ isActive }) =>
                      [
                        'flex h-10 w-12 items-center justify-center rounded-md border-l-4 transition',
                        isActive
                          ? 'border-[#f5bb2e] bg-white/15 text-[#f5bb2e]'
                          : 'border-transparent text-blue-50 hover:bg-white/10 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon aria-hidden="true" size={20} />
                    <span className="sr-only">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-3 flex shrink-0 flex-col items-center gap-2">
              {isAccountMenuOpen ? (
                <button
                  type="button"
                  onClick={openLogoutConfirm}
                  className="flex h-10 w-12 items-center justify-center rounded-md border-l-4 border-transparent text-blue-50 transition hover:bg-white/10 hover:text-white"
                  title="Logout"
                >
                  <LogOut aria-hidden="true" size={20} />
                  <span className="sr-only">Logout</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                className="flex h-11 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 transition hover:bg-white/15"
                title="Account"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5bb2e] text-xs font-black text-[#132a63]">
                  {(profile?.full_name || 'OU')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <span className="sr-only">Account menu</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 shrink-0">
              <div className="flex min-w-0 items-center justify-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#f5bb2e] text-sm font-black text-[#132a63] shadow-lg shadow-blue-950/20">
                  OL
                </div>
                <div className="min-w-0 overflow-hidden transition-all duration-200 w-48 opacity-100">
                  <p className="whitespace-nowrap text-lg font-bold tracking-wide text-white">
                    OLGTPS
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
              {renderNavigation({ isDesktop: true })}
            </div>

            <div className="mt-auto space-y-2">
              {isAccountMenuOpen ? (
                <button
                  type="button"
                  onClick={openLogoutConfirm}
                  className="flex w-full items-center gap-3 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-left text-sm font-medium text-blue-50 transition hover:bg-white/15 hover:text-white"
                >
                  <LogOut aria-hidden="true" size={18} />
                  Logout
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                className="flex w-full min-w-0 items-center justify-start gap-3 rounded-lg border border-white/15 bg-white/10 p-2 text-left transition-colors hover:bg-white/15"
                aria-expanded={isAccountMenuOpen}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5bb2e] text-xs font-black text-[#132a63]">
                  {(profile?.full_name || 'OU')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0 overflow-hidden transition-all duration-200 w-44 opacity-100">
                  <p className="truncate text-sm font-semibold text-white">
                    {profile?.full_name || 'OLGTPS User'}
                  </p>
                  <p className="mt-1 truncate text-xs capitalize text-blue-100">{profile?.role}</p>
                </div>
              </button>
            </div>
          </>
        )}
      </aside>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeMobileSidebar}
            aria-label="Close navigation overlay"
          />

          <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-gradient-to-b from-[#24499d] via-[#1f3f93] to-[#173274] px-4 py-5 text-white shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#f5bb2e]">
                  OLGTPS
                </p>
              </div>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="rounded-md p-2 text-blue-100 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderNavigation({ onNavigate: closeMobileSidebar })}
            </div>

            <div className="mt-4 space-y-2">
              {isAccountMenuOpen ? (
                <button
                  type="button"
                  onClick={openLogoutConfirm}
                  className="flex w-full items-center gap-3 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-left text-sm font-medium text-blue-50 hover:bg-white/15 hover:text-white"
                >
                  <LogOut aria-hidden="true" size={18} />
                  Logout
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                className="w-full rounded-lg border border-white/15 bg-white/10 p-3 text-left transition hover:bg-white/15"
                aria-expanded={isAccountMenuOpen}
              >
                <p className="text-sm font-semibold text-white">
                  {profile?.full_name || 'OLGTPS User'}
                </p>
                <p className="mt-1 text-xs capitalize text-blue-100">{profile?.role}</p>
              </button>
            </div>
          </aside>
        </div>
      ) : null}

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
