import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  MailCheck,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { LoginInputSchema, RegisterInputSchema } from '../../domain/schemas';
import { useAppStore } from '../../store/useAppStore';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    authChecked,
    isAuthenticated,
    needsEmailVerification,
    firebaseUser,
    loginWithGoogle,
    registerAccount,
    loginAccount,
    resendVerificationEmail,
    refreshVerificationStatus,
    logoutAccount,
  } = useAppStore();

  const initialMode =
    searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState('Bengaluru');
  const [regBuffer, setRegBuffer] = useState(20);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/app';

  useEffect(() => {
    const paramMode = searchParams.get('mode');
    if (paramMode === 'register' || paramMode === 'login') {
      setMode(paramMode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate, redirectTo]);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg(null);
    setSearchParams({ mode: nextMode }, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessBanner(null);

    const parsed = RegisterInputSchema.safeParse({
      name: regName,
      email: regEmail,
      city: regCity,
      preferredSafetyBufferPercent: Number(regBuffer),
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });

    if (!parsed.success) {
      setErrorMsg(
        parsed.error.issues[0]?.message ?? 'Please check your registration details.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await registerAccount({
        name: parsed.data.name,
        email: parsed.data.email,
        city: parsed.data.city,
        preferredSafetyBufferPercent: parsed.data.preferredSafetyBufferPercent,
        password: parsed.data.password,
      });

      setLoginEmail(created.email);
      setLoginPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setSuccessBanner(
        `Account created for ${created.email}. Verify your email from the link sent to your inbox, then sign in.`
      );
      switchMode('login');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = LoginInputSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!parsed.success) {
      setErrorMsg(
        parsed.error.issues[0]?.message ?? 'Enter your email and password.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await loginAccount({
        email: parsed.data.email,
        password: parsed.data.password,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const verified = await refreshVerificationStatus();
      if (!verified) {
        setErrorMsg(
          'Email is not verified yet. Open the verification email link in your inbox and try again.'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to check status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--cs-surface)] text-[var(--cs-text)] flex flex-col">
      <header className="border-b border-[var(--cs-outline)] bg-[var(--cs-surface-1)]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[var(--cs-text)] whitespace-nowrap shrink-0"
          >
            ChargeSense
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--cs-muted)] hover:text-[var(--cs-text)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--cs-muted)]">
              <span>Firebase Authentication</span>
              <span aria-hidden="true">·</span>
              <DemoLabel kind="cloud" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {needsEmailVerification
                ? 'Verify your email address'
                : mode === 'register'
                ? 'Register your driver account'
                : 'Sign in to ChargeSense'}
            </h1>
            <p className="text-sm text-[var(--cs-muted)]">
              {needsEmailVerification
                ? 'Cloud Firestore requires a verified email before syncing your vehicles and EV Passport.'
                : mode === 'register'
                ? 'Sign up with Google for instant verified access, or register with email and password.'
                : 'Sign in with Google or your registered email to access your EV workspace.'}
            </p>
          </div>

          {needsEmailVerification && firebaseUser ? (
            <TonalCard padding="lg" className="space-y-4">
              <div className="p-4 rounded-[16px] bg-[var(--cs-primary-container)] text-[var(--cs-primary)] flex items-start gap-3">
                <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">
                    Verification link sent to {firebaseUser.email}
                  </p>
                  <p className="text-[var(--cs-text)] opacity-85">
                    Click the confirmation link in your email, then return here and press Check Verification Status.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-[14px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)]"
                >
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2.5">
                <RippleButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                  onClick={handleCheckVerification}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Checking...'
                      : "I've Verified — Check Status"}
                  </span>
                </RippleButton>

                <div className="grid grid-cols-2 gap-2.5">
                  <RippleButton
                    variant="tonal"
                    onClick={() => void resendVerificationEmail()}
                  >
                    Resend Email
                  </RippleButton>
                  <RippleButton
                    variant="danger"
                    onClick={() => void logoutAccount()}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </RippleButton>
                </div>
              </div>
            </TonalCard>
          ) : (
            <TonalCard padding="lg" className="space-y-5">
              {/* Primary Google Sign-In (provisioned out-of-the-box) */}
              <RippleButton
                type="button"
                variant="primary"
                size="lg"
                disabled={googleLoading}
                onClick={handleGoogleSignIn}
                className="w-full"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>
                  {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                </span>
              </RippleButton>

              <div className="relative flex items-center justify-center">
                <span className="h-px flex-1 bg-[var(--cs-outline)]" />
                <span className="px-3 text-[11px] uppercase tracking-wider text-[var(--cs-muted)]">
                  or with email
                </span>
                <span className="h-px flex-1 bg-[var(--cs-outline)]" />
              </div>

              {/* Segmented Mode Switch */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-[var(--cs-surface-2)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`min-h-[40px] rounded-[10px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    mode === 'login'
                      ? 'bg-[var(--cs-surface-1)] text-[var(--cs-text)] shadow-sm'
                      : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => switchMode('register')}
                  className={`min-h-[40px] rounded-[10px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    mode === 'register'
                      ? 'bg-[var(--cs-surface-1)] text-[var(--cs-text)] shadow-sm'
                      : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>

              {successBanner && (
                <div
                  role="status"
                  className="p-3.5 rounded-[14px] bg-[var(--cs-primary-container)] text-xs text-[var(--cs-primary)] flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successBanner}</span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-[14px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)] leading-relaxed"
                >
                  {errorMsg}
                </div>
              )}

              {mode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reg-name"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Ananya Rao"
                      className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="driver@example.in"
                      className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reg-city"
                        className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                      >
                        Home City
                      </label>
                      <input
                        id="reg-city"
                        type="text"
                        required
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reg-buffer"
                        className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                      >
                        Safety Reserve ({regBuffer}%)
                      </label>
                      <input
                        id="reg-buffer"
                        type="number"
                        min={5}
                        max={40}
                        value={regBuffer}
                        onChange={(e) => setRegBuffer(Number(e.target.value))}
                        className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums text-[var(--cs-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showRegPw ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="w-full min-h-[42px] pl-3 pr-10 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPw((v) => !v)}
                        aria-label={showRegPw ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] inline-flex items-center justify-center text-[var(--cs-muted)] hover:text-[var(--cs-text)] cursor-pointer"
                      >
                        {showRegPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="reg-confirm"
                      type={showRegPw ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                    />
                  </div>

                  <RippleButton
                    type="submit"
                    variant="tonal"
                    size="lg"
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? 'Creating Account...' : 'Create Email Account'}
                  </RippleButton>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="driver@example.in"
                      className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showLoginPw ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full min-h-[42px] pl-3 pr-10 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw((v) => !v)}
                        aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] inline-flex items-center justify-center text-[var(--cs-muted)] hover:text-[var(--cs-text)] cursor-pointer"
                      >
                        {showLoginPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <RippleButton
                    type="submit"
                    variant="tonal"
                    size="lg"
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? 'Signing In...' : 'Sign In with Email'}
                  </RippleButton>
                </form>
              )}
            </TonalCard>
          )}
        </div>
      </main>
    </div>
  );
}
