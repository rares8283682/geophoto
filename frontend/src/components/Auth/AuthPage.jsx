import { useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage() {
  const [tab, setTab]         = useState('login'); // 'login' | 'signup' | 'forgot' | 'verify' | 'reset'
  const [email, setEmail]     = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [username, setUsername] = useState('');
  
  // Verification states
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode]   = useState('');
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const [resetEmail, setResetEmail]             = useState('');
  const [newPassword, setNewPassword]           = useState('');

  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Password rules validation
  const hasMinLength = (tab === 'signup' ? password : newPassword).length >= 6;
  const hasNumber    = /[0-9]/.test(tab === 'signup' ? password : newPassword);
  const hasLowercase = /[a-z]/.test(tab === 'signup' ? password : newPassword);
  const hasUppercase = /[A-Z]/.test(tab === 'signup' ? password : newPassword);
  const hasSpecial   = /[^A-Za-z0-9]/.test(tab === 'signup' ? password : newPassword);

  // Calculate strength score (0 to 5)
  const strengthScore = [hasMinLength, hasNumber, hasLowercase, hasUppercase, hasSpecial].filter(Boolean).length;

  // Get strength color and text
  const getStrengthLabel = () => {
    const pwd = tab === 'signup' ? password : newPassword;
    if (!pwd) return { text: '', color: 'transparent', width: '0%' };
    if (strengthScore <= 2) return { text: 'Weak 🔴', color: '#ff4d4d', width: '33%' };
    if (strengthScore <= 4) return { text: 'Medium 🟡', color: '#ffb302', width: '66%' };
    return { text: 'Strong 🟢', color: '#2ecc71', width: '100%' };
  };

  const strength = getStrengthLabel();

  // Smart Email Typo Warning
  const handleEmailChange = (val) => {
    setEmail(val);
    const commonTypos = {
      'yaho.com': 'yahoo.com',
      'gamil.com': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'outlok.com': 'outlook.com'
    };
    
    const domain = val.split('@')[1];
    if (domain && commonTypos[domain.toLowerCase()]) {
      setEmailWarning(`Did you mean @${commonTypos[domain.toLowerCase()]}?`);
    } else {
      setEmailWarning('');
    }
  };

  // Generate a random 8-digit verification code
  function generate8DigitCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // SIGNUP INITIAL ACTION (Request Verification Code)
    if (tab === 'signup') {
      if (email !== emailConfirm) {
        setError('Emails do not match!');
        return;
      }
      if (strengthScore < 5) {
        setError('Please satisfy all password rules before submitting.');
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.post('/auth/send-signup-code', { email });
        setPendingSignupData({ email, password, name, username });
        setSuccess({
          text: 'A verification code has been sent to your email!',
          link: data.previewUrl
        });
        setTab('verify');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to send verification code');
      } finally {
        setLoading(false);
      }
      return;
    }

    // VERIFICATION ACTION
    if (tab === 'verify') {
      setLoading(true);
      try {
        // Run real signup on backend with verification code
        const { data } = await api.post('/auth/signup', { 
          ...pendingSignupData, 
          code: userEnteredCode 
        });
        login(data.token, data.user);
      } catch (err) {
        setError(err.response?.data?.error || 'Signup failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // FORGOT PASSWORD ACTION
    if (tab === 'forgot') {
      setLoading(true);
      try {
        const { data } = await api.post('/auth/send-reset-code', { email });
        setResetEmail(email);
        setSuccess({
          text: 'A reset code has been sent to your email!',
          link: data.previewUrl
        });
        setTab('reset');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to request reset code');
      } finally {
        setLoading(false);
      }
      return;
    }

    // PASSWORD RESET CONFIRMATION ACTION
    if (tab === 'reset') {
      if (strengthScore < 5) {
        setError('Password must meet all complexity rules.');
        return;
      }

      setLoading(true);
      try {
        await api.post('/auth/reset-password', { 
          email: resetEmail, 
          password: newPassword, 
          code: userEnteredCode 
        });
        setSuccess({
          text: 'Password reset successfully! You can now log in.',
          link: null
        });
        setTab('login');
        setPassword('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to reset password');
      } finally {
        setLoading(false);
      }
      return;
    }

    // LOGIN ACTION
    if (tab === 'login') {
      setLoading(true);
      try {
        const { data } = await api.post('/auth/login', { email, password });
        login(data.token, data.user);
      } catch (err) {
        setError(err.response?.data?.error || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🗺️</div>
          <span className="auth-logo-text">GeoPhoto</span>
        </div>

        {/* Tabs (Only show on Login or Signup pages) */}
        {(tab === 'login' || tab === 'signup') && (
          <div className="auth-tabs">
            <button
              id="tab-login"
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
            >
              Sign in
            </button>
            <button
              id="tab-signup"
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
            >
              Create account
            </button>
          </div>
        )}

        {/* Dynamic Screen Headers for verification or reset flows */}
        {tab === 'verify' && <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Verify Your Email Address</h3>}
        {tab === 'forgot' && <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Reset Password</h3>}
        {tab === 'reset' && <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Enter New Password</h3>}

        {/* Form */}
        <form onSubmit={handleSubmit} id="auth-form">
          
          {/* Verification Code Box (Verify & Reset screens) */}
          {(tab === 'verify' || tab === 'reset') && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-code">8-Digit Verification Code</label>
              <input
                id="auth-code"
                className="form-input"
                type="text"
                maxLength="8"
                placeholder="12345678"
                value={userEnteredCode}
                onChange={e => setUserEnteredCode(e.target.value.replace(/[^0-9]/g, ''))} // only allow numbers
                required
              />
            </div>
          )}

          {tab === 'signup' && (
            <>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  className="form-input"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              {/* Username */}
              <div className="form-group">
                <label className="form-label" htmlFor="auth-username">Username</label>
                <input
                  id="auth-username"
                  className="form-input"
                  type="text"
                  placeholder="johndoe123"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Email Inputs (Login, Signup, Forgot screens) */}
          {(tab === 'login' || tab === 'signup' || tab === 'forgot') && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                {tab === 'forgot' ? 'Enter your registered Email' : 'Email Address'}
              </label>
              <input
                id="auth-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                required
                autoComplete="email"
              />
              {emailWarning && (
                <p style={{ color: 'var(--accent-light)', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                  ⚠️ {emailWarning}
                </p>
              )}
            </div>
          )}

          {/* Confirm Email (Signup Only) */}
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email-confirm">Confirm Email Address</label>
              <input
                id="auth-email-confirm"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
                onPaste={e => e.preventDefault()}
                required
              />
            </div>
          )}

          {/* Password (Login & Signup screens) */}
          {(tab === 'login' || tab === 'signup') && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="auth-password" style={{ marginBottom: 0 }}>Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(''); setSuccess(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                className="form-input"
                type="password"
                placeholder={tab === 'signup' ? 'Create a secure password' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {/* New Password input on Password Reset Screen */}
          {tab === 'reset' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-new-password">Choose New Password</label>
              <input
                id="auth-new-password"
                className="form-input"
                type="password"
                placeholder="Enter strong password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Password Strength Scale (Signup & Reset screens) */}
          {(tab === 'signup' || tab === 'reset') && (tab === 'signup' ? password : newPassword) && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-muted)' }}>Password Strength:</span>
                <span style={{ color: strength.color }}>{strength.text}</span>
              </div>
              {/* Strength Scale Bar */}
              <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'width 0.3s ease' }} />
              </div>

              {/* Password Rules */}
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span>{hasMinLength ? '✅' : '❌'}</span> At least 6 characters
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span>{hasNumber ? '✅' : '❌'}</span> Contains a number (0-9)
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span>{hasLowercase ? '✅' : '❌'}</span> Contains a lowercase letter (a-z)
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span>{hasUppercase ? '✅' : '❌'}</span> Contains a capital letter (A-Z)
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span>{hasSpecial ? '✅' : '❌'}</span> Contains a special character (e.g. !@#$)
                </div>
              </div>
            </div>
          )}

          {error && <p className="error-msg" style={{ margin: '12px 0 0' }}>{error}</p>}
          {success && (
            <div style={{ color: '#2ecc71', fontSize: '12px', marginTop: '12px', textAlign: 'center', fontWeight: 500 }}>
              <p style={{ margin: '0 0 4px 0' }}>{typeof success === 'string' ? success : success.text}</p>
              {success.link && (
                <a
                  href={success.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline', display: 'inline-block', fontWeight: 600 }}
                >
                  Click here to view test email ✉️
                </a>
              )}
            </div>
          )}

          <button
            id="auth-submit"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: '20px', width: '100%' }}
          >
            {loading ? '…' : 
             tab === 'login' ? 'Sign in' : 
             tab === 'signup' ? 'Send Verification Code' : 
             tab === 'verify' ? 'Confirm and Create Account' :
             tab === 'forgot' ? 'Send Reset Code' : 'Update Password'}
          </button>
        </form>

        {/* Back navigation footers depending on active screen */}
        {tab !== 'login' && tab !== 'signup' && (
          <button
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
            className="btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'block', margin: '20px auto 0', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            ← Back to Sign In
          </button>
        )}

        {(tab === 'login' || tab === 'signup') && (
          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="btn"
              style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: '13px' }}
              onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            >
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
