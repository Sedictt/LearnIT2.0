import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../firebase';
import { Bug, MessageSquare, Mail, User, Calendar, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feedback';
  title: string;
  description: string;
  email: string;
  username: string;
  timestamp: number;
  status: string;
}

export const FeedbackView: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bug' | 'feedback'>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = dbService.getFeedback((data) => {
      setFeedbacks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredFeedbacks = feedbacks.filter(f => filter === 'all' || f.type === filter);
  const bugCount = feedbacks.filter(f => f.type === 'bug').length;
  const feedbackCount = feedbacks.filter(f => f.type === 'feedback').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Feedback & Bug Reports</h1>
          <p className="text-slate-600">View and manage all user submissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-3xl font-bold text-slate-900">{feedbacks.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <MessageSquare className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Bug Reports</p>
                <p className="text-3xl font-bold text-red-600">{bugCount}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Bug className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Feedback</p>
                <p className="text-3xl font-bold text-indigo-600">{feedbackCount}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <MessageSquare className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm border border-slate-200 w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({feedbacks.length})
          </button>
          <button
            onClick={() => setFilter('bug')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              filter === 'bug' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bugs ({bugCount})
          </button>
          <button
            onClick={() => setFilter('feedback')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              filter === 'feedback' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Feedback ({feedbackCount})
          </button>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading feedback...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">No {filter === 'all' ? 'feedback' : filter === 'bug' ? 'bug reports' : 'feedback'} yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFeedbacks.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedFeedback(item)}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {item.type === 'bug' ? (
                        <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
                          <Bug size={14} />
                          Bug Report
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold flex items-center gap-1">
                          <MessageSquare size={14} />
                          Feedback
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {item.username}
                      </span>
                      {item.email !== 'Not provided' && (
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {item.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className={`p-6 border-b border-slate-100 ${
                selectedFeedback.type === 'bug' ? 'bg-red-50' : 'bg-indigo-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedFeedback.type === 'bug' ? (
                        <Bug size={24} className="text-red-600" />
                      ) : (
                        <MessageSquare size={24} className="text-indigo-600" />
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedFeedback.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {selectedFeedback.type === 'bug' ? 'Bug Report' : 'Feedback'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedFeedback.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Description</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedFeedback.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Submitted by</h3>
                    <p className="text-slate-600">{selectedFeedback.username}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Email</h3>
                    <p className="text-slate-600">{selectedFeedback.email}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1">Submitted on</h3>
                  <p className="text-slate-600">
                    {new Date(selectedFeedback.timestamp).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1">Status</h3>
                  <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold">
                    {selectedFeedback.status}
                  </span>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
