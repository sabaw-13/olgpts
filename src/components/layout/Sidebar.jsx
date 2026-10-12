import { NavLink, useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  ChevronsUpDown,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';
import useAuth from '../../hooks/useAuth.js';

const navigationGroups = [
  {
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    ],
  },
  {
    label: 'Students',
    items: [
      { label: 'Student records', path: '/students', icon: Users, roles: ['admin', 'staff'] },
      { label: 'Enrolment', path: '/enrollment', icon: GraduationCap, roles: ['admin', 'staff'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payment', path: '/payments', icon: Wallet, roles: ['admin', 'staff'] },
      { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['admin', 'staff'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings2, roles: ['admin', 'staff'] },
      { label: 'Faculty and Staff', path: '/staff', icon: BriefcaseBusiness, roles: ['admin', 'staff'] },
    ],
  },
];

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#f5bb2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f3f93]';

const getInitials = (fullName) =>
  (fullName || 'OU')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase();

function Sidebar({ isDesktopExpanded = false, onDesktopExpandedChange }) {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(profile?.role)),
    }))
    .filter((group) => group.items.length > 0);

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

  const openLogoutConfirm = () => {
    setIsAccountMenuOpen(false);
    setIsLogoutConfirmOpen(true);
    closeMobileSidebar();
  };

  // Labels fade rather than reflow, so icons never shift when the rail expands.
  const labelClassName = (isExpanded) =>
    [
      'min-w-0 truncate whitespace-nowrap transition-opacity duration-200',
      isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
    ].join(' ');

  const renderNavigation = ({ isExpanded, onNavigate }) => (
    // Negative margin lets the active rail sit flush against the sidebar edge.
    <nav
      className="-mx-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-1"
      aria-label="Main navigation"
    >
      {visibleNavigationGroups.map((group, groupIndex) => (
        <div key={group.label || 'overview'} className={groupIndex > 0 ? 'mt-4' : ''}>
          {group.label ? (
            <div className="relative mb-1 flex h-6 items-center px-[18px]">
              <span
                aria-hidden={!isExpanded}
                className={[
                  'text-xs font-medium text-blue-200/80',
                  labelClassName(isExpanded),
                ].join(' ')}
              >
                {group.label}
              </span>
              <span
                aria-hidden="true"
                className={[
                  'absolute left-1/2 h-px w-6 -translate-x-1/2 bg-white/20 transition-opacity duration-200',
                  isExpanded ? 'opacity-0' : 'opacity-100',
                ].join(' ')}
              />
            </div>
          ) : null}

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    title={isExpanded ? undefined : item.label}
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onNavigate?.();
                    }}
                    className={({ isActive }) =>
                      [
                        'group relative flex h-10 items-center gap-3 rounded-lg px-[18px] text-sm transition-colors',
                        "before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-[#f5bb2e] before:transition-opacity before:content-['']",
                        focusRing,
                        isActive
                          ? 'bg-white/[0.12] font-semibold text-white before:opacity-100'
                          : 'font-medium text-blue-100 before:opacity-0 hover:bg-white/[0.07] hover:text-white',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          aria-hidden="true"
                          size={20}
                          strokeWidth={isActive ? 2.25 : 1.75}
                          className={[
                            'shrink-0 transition-colors',
                            isActive ? 'text-[#f5bb2e]' : 'text-blue-200 group-hover:text-white',
                          ].join(' ')}
                        />
                        <span className={labelClassName(isExpanded)}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const renderBrand = ({ isExpanded }) => (
    <div className="flex min-w-0 items-center gap-3 pl-1.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-0.5 ring-2 ring-[#f5bb2e]/70">
        <img
          src="/logo.png"
          alt="OLGTPS logo"
          className="h-full w-full rounded-full object-contain"
        />
      </div>
      <p
        className={[
          'text-lg font-bold tracking-wide text-white',
          labelClassName(isExpanded),
        ].join(' ')}
      >
        OLGTPS
      </p>
    </div>
  );

  const renderAccount = ({ isExpanded }) => (
    <div className="relative">
      {isAccountMenuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-white/15 bg-[#132a63] p-1 shadow-lg shadow-blue-950/40"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openLogoutConfirm}
            title={isExpanded ? undefined : 'Log out'}
            className={[
              'flex h-10 w-full items-center gap-3 rounded-md px-[14px] text-left text-sm font-medium text-blue-50 transition-colors hover:bg-red-500/15 hover:text-red-100',
              focusRing,
            ].join(' ')}
          >
            <LogOut aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0" />
            <span className={labelClassName(isExpanded)}>Log out</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsAccountMenuOpen(false);
        }}
        aria-haspopup="menu"
        aria-expanded={isAccountMenuOpen}
        aria-label="Account menu"
        className={[
          'flex w-full min-w-0 items-center gap-3 rounded-lg p-[7px] text-left transition-colors',
          isAccountMenuOpen ? 'bg-white/[0.12]' : 'hover:bg-white/[0.07]',
          focusRing,
        ].join(' ')}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5bb2e] text-xs font-black text-[#132a63]">
          {getInitials(profile?.full_name)}
        </div>
        <div className={['flex-1', labelClassName(isExpanded)].join(' ')}>
          <p className="truncate text-sm font-semibold text-white">
            {profile?.full_name || 'OLGTPS User'}
          </p>
          <p className="truncate text-xs capitalize text-blue-200">{profile?.role}</p>
        </div>
        <ChevronsUpDown
          aria-hidden="true"
          size={16}
          className={['shrink-0 text-blue-200', labelClassName(isExpanded)].join(' ')}
        />
      </button>
    </div>
  );

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
          'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col overflow-hidden bg-[#1f3f93] px-3 text-white shadow-xl shadow-blue-950/20 transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex',
          isDesktopExpanded ? 'w-72' : 'w-20',
        ].join(' ')}
        onMouseEnter={() => onDesktopExpandedChange?.(true)}
        onMouseLeave={() => {
          setIsAccountMenuOpen(false);
          onDesktopExpandedChange?.(false);
        }}
        onFocus={() => onDesktopExpandedChange?.(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsAccountMenuOpen(false);
            onDesktopExpandedChange?.(false);
          }
        }}
      >
        <div className="flex h-20 shrink-0 items-center border-b border-white/10">
          {renderBrand({ isExpanded: isDesktopExpanded })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-4">
          {renderNavigation({ isExpanded: isDesktopExpanded })}
        </div>

        <div className="-mx-3 shrink-0 border-t border-white/10 bg-[#1a3681] px-3 py-3">
          {renderAccount({ isExpanded: isDesktopExpanded })}
        </div>
      </aside>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeMobileSidebar}
            aria-label="Close navigation overlay"
          />

          <aside className="relative flex h-full w-[min(18rem,86vw)] flex-col bg-[#1f3f93] px-3 text-white shadow-xl">
            <div className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-white/10">
              {renderBrand({ isExpanded: true })}
              <button
                type="button"
                onClick={closeMobileSidebar}
                className={[
                  'rounded-md p-2 text-blue-100 hover:bg-white/10 hover:text-white',
                  focusRing,
                ].join(' ')}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col pt-4">
              {renderNavigation({ isExpanded: true, onNavigate: closeMobileSidebar })}
            </div>

            <div className="-mx-3 shrink-0 border-t border-white/10 bg-[#1a3681] px-3 py-3">
              {renderAccount({ isExpanded: true })}
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
