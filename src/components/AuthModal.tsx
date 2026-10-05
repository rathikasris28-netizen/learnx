import React, { useState } from 'react';
import { Mail, Lock, User, MapPin, Globe, BookOpen, Award, CheckCircle, Shield } from 'lucide-react';
import TermsView from './TermsView';

interface AuthModalProps {
  onLogin: (token: string, user: any) => void;
  skills: any[];
}

export default function AuthModal({ onLogin, skills }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'LEARNER' | 'KNOWLEDGE_SHARER'>('LEARNER');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [language, setLanguage] = useState('English');
  const [educationStatus, setEducationStatus] = useState('');
  const [selectedLearnSkills, setSelectedLearnSkills] = useState<string[]>([]);
  const [selectedShareSkills, setSelectedShareSkills] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the LearnX Terms & Conditions to create an account.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          city,
          state,
          language,
          education_status: educationStatus,
          learn_skills: selectedLearnSkills,
          share_skills: selectedShareSkills,
          terms_accepted: termsAccepted
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoLearner = () => {
    setEmail('r31668797@gmail.com');
    setPassword('Rathika@2808');
  };

  const fillDemoMentor = () => {
    setEmail('rathikasris28@gmail.com');
    setPassword('Rathika@2808');
  };

  if (showTermsModal) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 flex flex-col justify-center items-center">
        <TermsView onBack={() => setShowTermsModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="LearnX Logo" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg shadow-emerald-500/30 object-cover" />
          <h1 className="text-3xl font-bold text-white tracking-tight">LearnX</h1>
          <p className="text-slate-400 mt-2 text-xs">Educational Knowledge Exchange & Peer Skill Sharing Platform</p>
        </div>

        {/* Quick Demo Login Buttons */}
        <div className="mb-6 bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">Instant Demo Access (Password: Rathika@2808)</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={fillDemoLearner}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2.5 px-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Login as Learner (Ram)
            </button>
            <button
              type="button"
              onClick={fillDemoMentor}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium py-2.5 px-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              Login as Mentor (Rathika)
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${isLogin ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${!isLogin ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. r31668797@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-emerald-600/30 text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In to LearnX'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ram"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="LEARNER">Learner (Receive +5 Credits)</option>
                  <option value="KNOWLEDGE_SHARER">Knowledge Sharer / Mentor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Chennai"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Tamil Nadu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="English"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Education / Work Status</label>
              <input
                type="text"
                value={educationStatus}
                onChange={(e) => setEducationStatus(e.target.value)}
                placeholder="e.g. Engineering Student / Professional"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1">Skills You Want to LEARN (Select multiple)</label>
              <div className="max-h-28 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 grid grid-cols-2 gap-2">
                {skills.map((s) => (
                  <label key={`learn-${s.id}`} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedLearnSkills.includes(s.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLearnSkills([...selectedLearnSkills, s.name]);
                        } else {
                          setSelectedLearnSkills(selectedLearnSkills.filter(item => item !== s.name));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-400 mb-1">Skills You Can SHARE / TEACH (Select multiple)</label>
              <div className="max-h-28 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 grid grid-cols-2 gap-2">
                {skills.map((s) => (
                  <label key={`share-${s.id}`} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedShareSkills.includes(s.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShareSkills([...selectedShareSkills, s.name]);
                        } else {
                          setSelectedShareSkills(selectedShareSkills.filter(item => item !== s.name));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Mandatory Terms & Conditions Checkbox */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I have read and agree to the LearnX{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-emerald-400 underline font-semibold hover:text-emerald-300"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and understand that LearnX is strictly an educational knowledge-sharing platform, not a freelancing, employment, marketing, or money-making platform.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className={`w-full font-semibold py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 ${!termsAccepted ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-600/30'}`}
            >
              <Shield className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Create Account & Agree to Terms'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
