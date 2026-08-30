import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Sparkles, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
  addToast: (text: string, type: 'success' | 'error') => void;
}

export default function Login({ onLoginSuccess, onNavigateRegister, onNavigateHome, addToast }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      addToast(`Welcome back, ${data.user.name}!`, 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-paper py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background vectors */}
      <div className="absolute -top-6 -left-6 text-chalkboard/5 select-none font-display text-9xl rotate-12">School</div>
      <div className="absolute -bottom-6 -right-6 text-chalkboard/5 select-none font-display text-9xl -rotate-12">Pledges</div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl border-4 border-chalkboard shadow-[8px_8px_0px_rgba(46,74,61,0.25)] p-8 sm:p-10 relative z-10 rotate-[-0.5deg]"
      >
        {/* Back Button */}
        <button
          onClick={onNavigateHome}
          className="group absolute top-6 left-6 flex items-center gap-1 text-xs font-black uppercase tracking-wider text-chalkboard/70 hover:text-chalkboard transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
          Home
        </button>

        <div className="text-center mt-6">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-chalkboard text-pencil border-3 border-chalkboard shadow-[3px_3px_0px_#000] rotate-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-black italic text-chalkboard">
            Welcome Back!
          </h2>
          <p className="mt-2 text-xs text-chalkboard/85 font-sans">
            Log in to manage your needs, pledges, or deliveries.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full pl-10 pr-4 py-3 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition sm:text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-chalkboard font-mono">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-3 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition sm:text-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border-3 border-chalkboard rounded-lg text-xs font-black uppercase tracking-widest text-chalkboard bg-pencil hover:bg-pencil-hover focus:outline-none shadow-[4px_4px_0px_#2E4A3D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#2E4A3D] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-chalkboard" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Sparkles className="h-4 w-4 text-chalkboard/80 animate-pulse" />
                )}
              </span>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-chalkboard/10 text-center">
          <p className="text-xs text-chalkboard/75 font-semibold">
            Don't have an account?{' '}
            <button
              onClick={onNavigateRegister}
              className="font-black text-chalkboard underline underline-offset-4 hover:text-pencil-hover focus:outline-none cursor-pointer"
            >
              Sign up today
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
