function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fc] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-[#d9e3f5] bg-white p-6 shadow-lg shadow-blue-950/10">
        {children}
      </section>
    </main>
  );
}

export default AuthLayout;
