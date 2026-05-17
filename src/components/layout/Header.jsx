import useAuth from '../../hooks/useAuth.js';

function Header() {
  const { profile } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            OLGTPS
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Payment and Enrollment Management
          </h2>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">
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
