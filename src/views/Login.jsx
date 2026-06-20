import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';

export function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('splash'); // 'splash' | 'phone' | 'otp' | 'email'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        alert("Registration completed successfully! If email verification is enabled, check your inbox; otherwise, you can now log in immediately.");
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg("Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
      await supabase.auth.signInWithOtp({ phone: formattedPhone });
      setLoginMode('otp');
    } catch (err) {
      setErrorMsg("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otpToken || otpToken.length < 4) {
      setErrorMsg("Please enter the verification code.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otpToken });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg("Invalid OTP code. Try 123456.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary-container text-on-primary font-body-lg h-screen flex flex-col justify-between overflow-hidden relative max-w-[375px] mx-auto w-full">
      {/* Splash Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center px-container-margin relative z-10 w-full">
        <div className="text-center space-y-stack-gap-sm mb-12">
          <h1 className="font-display-lg text-display-lg text-on-primary select-none">Vaahan</h1>
          <p className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-widest">Vehicle Management</p>
        </div>

        {/* Abstract vehicle shapes background suggestion */}
        <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none opacity-20 flex items-center justify-center">
          <svg className="w-full h-full max-w-[300px]" viewBox="0 0 400 400">
            <circle cx="200" cy="200" fill="none" r="150" stroke="currentColor" strokeDasharray="4 8" strokeWidth="2"></circle>
            <circle cx="200" cy="200" fill="none" opacity="0.5" r="100" stroke="currentColor" strokeWidth="1"></circle>
          </svg>
        </div>
      </main>

      {/* Bottom Action Card */}
      <div className="bg-surface text-on-surface rounded-t-[16px] w-full shadow-[0_-8px_20px_rgba(26,60,110,0.1)] relative z-20 px-container-margin pt-stack-gap-lg pb-8 flex flex-col gap-stack-gap-md min-h-[320px] transition-all duration-300">
        
        {loginMode === 'splash' && (
          <>
            <h2 className="font-headline-md text-headline-md text-primary mb-2">Get Started</h2>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors active:scale-95 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span className="font-label-lg text-label-lg">Continue with Google</span>
            </button>
            
            <button 
              onClick={() => setLoginMode('phone')}
              className="w-full bg-transparent text-primary border border-primary rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] filled">call</span>
              <span className="font-label-lg text-label-lg">Continue with Phone</span>
            </button>

            <button 
              onClick={() => setLoginMode('email')}
              className="w-full bg-transparent text-primary border border-primary rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] filled">mail</span>
              <span className="font-label-lg text-label-lg">Continue with Email</span>
            </button>
          </>
        )}

        {loginMode === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setLoginMode('splash')}
                className="p-1 text-on-surface-variant hover:bg-surface-container-low rounded-full"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
              <h2 className="font-headline-md text-headline-md text-primary">Enter Phone Number</h2>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">Mobile Number</label>
              <div className="flex bg-surface-container-lowest border border-outline-variant rounded-xl p-3 items-center">
                <span className="font-body-lg text-body-lg text-on-surface mr-2 font-medium">+91</span>
                <input 
                  type="tel"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-transparent border-none p-0 font-body-lg text-body-lg text-on-surface focus:ring-0 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {errorMsg && <p className="text-error font-label-sm text-label-sm">{errorMsg}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Send OTP
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        )}

        {loginMode === 'otp' && (
          <form onSubmit={handleOtpVerify} className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setLoginMode('phone')}
                className="p-1 text-on-surface-variant hover:bg-surface-container-low rounded-full"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
              <h2 className="font-headline-md text-headline-md text-primary">Verify OTP</h2>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">6-Digit Code</label>
              <input 
                type="text"
                maxLength="6"
                placeholder="Enter 6-digit code"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 font-headline-md text-headline-md text-on-surface tracking-widest text-center focus:ring-2 focus:ring-primary-container outline-none"
                autoFocus
              />
            </div>

            {errorMsg && <p className="text-error font-label-sm text-label-sm">{errorMsg}</p>}
            <p className="font-label-sm text-label-sm text-on-surface-variant opacity-80">
              For testing, enter any code (e.g. 123456)
            </p>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Verify & Sign In
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          </form>
        )}

        {loginMode === 'email' && (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setLoginMode('splash')}
                className="p-1 text-on-surface-variant hover:bg-surface-container-low rounded-full"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
              <h2 className="font-headline-md text-headline-md text-primary">{isSignUp ? "Create Account" : "Sign In"}</h2>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">Email Address</label>
              <input 
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">Password</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
                required
              />
            </div>

            {errorMsg && <p className="text-error font-label-sm text-label-sm">{errorMsg}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
              <span className="material-symbols-outlined">{isSignUp ? "person_add" : "login"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-label-sm text-label-sm text-center hover:underline mt-1 font-semibold"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </form>
        )}

        <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-auto px-4 opacity-80">
          By continuing, you agree to our <a className="text-primary underline" href="#">Terms of Service</a> and <a className="text-primary underline" href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default Login;
