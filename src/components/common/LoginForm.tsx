import React, { useState } from 'react';
import { KeyRound, Mail, ArrowRight, Building2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const LoginForm: React.FC = () => {
  const { login, schoolProfile } = useData();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (!email.trim() || !password.trim()) {
        setError('Please enter both your assigned school email and password.');
        setIsLoading(false);
        return;
      }

      const res = login(email, password);
      if (!res.success && res.error) {
        setError(res.error);
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950 font-sans overflow-hidden select-none">
      {/* Background Image with Cinematic Architectural View */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/school_building_bg.png')` }}
      />
      
      {/* Dark Ambient Gradient Layer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-slate-950/85 to-indigo-950/75 backdrop-blur-[2px]" />

      {/* Decorative Light Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Left Side: School Branding & Portal Info (5 Cols) */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-b from-indigo-950/70 to-slate-950/90 border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-brand/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header & Al Ahala Logo */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-center lg:justify-start">
              <img 
                src="/logo.png" 
                alt="Al Ahala School Logo" 
                className="h-28 sm:h-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" 
              />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                School Management System
              </h1>
              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed font-normal">
                Unified digital campus platform for administrative excellence, student records, and academic governance.
              </p>
            </div>
          </div>

          {/* School Details Footer */}
          <div className="pt-8 mt-6 border-t border-white/10 text-xs space-y-1.5 relative z-10">
            <div className="flex items-center gap-2 text-indigo-200 font-semibold">
              <Building2 className="w-4 h-4 text-brand" />
              <span>{schoolProfile?.schoolName || 'Al Ahala School'}</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between text-[11px]">
              <span>ID: {schoolProfile?.schoolCode || 'SCH-2026'}</span>
              <span>{schoolProfile?.zone || 'Western Province'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form (7 Cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-slate-900/60">
          <div className="space-y-6 max-w-md mx-auto w-full">
            
            {/* Header */}
            <div>
              <h2 className="font-display font-extrabold text-2xl text-white">Sign In to Account</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter your authorized school credentials to access your personalized workspace.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  School Email or Username <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. principal@school.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 focus:border-brand transition-all font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Account Password <span className="text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 focus:border-brand transition-all font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-brand to-indigo-600 hover:from-brand-hover hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand/25 border border-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};


