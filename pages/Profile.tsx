import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Save, ArrowLeft, Camera } from 'lucide-react';
import { auth, authService, dbService } from '../firebase';
import { updateProfile } from 'firebase/auth';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    photoURL: '',
  });

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData({
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
        });
      } else {
        // For guest users
        const guestName = localStorage.getItem('collab_username') || '';
        setFormData({
          displayName: guestName,
          email: '',
          photoURL: '',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (user) {
        // Update Firebase Auth profile for Google users
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: formData.photoURL || null,
        });
        
        // Update user profile in Firestore
        await dbService.updateUserProfile(user.uid, {
          displayName: formData.displayName,
          photoURL: formData.photoURL,
          email: formData.email,
          updatedAt: Date.now(),
        });
        
        setMessage('Profile updated successfully!');
      } else {
        // Update guest user in localStorage
        localStorage.setItem('collab_username', formData.displayName);
        setMessage('Profile updated successfully!');
      }
      
      // Refresh the page to show updated info
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Profile update error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-6 transition"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
            <p className="text-slate-500">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Preview */}
          {formData.photoURL && (
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={formData.photoURL}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100"
                />
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white">
                  <Camera size={18} className="text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="Your name"
                required
              />
            </div>
          </div>

          {/* Email (Read-only for Google users) */}
          {user && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  placeholder="your@email.com"
                  disabled
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>
          )}

          {/* Photo URL */}
          {user && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Profile Picture URL
              </label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="url"
                  name="photoURL"
                  value={formData.photoURL}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Optional: Enter a URL for your profile picture</p>
            </div>
          )}

          {/* Account Type Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              <strong>Account Type:</strong> {user ? 'Google Account' : 'Guest Account'}
            </p>
            {!user && (
              <p className="text-xs text-slate-500 mt-1">
                Sign in with Google to access more features and sync across devices
              </p>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
