function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </section>
    </main>
  );
}

export default AuthLayout;
