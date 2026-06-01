import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import useAuth from '../../hooks/useAuth.js';

function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const defaultRedirectPath = '/dashboard';
  const redirectPath = location.state?.from?.pathname || defaultRedirectPath;

  if (loading) {
    return (
      <AuthLayout>
        <p className="text-sm font-medium text-slate-600">Checking your session...</p>
      </AuthLayout>
    );
  }

  if (!loading && isAuthenticated) {
    return <Navigate to={defaultRedirectPath} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(formData);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex justify-center">
        <img
          src="/logo.png"
          alt="OLGTPS logo"
          className="h-24 w-24 rounded-full object-contain shadow-md shadow-blue-950/10"
        />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-[#b77900]">
        OLGTPS
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[#132a63]">Sign in</h1>
      <p className="mt-3 text-sm text-slate-600">
        Access the Payment and Enrollment Management System.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
