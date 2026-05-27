import useAuth from '../../hooks/useAuth.js';

function Header() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9e3f5] bg-white/95 px-3 py-3 shadow-sm shadow-blue-950/5 backdrop-blur sm:px-6 lg:static lg:px-8 lg:py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#b77900]">
            OLGTPS
          </p>
          <h2 className="mt-1 pl-12 text-base font-bold leading-tight text-[#132a63] sm:pl-0 sm:text-lg">
            Payment and Enrollment Management
          </h2>
        </div>

        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9e3f5] bg-[#f8fbff] px-3 py-1 text-xs text-slate-500 sm:text-sm">
          <span className="min-w-0 truncate font-medium text-[#1f3f93]">
            {profile?.full_name || 'User'}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#f5bb2e]" aria-hidden="true" />
          <span className="capitalize">{profile?.role}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
