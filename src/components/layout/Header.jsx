import useAuth from '../../hooks/useAuth.js';

function Header() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 lg:static lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            OLGTPS
          </p>
          <h2 className="mt-1 text-base font-bold leading-tight text-slate-950 sm:text-lg">
            Payment and Enrollment Management
          </h2>
        </div>

        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 sm:text-sm">
          <span className="min-w-0 truncate font-medium text-slate-700">
            {profile?.full_name || 'User'}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
          <span className="capitalize">{profile?.role}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
