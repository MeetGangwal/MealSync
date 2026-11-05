import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, Sun, Moon, CircleAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo, Spinner, MealImage } from '../components/Shared';
import { HERO_IMAGE } from '../lib/menuImages';

/**
 * One sign-in for everyone. The account type (student or mess administrator) is decided by the
 * server and returned with the login response — there is deliberately no "sign in as" choice,
 * and public registration always creates a student account.
 */
export default function LoginPage({ mode = 'login', onModeChange, onBack }) {
  const { completeLogin, theme, toggleTheme } = useApp();
  const isRegistering = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = () => {
    onModeChange(isRegistering ? 'login' : 'register');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json().catch(() => null);
        if (response.ok) {
          setSuccess('Your student account is ready. Sign in to start ordering.');
          onModeChange('login');
          setPassword('');
        } else if (response.status === 409) {
          setError('An account with this email already exists. Sign in instead.');
        } else if (response.status >= 500) {
          setError('The server could not create the account. Please try again shortly.');
        } else {
          setError(data?.error || 'Registration failed. Please check your details.');
        }
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.token) {
        if (!completeLogin(data)) setError('Unexpected response from the server. Please try again.');
      } else if (response.status === 401) {
        setError('Incorrect email or password.');
      } else if (response.status >= 500) {
        setError('The server could not complete the sign-in. Please try again shortly.');
      } else {
        setError(data?.error || 'Sign-in failed. Please check your details.');
      }
    } catch {
      setError('Cannot reach the MealSync server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-media" aria-hidden="true">
        <MealImage src={HERO_IMAGE.src} alt="" eager />
        <div className="auth-media-caption">
          <div className="display-md">Good food. Less waiting.</div>
          <p className="body-sm mt-sm">Order ahead, choose a pickup slot and collect with one QR ticket.</p>
        </div>
      </aside>

      <main className="auth-main" id="main">
        <div className="auth-top">
          <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> MealSync home</button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="auth-form-wrap">
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="mb-lg"><Logo size="lg" /></div>
            <h1 id="auth-title" className="display-md">{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
            <p className="body-md text-secondary mt-sm mb-lg">
              {isRegistering
                ? 'A student account lets you order meals and pick a pickup slot.'
                : 'Sign in with your MealSync email. Students and mess administrators use the same sign-in.'}
            </p>

            <form onSubmit={handleSubmit} className="form-stack">
              {isRegistering && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-name">Full name</label>
                  <input id="auth-name" className="form-input" type="text" autoComplete="name"
                    value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">Email address</label>
                <input id="auth-email" className="form-input" type="email" autoComplete="email" inputMode="email"
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="you@spit.edu" required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">Password</label>
                <div className="input-with-action">
                  <input id="auth-password" className="form-input" type={showPass ? 'text' : 'password'}
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    aria-describedby={isRegistering ? 'auth-password-hint' : undefined}
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={72} />
                  <button type="button" className="input-action" onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isRegistering && <div className="form-hint" id="auth-password-hint">Use 6–72 characters.</div>}
              </div>

              {error && <div className="alert alert-danger" role="alert"><CircleAlert size={16} aria-hidden="true" /><span>{error}</span></div>}
              {success && <div className="alert alert-success" role="status">{success}</div>}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading
                  ? <><Spinner /> {isRegistering ? 'Creating account…' : 'Signing in…'}</>
                  : <>{isRegistering ? 'Create account' : 'Sign in'} <ArrowRight size={18} aria-hidden="true" /></>}
              </button>
            </form>

            {isRegistering && (
              <div className="alert alert-info mt-md">
                <Info size={16} aria-hidden="true" />
                <span>New accounts are student accounts. Mess administrator access is granted by an existing administrator under Users &amp; roles.</span>
              </div>
            )}

            <div className="auth-switch">
              <span className="body-sm text-muted">{isRegistering ? 'Already have an account?' : 'New to MealSync?'}</span>
              <button type="button" className="btn btn-link" onClick={switchMode}>
                {isRegistering ? 'Sign in' : 'Create a student account'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
