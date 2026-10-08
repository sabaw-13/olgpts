import { AlertCircle, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import useAuth from '../../hooks/useAuth.js';

function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const submitting = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = location.state?.from?.pathname;
  const redirectPath = typeof requestedPath === 'string' && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//') && !requestedPath.includes('\\') && requestedPath !== '/login'
    ? requestedPath : '/dashboard';

  if (loading) {
    return (
      <AuthLayout>
        <div className="school-login__session" role="status">
          <LoaderCircle className="school-login__spinner" size={22} aria-hidden="true" />
          <p>Checking your session...</p>
        </div>
      </AuthLayout>
    );
  }
  if (isAuthenticated) return <Navigate to={redirectPath} replace />;

  const handleChange = ({ target: { name, value } }) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setErrorMessage('');
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await login({ email: formData.email.trim(), password: formData.password });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message === 'Invalid login credentials'
        ? 'The email or password is incorrect. Check your details and try again.'
        : error.message || 'Unable to sign in. Please try again.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="school-login__heading">Welcome back.</h1>
      <p className="school-login__description">Sign in to manage student enrollment<br className="hidden sm:block" /> and school payments.</p>
      <form className="school-login__form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div>
          <label htmlFor="email" className="school-login__label">Email address</label>
          <div className="school-login__input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              id="email" name="email" type="email" value={formData.email}
              onChange={handleChange} required autoComplete="username" autoCapitalize="none"
              spellCheck={false} disabled={isSubmitting} placeholder="Your school account email"
              aria-describedby={errorMessage ? 'login-error' : undefined} className="school-login__input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="school-login__label">Password</label>
          <div className="school-login__input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="password" name="password" type={showPassword ? 'text' : 'password'}
              value={formData.password} onChange={handleChange} required autoComplete="current-password"
              disabled={isSubmitting} placeholder="Enter your password"
              onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
              onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
              onBlur={() => setCapsLock(false)}
              aria-describedby={[capsLock && 'caps-lock-hint', errorMessage && 'login-error'].filter(Boolean).join(' ') || undefined}
              className="school-login__input"
            />
            <button
              type="button" className="school-login__password-toggle" disabled={isSubmitting}
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="password" aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {capsLock && <p id="caps-lock-hint" className="school-login__caps-lock" role="status">Caps Lock is on.</p>}
        </div>
        {errorMessage && (
          <div id="login-error" className="school-login__error" role="alert">
            <AlertCircle size={18} aria-hidden="true" /><span>{errorMessage}</span>
          </div>
        )}
        <button type="submit" disabled={isSubmitting} className="school-login__submit">
          {isSubmitting && <LoaderCircle className="school-login__spinner" size={18} aria-hidden="true" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="school-login__access">For school administrators and staff</p>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
