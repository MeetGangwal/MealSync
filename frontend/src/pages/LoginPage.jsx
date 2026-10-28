import { useState } from 'react';
import { ShoppingCart, User, GraduationCap, Utensils, Shield, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../data/mockData';
import { Logo } from '../components/Shared';

const ROLE_OPTIONS = [
  { role: ROLES.STUDENT, label: 'Student', desc: 'Order meals, view menu, track orders', icon: GraduationCap, color: 'var(--brand-primary)', email: 'aryan@spit.edu', password: 'password123' },
  { role: ROLES.ADMIN, label: 'Mess Admin', desc: 'Manage menu, view analytics, manage orders', icon: Shield, color: 'var(--brand-secondary)', email: 'admin@spit.mess', password: 'admin123' },
];

export default function LoginPage() {
  const { loginByRole, setRealUser } = useApp();
  const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('aryan@spit.edu');
  const [password, setPassword] = useState('password123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (r) => {
    setSelectedRole(r.role);
    if (!isRegistering) {
      setEmail(r.email);
      setPassword(r.password || 'password123');
    }
    setError('');
  };

  const handleQuickLogin = async (r) => {
    handleRoleSelect(r);
    setLoading(true);
    setError('');
    try {
      await loginByRole(r.role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        // POST to Spring Boot — role is intentionally excluded from the request
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        let data = null;
        try {
          data = await response.json();
        } catch (jsonErr) {}

        if (response.ok) {
          setSuccess('Account created successfully! You can now sign in.');
          setIsRegistering(false);
        } else {
          setError(data?.error || 'Registration failed');
        }
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        let data = null;
        try {
          data = await response.json();
        } catch (parseErr) {
          // Response body was not JSON
        }

        if (response.ok && data?.token) {
          // Map backend role (ROLE_USER) to frontend role string for UI routing
          const frontendRole = mapBackendRole(data.role, selectedRole);
          // Pass JWT token to context for authenticated API calls
          setRealUser({
            id: data.userId,
            name: data.name,
            email: data.email,
            role: frontendRole,
          }, data.token);  // token stored securely in context
        } else if (response.status === 401) {
          setError(data?.error || 'Invalid email or password');
        } else if (response.status === 403) {
          setError(data?.error || 'Access denied: account not permitted');
        } else if (response.status === 404) {
          setError('Authentication endpoint not found (404)');
        } else if (response.status >= 500) {
          setError(data?.error || `Server error (${response.status}). Please check backend logs.`);
        } else {
          setError(data?.error || 'Login failed. Please check your credentials.');
        }
      }
    } catch(err) {
      setError("Cannot reach the backend server. Please verify Spring Boot is running on port 8080.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maps the backend role string to the frontend role constant.
   * Student accounts have ROLE_USER or ROLE_STUDENT. Admin has ROLE_ADMIN.
   * NOTE: This is for UI routing only — all access control is enforced server-side.
   */
  function mapBackendRole(backendRole, fallbackRole) {
    if (backendRole === 'ROLE_ADMIN') return ROLES.ADMIN;
    if (backendRole === 'ROLE_USER' || backendRole === 'ROLE_STUDENT') return ROLES.STUDENT;
    return fallbackRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.STUDENT;
  }


  return (
    <div className="auth-page">
      {/* Animated Background Orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,101,132,0.08) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '50%', right: '25%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,233,123,0.06) 0%, transparent 70%)', animation: 'float 5s ease-in-out infinite 2s' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: 'var(--space-3xl)', alignItems: 'center', maxWidth: 1100, width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Left – Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <Logo size="lg" />
          <div>
            <h1 className="display-xl" style={{ lineHeight: 1.1, marginBottom: 'var(--space-md)' }}>
              Smart Campus<br />
              <span className="grad-text">Mess Platform</span>
            </h1>
            <p className="body-lg text-secondary" style={{ maxWidth: 440, lineHeight: 1.7 }}>
              Eliminate queue time. Pre-order meals, receive a secure QR ticket, and walk directly to your counter — no waiting.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              { emoji: '⚡', title: 'Instant Ordering', desc: 'Skip billing queues entirely' },
              { emoji: '📱', title: 'QR-Based Pickup', desc: 'Secure digital order tickets' },
              { emoji: '📊', title: 'Live Availability', desc: 'Real-time menu quantities' },
              { emoji: '☁️', title: 'Cloud Native', desc: 'Kubernetes + Prometheus + Grafana' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-md">
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  {f.emoji}
                </div>
                <div>
                  <div className="heading-sm">{f.title}</div>
                  <div className="body-sm text-muted">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tech Stack chips */}
          <div className="flex flex-wrap gap-sm">
            {['Spring Boot', 'React', 'MySQL', 'Kubernetes', 'Docker', 'Prometheus', 'Grafana', 'Terraform', 'AWS'].map(t => (
              <span key={t} className="badge badge-muted">{t}</span>
            ))}
          </div>
        </div>

        {/* Right – Auth Card */}
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <div className="display-md" style={{ marginBottom: 6 }}>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </div>
            <div className="body-sm text-muted">
              {isRegistering ? 'Register to start ordering' : 'Sign in to your MealSync account'}
            </div>
          </div>

          {/* Role Selector — Login only; Public registration is strictly for Students */}
          {!isRegistering ? (
            <div className="mb-lg">
              <div className="form-label mb-sm">Sign In As</div>
              <div className="grid grid-2 gap-sm">
                {ROLE_OPTIONS.map(r => (
                  <div
                    key={r.role}
                    className={`role-card ${selectedRole === r.role ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect(r)}
                  >
                    <div style={{ color: r.color, marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
                      <r.icon size={22} />
                    </div>
                    <div className="label" style={{ fontSize: '0.75rem' }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-glass mb-lg" style={{ padding: '10px 14px', textAlign: 'center', borderColor: 'var(--brand-primary)' }}>
              <span className="caption text-brand" style={{ fontWeight: 600 }}>🎓 Public Student Account Registration</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Meet Gangwal"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@spit.edu"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ paddingRight: 42 }}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  {isRegistering ? 'Creating...' : 'Signing In...'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isRegistering ? 'Create Account' : 'Sign In'} <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
            >
              {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>

          <div className="divider" />

          {/* 1-Click Instant Login */}
          <div style={{ textAlign: 'center' }}>
            <div className="caption text-muted mb-sm">⚡ 1-Click Instant Login (Live Database & JWT Auth)</div>
            <div className="flex gap-sm justify-center flex-wrap">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.role}
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleQuickLogin(r)}
                  disabled={loading}
                >
                  <Zap size={12} color="var(--brand-primary)" />
                  Sign In as {r.label}
                </button>
              ))}
            </div>
            <div className="caption text-muted" style={{ fontSize: '0.72rem', marginTop: 8 }}>
              Default credentials: <code>aryan@spit.edu</code> / <code>password123</code> &bull; <code>admin@spit.mess</code> / <code>admin123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
