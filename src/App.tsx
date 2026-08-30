import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import SchoolProfile from './components/SchoolProfile';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import NgoDashboard from './components/NgoDashboard';
import DonorDashboard from './components/DonorDashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
import { ToastContainer, ToastMessage } from './components/Shared';
import { School } from './types';

export default function App() {
  // Navigation Screens: 'landing' | 'school-profile' | 'login' | 'register' | 'dashboard'
  const [screen, setScreen] = useState<'landing' | 'school-profile' | 'login' | 'register' | 'dashboard'>('landing');
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);

  // Auth States
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Public Directory Data
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);

    // Automatically clear toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Restore session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch approved schools for directory list
  const loadPublicSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await fetch('/api/public/schools');
      const data = await response.json();
      if (response.ok) {
        setSchools(data);
      } else {
        throw new Error(data.error || 'Failed to fetch directory list');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    if (screen === 'landing') {
      loadPublicSchools();
    }
  }, [screen]);

  const handleLoginSuccess = (newToken: string, user: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    addToast('You have been logged out successfully.', 'info');
    setScreen('landing');
  };

  // Redirect users when a protected request reports an invalid or expired JWT.
  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
      setScreen('login');
      addToast('Your session has expired. Please log in again.', 'info');
    };

    window.addEventListener('auth:expired', handleSessionExpired);
    return () => window.removeEventListener('auth:expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const headers = new Headers(init?.headers);
      if ((response.status === 401 || response.status === 403) && headers.has('Authorization')) {
        window.dispatchEvent(new Event('auth:expired'));
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const navigateToDashboard = () => {
    if (!currentUser) {
      setScreen('login');
    } else {
      setScreen('dashboard');
    }
  };

  // Render role-specific dashboards with route-guards
  const renderDashboard = () => {
    if (!currentUser) {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => setScreen('register')}
          onNavigateHome={() => setScreen('landing')}
          addToast={addToast}
        />
      );
    }

    const role = currentUser.role;

    if (role === 'admin') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          addToast={addToast}
        />
      );
    }

    if (role === 'ngo') {
      if (currentUser.status !== 'approved') {
        return (
          <div className="min-h-screen bg-paper flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl border-2 border-slate-200 p-8 text-center space-y-4 shadow-md">
              <div className="text-3xl font-mono text-amber-500 font-bold bg-amber-50 px-3 py-1.5 rounded-full w-fit mx-auto border border-amber-100">
                PENDING
              </div>
              <h3 className="font-display text-2xl font-bold text-chalkboard">Awaiting Admin Verification</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans font-light">
                Your school account (<span className="font-semibold">{currentUser.name}</span>) was created successfully but is currently <span className="font-bold">Pending Review</span>.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 p-4 rounded-xl text-left border border-amber-100 leading-normal">
                To prevent spam and protect our community, administrators verify school registries manually before putting profiles live. Thank you for your patience!
              </p>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setScreen('landing')}
                  className="flex-1 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Return Home
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <NgoDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          addToast={addToast}
        />
      );
    }

    if (role === 'donor') {
      return (
        <DonorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          addToast={addToast}
        />
      );
    }

    if (role === 'delivery') {
      return (
        <DeliveryDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          addToast={addToast}
        />
      );
    }

    // Fallback log out if role mismatch
    handleLogout();
    return null;
  };

  return (
    <div className="font-sans antialiased">
      {/* Dynamic Screen router */}
      {screen === 'landing' && (
        <Landing
          schools={schools}
          onSelectSchool={(id) => {
            setActiveSchoolId(id);
            setScreen('school-profile');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateLogin={() => setScreen('login')}
          onNavigateRegister={() => setScreen('register')}
          onNavigateDashboard={navigateToDashboard}
          loading={loadingSchools}
        />
      )}

      {screen === 'school-profile' && activeSchoolId !== null && (
        <SchoolProfile
          schoolId={activeSchoolId}
          currentUser={currentUser}
          onBack={() => {
            setActiveSchoolId(null);
            setScreen('landing');
          }}
          onNavigateLogin={() => setScreen('login')}
          addToast={addToast}
        />
      )}

      {screen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => setScreen('register')}
          onNavigateHome={() => setScreen('landing')}
          addToast={addToast}
        />
      )}

      {screen === 'register' && (
        <Register
          onRegisterSuccess={() => setScreen('login')}
          onNavigateLogin={() => setScreen('login')}
          onNavigateHome={() => setScreen('landing')}
          addToast={addToast}
        />
      )}

      {screen === 'dashboard' && renderDashboard()}

      {/* Floating global Toast alerts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
