import { useState } from 'react';
import { ShoppingCart, User, GraduationCap, Utensils, Shield, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../data/mockData';
import { Logo } from '../components/Shared';

const ROLE_OPTIONS = [
  { role: ROLES.STUDENT, label: 'Student', desc: 'Order meals, view menu, track orders', icon: GraduationCap, color: 'var(--brand-primary)', email: 'aryan@spit.edu' },
  { role: ROLES.THALI_STAFF, label: 'Thali Counter', desc: 'View thali orders, scan QR codes', icon: Utensils, color: 'var(--color-success)', email: 'ravi.thali@spit.mess' },
  { role: ROLES.DISHES_STAFF, label: 'Dishes Counter', desc: 'View dish orders, mark as served', icon: ShoppingCart, color: 'var(--color-info)', email: 'suresh.dishes@spit.mess' },
  { role: ROLES.ADMIN, label: 'Mess Admin', desc: 'Manage menu, view analytics, monitor ops', icon: Shield, color: 'var(--brand-secondary)', email: 'admin@spit.mess' },
];

export default function LoginPage() {
  const { loginByRole } = useApp();
  const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
  const [email, setEmail] = useState('aryan@spit.edu');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (r) => {
    setSelectedRole(r.role);
    setEmail(r.email);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(res => setTimeout(res, 800));
    const user = loginByRole(selectedRole);
    if (!user) setError('Invalid credentials. Please try again.');
    setLoading(false);
  };

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
            {['Spring Boot', 'React', 'PostgreSQL', 'Kubernetes', 'Docker', 'Prometheus', 'Grafana', 'Terraform', 'AWS'].map(t => (
              <span key={t} className="badge badge-muted">{t}</span>
            ))}
          </div>
        </div>

        {/* Right – Auth Card */}
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <div className="display-md" style={{ marginBottom: 6 }}>Welcome Back</div>
            <div className="body-sm text-muted">Sign in to your MealSync account</div>
          </div>

          {/* Role Selector */}
          <div className="mb-lg">
            <div className="form-label mb-sm">Select Your Role</div>
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
            <div className="body-sm text-muted" style={{ marginTop: 8, textAlign: 'center' }}>
              {ROLE_OPTIONS.find(r => r.role === selectedRole)?.desc}
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  Signing In...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Sign In <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          <div className="divider" />

          {/* Quick demo access */}
          <div style={{ textAlign: 'center' }}>
            <div className="caption text-muted mb-sm">Quick Demo Access</div>
            <div className="flex gap-sm justify-center flex-wrap">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.role}
                  className="btn btn-ghost btn-sm"
                  onClick={() => { handleRoleSelect(r); loginByRole(r.role); }}
                >
                  <Zap size={12} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="caption text-muted" style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
            SPIT Mumbai · Cloud Computing Mini Project<br />
            Meet Gangwal & Aryan Dandekar
          </div>
        </div>
      </div>
    </div>
  );
}
