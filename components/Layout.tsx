import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, BookOpen, LogOut } from 'lucide-react';
import { Login } from './Login';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('collab_username'));
  const location = useLocation();

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
  };

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">CollabQuiz</h1>
            <p className="text-slate-500">Study together, win together.</p>
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
                Q
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                CollabQuiz
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Login />
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
