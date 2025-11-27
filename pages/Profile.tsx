import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Save, ArrowLeft, Loader, RefreshCw } from 'lucide-react';
import { auth, dbService, storageService } from '../firebase';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [previewURL, setPreviewURL] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // For guest users
      const guestName = localStorage.getItem('collab_username');
      const guestPhoto = localStorage.getItem('collab_photoURL');
      setDisplayName(guestName || '');
      setPhotoURL(guestPhoto || '');
      setPreviewURL(guestPhoto || '');
      setLoading(false);
      return;
    }

    // For authenticated users
    setUser(currentUser);
    setDisplayName(currentUser.displayName || '');
    setPhotoURL(currentUser.photoURL || '');
    setPreviewURL(currentUser.photoURL || '');

    // Load user profile from Firestore
    dbService.getUserProfile(currentUser.uid).then((profile: any) => {
      if (profile?.photoURL) {
        setPhotoURL(profile.photoURL);
        setPreviewURL(profile.photoURL);
      }
      if (profile?.displayName) {
        setDisplayName(profile.displayName);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setError('');
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    try {
      const userId = user?.uid || localStorage.getItem('collab_uid') || 'guest';
      const downloadURL = await storageService.uploadProfilePicture(userId, selectedFile);
      setPhotoURL(downloadURL);
      setPreviewURL(downloadURL);
      setSelectedFile(null);
      setSuccess('Profile picture uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRecalculateContributions = async () => {
    setRecalculating(true);
    try {
      const userId = user?.uid || localStorage.getItem('collab_uid');
      const username = displayName || localStorage.getItem('collab_username');

      if (userId && username) {
        const count = await dbService.recalculateUserContributions(userId, username);
        setSuccess(`Recalculated! You have contributed ${count} questions.`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Cannot identify user for recalculation.');
      }
    } catch (error) {
      console.error('Recalculation error:', error);
      setError('Failed to recalculate contributions.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (user) {
        // Save to Firestore for authenticated users
        await dbService.updateUserProfile(user.uid, {
          displayName: displayName.trim(),
          photoURL: photoURL,
          updatedAt: Date.now()
        });
      } else {
        // Save to localStorage for guest users
        localStorage.setItem('collab_username', displayName.trim());
        if (photoURL) {
          localStorage.setItem('collab_photoURL', photoURL);
        }
      }
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="text-indigo-600" size={28} />
          <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
              !
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
              ✓
            </div>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Profile Picture
          </label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center border-4 border-slate-100">
                {previewURL ? (
                  <img
                    src={previewURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-slate-400" />
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition shadow-lg"
              >
                <Camera size={20} />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              {selectedFile ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Selected: <span className="font-medium">{selectedFile.name}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader className="animate-spin" size={16} />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={16} />
                          Upload Photo
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewURL(photoURL);
                      }}
                      disabled={uploading}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Click the camera icon to upload a new profile picture (max 5MB)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Display Name Section */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Account Type Info */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Account Type:</span>{' '}
            {user ? (
              <>
                <span className="text-indigo-600">Google Account</span>
                <span className="text-slate-500 ml-2">({user.email})</span>
              </>
            ) : (
              <span className="text-amber-600">Guest User</span>
            )}
          </p>
        </div>

        {/* Account Actions */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Account Actions</h3>
          <button
            onClick={handleRecalculateContributions}
            disabled={recalculating}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Sync Previous Contributions'}
          </button>
          <p className="text-xs text-slate-500 mt-1">
            Click this if your contribution score on the leaderboard seems incorrect. It will recount all questions you've authored.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={saving || uploading || !displayName.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            {saving ? (
              <>
                <Loader className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
