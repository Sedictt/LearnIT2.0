import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, BookOpen, LogOut } from 'lucide-react';
import { Login } from './Login';
import { authService } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('collab_username'));
  const [photoURL, setPhotoURL] = useState<string | null>(localStorage.getItem('collab_photoURL'));
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUsername(currentUser.displayName || currentUser.email);
        // Load custom photo from Firestore instead of Google photo
        import('../firebase').then(({ dbService }) => {
          dbService.getUserProfile(currentUser.uid).then((profile: any) => {
            if (profile?.photoURL) {
              setPhotoURL(profile.photoURL);
            } else {
              setPhotoURL(currentUser.photoURL);
            }
          }).catch(() => {
            setPhotoURL(currentUser.photoURL);
          });
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update from localStorage for guest users
    const guestPhoto = localStorage.getItem('collab_photoURL');
    if (!user && guestPhoto) {
      setPhotoURL(guestPhoto);
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('username') as HTMLInputElement;
    if (input.value.trim()) {
      localStorage.setItem('collab_username', input.value.trim());
      // Simple random ID for the session
      if (!localStorage.getItem('collab_uid')) {
        localStorage.setItem('collab_uid', 'user_' + Math.random().toString(36).substr(2, 9));
      }
      setUsername(input.value.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('collab_username');
    setUsername(null);
    if (user) {
      authService.signOut();
    }
  };

  if (!username && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">LearnIT</h1>
            <p className="text-slate-500">Study together, win together.</p>
          </div>
          
          {/* Google Sign In */}
          <div className="mb-6">
            <Login />
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or continue as guest</span>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">What should we call you?</label>
              <input 
                name="username"
                type="text" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="Enter your name"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              Start Studying
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                L
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                LearnIT
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/profile"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition cursor-pointer"
              >
                {photoURL ? (
                  <img 
                    src={photoURL} 
                    alt={username || 'User'} 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User size={16} className="text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-700">{username}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
