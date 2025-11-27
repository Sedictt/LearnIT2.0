import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Book, Calendar, Users, Gamepad2, ArrowRight, Bug, MessageSquare, Crown, Trophy, Medal } from 'lucide-react';
import { dbService } from '../firebase';
import { Deck } from '../types';

export const Dashboard: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback'>('feedback');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = dbService.getDecks((data) => {
      setDecks(data);
      setLoading(false);
    });

    // Subscribe to leaderboard
    const unsubLeaderboard = dbService.getLeaderboard(5, (users) => {
      setLeaderboard(users);
    });

    return () => {
      unsubscribe();
      unsubLeaderboard();
    };
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newDeck = {
      title: formData.get('title'),
      subject: formData.get('subject'),
      purpose: formData.get('purpose'),
      examDate: formData.get('examDate'),
      author: localStorage.getItem('collab_username') || 'Anonymous'
    };

    console.log('Creating deck:', newDeck);

    try {
      const result = await dbService.createDeck(newDeck);
      console.log('Deck created successfully:', result);
      setShowCreateModal(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating deck:", error);
      alert(`Failed to create deck: ${error.message}\n\nPlease check Firebase Console and ensure:\n1. Firestore is enabled\n2. Security rules allow writes\n3. You're authenticated (if rules require it)`);
    }
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/play/${joinCode.trim()}`);
    }
  };

  const openFeedbackModal = (type: 'bug' | 'feedback') => {
    setFeedbackType(type);
    setFeedbackTitle('');
    setFeedbackDescription('');
    setFeedbackEmail('');
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Save feedback to Firestore
      await dbService.submitFeedback({
        type: feedbackType,
        title: feedbackTitle,
        description: feedbackDescription,
        email: feedbackEmail || 'Not provided',
        username: localStorage.getItem('collab_username') || 'Guest',
        timestamp: Date.now(),
        status: 'pending'
      });

      alert('✅ Thank you for your feedback! We\'ve received your submission and will review it soon.');
      setShowFeedbackModal(false);
      setFeedbackTitle('');
      setFeedbackDescription('');
      setFeedbackEmail('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('❌ Sorry, there was an error submitting your feedback. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero / Join Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Ready to challenge your friends?</h1>
            <p className="text-indigo-100 text-lg">Join a live session to compete in real-time or create a new reviewer deck.</p>
          </div>
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
            <form onSubmit={handleJoinGame} className="flex flex-col gap-3">
              <label className="text-sm font-semibold uppercase tracking-wider text-indigo-200">Join a Session</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter Session ID"
                  className="px-4 py-2 rounded-lg text-slate-900 font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-white w-full md:w-64"
                />
                <button type="submit" className="bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 transition flex items-center gap-2">
                  Join <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <Trophy className="text-yellow-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Top Students</h2>
            <p className="text-slate-500">Highest total correct answers</p>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Medal size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No rankings yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">Be the first to climb the leaderboard by reviewing decks and answering correctly!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {leaderboard.slice(0, 3).map((user, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                let frameColor = 'border-slate-200';
                let badgeColor = 'bg-slate-100 text-slate-600';
                let icon = null;

                if (isFirst) {
                  frameColor = 'border-yellow-400 from-yellow-100 to-yellow-50';
                  badgeColor = 'bg-yellow-100 text-yellow-700';
                  icon = <Crown size={20} className="text-yellow-500 fill-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />;
                } else if (isSecond) {
                  frameColor = 'border-slate-300 from-slate-100 to-slate-50';
                  badgeColor = 'bg-slate-200 text-slate-700';
                  icon = <Medal size={20} className="text-slate-400 absolute -top-5 left-1/2 -translate-x-1/2" />;
                } else if (isThird) {
                  frameColor = 'border-orange-300 from-orange-100 to-orange-50';
                  badgeColor = 'bg-orange-100 text-orange-800';
                  icon = <Medal size={20} className="text-orange-400 absolute -top-5 left-1/2 -translate-x-1/2" />;
                }

                return (
                  <div key={user.id} className={`relative flex flex-col items-center p-6 rounded-2xl border-2 ${isFirst ? 'bg-gradient-to-b ' + frameColor : 'bg-white ' + frameColor} ${isFirst ? 'md:-mt-4 shadow-xl shadow-yellow-100 z-10' : 'shadow-sm'}`}>
                    <div className={`relative w-20 h-20 rounded-full border-4 mb-3 ${isFirst ? 'border-yellow-400' : isSecond ? 'border-slate-300' : 'border-orange-300'}`}>
                      {icon}
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                        className="w-full h-full rounded-full object-cover bg-white"
                      />
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${badgeColor} border border-white shadow-sm`}>
                        #{index + 1}
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{user.username}</h3>
                    <p className="text-slate-500 font-medium">{user.totalCorrectAnswers || 0} pts</p>
                  </div>
                );
              })}
            </div>

            {leaderboard.length > 3 && (
              <div className="mt-6 space-y-3">
                {leaderboard.slice(3).map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-400 w-6 text-center">#{index + 4}</span>
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200"
                      />
                      <span className="font-semibold text-slate-700">{user.username}</span>
                    </div>
                    <span className="font-bold text-indigo-600">{user.totalCorrectAnswers || 0} pts</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Decks Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpenIcon className="text-indigo-600" />
          Review Materials
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-md shadow-indigo-200"
        >
          <Plus size={20} />
          Create Reviewer
        </button>
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Book size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No reviewers yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">Create your first collaborative reviewer to start preparing for your exams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Link key={deck.id} to={`/deck/${deck.id}`} className="group block">
              <article className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                <div className="mb-4">
                  <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md">
                    {deck.subject}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {deck.title}
                </h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">
                  {deck.purpose}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(deck.examDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>{deck.author}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(deck.questionCount * 5, 100)}%` }}></div>
                  </div>
                  <span className="whitespace-nowrap">{deck.questionCount} items</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">New Reviewer</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateDeck} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input name="title" required placeholder="e.g. Finals Reviewer 2024" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input name="subject" required placeholder="e.g. Biology" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Date</label>
                  <input name="examDate" type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose/Description</label>
                <textarea name="purpose" rows={3} placeholder="What is this review for?" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback & Bug Report Buttons - Fixed Position */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button
          onClick={() => openFeedbackModal('feedback')}
          className="group flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-600 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-indigo-100"
          title="Send Feedback"
        >
          <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm hidden md:inline">Feedback</span>
        </button>
        <button
          onClick={() => openFeedbackModal('bug')}
          className="group flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-red-100"
          title="Report a Bug"
        >
          <Bug size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm hidden md:inline">Report Bug</span>
        </button>
      </div>

      {/* Feedback/Bug Report Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${feedbackType === 'bug' ? 'bg-red-50' : 'bg-indigo-50'
              }`}>
              <div className="flex items-center gap-3">
                {feedbackType === 'bug' ? (
                  <>
                    <Bug size={24} className="text-red-600" />
                    <h3 className="text-xl font-bold text-slate-800">Report a Bug</h3>
                  </>
                ) : (
                  <>
                    <MessageSquare size={24} className="text-indigo-600" />
                    <h3 className="text-xl font-bold text-slate-800">Send Feedback</h3>
                  </>
                )}
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {feedbackType === 'bug' ? 'Bug Title' : 'Feedback Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  required
                  placeholder={feedbackType === 'bug' ? 'Brief description of the bug' : 'What would you like to share?'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {feedbackType === 'bug' ? 'What happened?' : 'Tell us more'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedbackDescription}
                  onChange={(e) => setFeedbackDescription(e.target.value)}
                  required
                  rows={5}
                  placeholder={feedbackType === 'bug'
                    ? 'Please describe the bug in detail. What were you doing when it occurred? What did you expect to happen?'
                    : 'Share your thoughts, suggestions, or ideas to help us improve!'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">We'll use this to follow up if needed</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-bold transition ${feedbackType === 'bug'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon Component
const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);
