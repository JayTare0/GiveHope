import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, School, FileText, Image, ArrowLeft, ShieldAlert } from 'lucide-react';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85',
    label: 'Woodlands Classroom'
  },
  {
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=85',
    label: 'Reading Center'
  },
  {
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=85',
    label: 'Outdoor Classroom'
  },
  {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85',
    label: 'Art Club Workshop'
  }
];

export default function Register({ onRegisterSuccess, onNavigateLogin, onNavigateHome, addToast }: RegisterProps) {
  // Tabs: 'ngo', 'donor', 'delivery'
  const [role, setRole] = useState<'ngo' | 'donor' | 'delivery'>('ngo');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // NGO Specific Fields
  const [schoolName, setSchoolName] = useState('');
  const [blurb, setBlurb] = useState('');
  const [photoUrl, setPhotoUrl] = useState(PRESET_PHOTOS[0].url);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      addToast('Please fill out all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (role === 'ngo' && (!schoolName || !blurb)) {
      addToast('Please enter your school/NGO name and story.', 'error');
      return;
    }

    setLoading(true);

    const payload: any = {
      name,
      email,
      password,
      role
    };

    if (role === 'ngo') {
      payload.schoolName = schoolName;
      payload.blurb = blurb;
      payload.photoUrl = photoUrl;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (role === 'ngo') {
        addToast('Registration submitted! Your school account is now pending admin approval.', 'success');
      } else {
        addToast('Account created successfully! You can now log in.', 'success');
      }

      onRegisterSuccess();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[95vh] flex items-center justify-center bg-paper py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background vectors */}
      <div className="absolute -top-10 -left-10 text-chalkboard/5 select-none font-display text-9xl rotate-6 pointer-events-none">Volunteer</div>
      <div className="absolute -bottom-10 -right-10 text-chalkboard/5 select-none font-display text-9xl -rotate-6 pointer-events-none">Direct</div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-xl border-4 border-chalkboard shadow-[8px_8px_0px_rgba(46,74,61,0.25)] p-8 sm:p-10 relative z-10 rotate-[0.5deg]"
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
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-black italic text-chalkboard">
            Create Your Account
          </h2>
          <p className="mt-2 text-xs text-chalkboard/85 font-semibold font-sans">
            Choose your role to get started helping local classrooms.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mt-8 flex rounded-xl bg-paper p-1.5 border-4 border-chalkboard shadow-[3px_3px_0px_#2E4A3D]">
          <button
            type="button"
            onClick={() => setRole('ngo')}
            className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              role === 'ngo'
                ? 'bg-chalkboard text-paper border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-chalkboard hover:bg-white/40'
            }`}
          >
            School / NGO
          </button>
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              role === 'donor'
                ? 'bg-chalkboard text-paper border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-chalkboard hover:bg-white/40'
            }`}
          >
            Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('delivery')}
            className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              role === 'delivery'
                ? 'bg-chalkboard text-paper border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-chalkboard hover:bg-white/40'
            }`}
          >
            Volunteer
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Section: Account Login Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                Your Contact Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                Email Address *
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
                  placeholder="john@example.com"
                  className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section: NGO-Specific profile fields */}
          {role === 'ngo' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="border-t-2 border-chalkboard/10 pt-6 space-y-5"
            >
              <h3 className="text-sm font-black text-chalkboard flex items-center gap-1.5 font-sans">
                <School className="w-4 h-4 text-chalkboard" /> School / NGO Profile Information
              </h3>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                  School / NGO Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                    <School className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required={role === 'ngo'}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Hope City Education Center"
                    className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-1.5 font-mono">
                  Our Story & Purpose *
                </label>
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 text-chalkboard/60">
                    <FileText className="h-4 w-4" />
                  </div>
                  <textarea
                    required={role === 'ngo'}
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value)}
                    rows={3}
                    placeholder="Tell local donors who you support and why you need school supplies..."
                    className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-medium resize-none"
                  />
                </div>
              </div>

              {/* Photo Select Preset */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-chalkboard mb-2.5 font-mono">
                  Select a School Profile Photo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {PRESET_PHOTOS.map((preset, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setPhotoUrl(preset.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-3 transition-all cursor-pointer ${
                        photoUrl === preset.url
                          ? 'border-chalkboard shadow-[3px_3px_0px_#E8B342] scale-[1.02]'
                          : 'border-chalkboard/30 opacity-65 hover:opacity-100 hover:border-chalkboard'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-chalkboard/85 text-[9px] text-white py-0.5 text-center truncate px-1 font-bold">
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-chalkboard/60">
                    <Image className="h-4 w-4" />
                  </div>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="Or enter custom image URL"
                    className="block w-full pl-10 pr-4 py-2.5 border-3 border-chalkboard rounded-lg text-chalkboard placeholder-chalkboard/40 focus:outline-none focus:ring-2 focus:ring-chalkboard/50 transition text-sm font-mono"
                  />
                </div>
              </div>

              {/* Approval Info Alert Box */}
              <div className="flex gap-3 bg-amber-100 border-3 border-chalkboard p-4 rounded-xl shadow-[3px_3px_0px_#E8B342]">
                <ShieldAlert className="w-5 h-5 text-chalkboard shrink-0 mt-0.5" />
                <div className="text-xs text-chalkboard leading-relaxed">
                  <span className="font-black">Trust and Quality Assurance:</span> New school registrations are set to <span className="font-black bg-white/60 border border-chalkboard px-1 py-0.5 rounded font-mono text-[10px]">PENDING</span>. Your profile will go live in the directory once a system administrator approves your registration. This protects against spam.
                </div>
              </div>
            </motion.div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border-3 border-chalkboard rounded-lg text-xs font-black uppercase tracking-widest text-chalkboard bg-pencil hover:bg-pencil-hover focus:outline-none shadow-[4px_4px_0px_#2E4A3D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#2E4A3D] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Submit Registration'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-chalkboard/10 text-center">
          <p className="text-xs font-semibold text-chalkboard/75">
            Already have an account?{' '}
            <button
              onClick={onNavigateLogin}
              className="font-black text-chalkboard underline underline-offset-4 hover:text-pencil-hover focus:outline-none cursor-pointer"
            >
              Log in instead
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
