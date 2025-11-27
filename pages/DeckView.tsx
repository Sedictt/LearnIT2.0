import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../firebase';
import { Deck, Question, QuestionType } from '../types';
import { Plus, Play, Sparkles, BookOpen, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { generateQuestions } from '../services/geminiService';
import { QUESTION_TYPES } from '../constants';

export const DeckView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Add Question State
  const [qType, setQType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Solo Review State
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [userTextInput, setUserTextInput] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    dbService.getDeck(id).then((d) => setDeck(d as Deck));
    const unsub = dbService.getQuestions(id, (qs) => {
      setQuestions(qs);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const handleAddQuestion = async () => {
    if (!id || !qText || !qAnswer) {
      alert("Please fill in all required fields");
      return;
    }

    // Simple validation
    if (qType === QuestionType.MULTIPLE_CHOICE && qOptions.some(o => !o.trim())) {
      alert("Please fill all options");
      return;
    }

    const questionData: any = {
      type: qType,
      question: qText,
      answer: qAnswer,
      author: localStorage.getItem('collab_username') || 'Anonymous'
    };

    if (qType === QuestionType.MULTIPLE_CHOICE) {
      questionData.options = qOptions;
    }

    try {
      if (editingQuestion) {
        await dbService.updateQuestion(id, editingQuestion.id, questionData);
      } else {
        await dbService.addQuestion(id, questionData);
      }
      resetForm();
      setShowAddModal(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    }
  };

  const handleGenerateAI = async () => {
    if (!deck) return;
    setGenerating(true);
    try {
      const generatedQs = await generateQuestions(deck.subject, deck.purpose);
      for (const q of generatedQs) {
        await dbService.addQuestion(deck.id, q);
      }
    } catch (e) {
      alert("Failed to generate questions. Check console or API key.");
    } finally {
      setGenerating(false);
      setShowAddModal(false);
    }
  };

  const startLiveSession = async () => {
    if (!deck || !id) return;
    const hostId = localStorage.getItem('collab_uid')!;
    const docRef = await dbService.createSession(id, deck.title, hostId);
    navigate(`/play/${docRef.id}`);
  };

  const resetForm = () => {
    setQText('');
    setQOptions(['', '', '', '']);
    setQAnswer('');
    setQType(QuestionType.MULTIPLE_CHOICE);
    setEditingQuestion(null);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQText(q.question);
    setQOptions(q.options || ['', '', '', '']);
    setQAnswer(q.answer as string);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await dbService.deleteQuestion(id, questionId);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading...</div>;
  if (!deck) return <div className="p-12 text-center text-red-500">Deck not found</div>;

  // Render Solo Review Mode
  if (reviewMode) {
    const currentQ = questions[currentReviewIndex];

    const handleAnswerSelect = (answer: string) => {
      setSelectedAnswer(answer);
      const correct = answer === currentQ.answer;
      setIsCorrect(correct);
      setShowAnswer(true);

      if (correct) {
        const uid = localStorage.getItem('collab_uid');
        console.log('Attempting to update score for UID:', uid);
        if (uid) {
          dbService.incrementUserScore(uid);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        } else {
          console.error('No user ID found in localStorage');
          alert("Error: User ID not found. Please refresh the page.");
        }
      }
    };

    const handleNext = () => {
      if (currentReviewIndex < questions.length - 1) {
        setCurrentReviewIndex(prev => prev + 1);
        setShowAnswer(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setUserTextInput('');
      } else {
        setReviewMode(false);
        setCurrentReviewIndex(0);
        setShowAnswer(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setUserTextInput('');
      }
    };

    const handleCheckAnswer = () => {
      const answer = currentQ.answer;
      let correct = false;
      const input = userTextInput.trim().toLowerCase();

      if (Array.isArray(answer)) {
        const normalizedAnswer = answer.map(a => a.toLowerCase().trim()).join(', ');
        if (input === normalizedAnswer) correct = true;
        else if (answer.some(a => a.toLowerCase().trim() === input)) correct = true;
      } else {
        correct = input === answer.trim().toLowerCase();
      }
      setIsCorrect(correct);
      setShowAnswer(true);

      if (correct) {
        const uid = localStorage.getItem('collab_uid');
        console.log('Attempting to update score for UID:', uid);
        if (uid) {
          dbService.incrementUserScore(uid);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        } else {
          console.error('No user ID found in localStorage');
          alert("Error: User ID not found. Please refresh the page.");
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !showAnswer) {
        handleCheckAnswer();
      }
    };

    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-700">Reviewing {currentReviewIndex + 1} / {questions.length}</h2>
          <button onClick={() => {
            setReviewMode(false);
            setShowAnswer(false);
            setSelectedAnswer(null);
            setIsCorrect(null);
          }} className="text-sm font-medium text-slate-500 hover:text-slate-800">Exit Review</button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-100">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentReviewIndex + 1) / questions.length) * 100}%` }}></div>
          </div>

          <div className="space-y-6 mt-4">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-500 tracking-wider">
              {currentQ.type.replace('_', ' ')}
            </span>
            <h3 className="text-2xl font-bold text-slate-900 leading-snug">{currentQ.question}</h3>

            {/* Show options for multiple choice */}
            {currentQ.type === QuestionType.MULTIPLE_CHOICE && currentQ.options && (
              <div className="space-y-3 mt-6">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrectAnswer = opt === currentQ.answer;
                  const showResult = showAnswer && isSelected;

                  return (
                    <button
                      key={idx}
                      onClick={() => !showAnswer && handleAnswerSelect(opt)}
                      disabled={showAnswer}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition text-left ${showAnswer && isCorrectAnswer
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-medium'
                        : showResult && !isCorrect
                          ? 'bg-red-50 border-red-400 text-red-800 font-medium'
                          : isSelected && !showAnswer
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:hover:bg-white disabled:hover:border-slate-200'
                        } ${!showAnswer ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                      {showAnswer && isCorrectAnswer && (
                        <CheckCircle className="inline ml-2 text-emerald-600" size={20} />
                      )}
                      {showResult && !isCorrect && (
                        <XCircle className="inline ml-2 text-red-600" size={20} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input for Identification/Enumeration */}
            {currentQ.type !== QuestionType.MULTIPLE_CHOICE && (
              <div className="mt-6">
                <input
                  type="text"
                  value={userTextInput}
                  onChange={(e) => setUserTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={showAnswer}
                  placeholder="Type your answer here..."
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition ${showAnswer
                    ? isCorrect
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-red-50 border-red-400 text-red-800'
                    : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                />
              </div>
            )}

            {/* Feedback message */}
            {showAnswer && isCorrect !== null && (
              <div className={`animate-in fade-in slide-in-from-bottom-4 duration-300 p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}>
                <p className={`font-bold text-lg ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-red-700 mt-1">
                    The correct answer is: <span className="font-bold">{currentQ.answer}</span>
                  </p>
                )}
              </div>
            )}

            {showAnswer && currentQ.type !== QuestionType.MULTIPLE_CHOICE && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-emerald-50 border border-emerald-100 p-6 rounded-xl mt-6">
                <p className="text-sm font-semibold text-emerald-800 uppercase mb-2">Correct Answer</p>
                <p className="text-xl font-medium text-emerald-900">{Array.isArray(currentQ.answer) ? currentQ.answer.join(', ') : currentQ.answer}</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-4">
            {!showAnswer && currentQ.type !== QuestionType.MULTIPLE_CHOICE && (
              <div className="flex-1 flex gap-3">
                <button
                  onClick={handleCheckAnswer}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                  Check Answer
                </button>
                <button
                  onClick={() => { setIsCorrect(false); setShowAnswer(true); }}
                  className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition"
                >
                  Reveal
                </button>
              </div>
            )}
            <button
              onClick={handleNext}
              disabled={!showAnswer}
              className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentReviewIndex < questions.length - 1 ? 'Next Question' : 'Finish Review'}
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
            <span className="text-yellow-400 font-bold">+1</span>
            <span className="font-medium">Point added to leaderboard!</span>
          </div>
        )}
      </div>
    );
  }

  // Render Default View
  return (
    <div className="space-y-8 pb-24">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <span className="text-indigo-600 font-bold text-sm tracking-wider uppercase">{deck.subject}</span>
            <h1 className="text-4xl font-extrabold text-slate-900 mt-1 mb-2">{deck.title}</h1>
            <p className="text-slate-500 text-lg max-w-2xl">{deck.purpose}</p>
            <div className="flex items-center gap-4 mt-6 text-sm text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><BookOpen size={16} /> {questions.length} Questions</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>Exam: {new Date(deck.examDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-[200px]">
            <button
              onClick={startLiveSession}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Play size={20} fill="currentColor" /> Live Game
            </button>
            <button
              onClick={() => { setReviewMode(true); setCurrentReviewIndex(0); setShowAnswer(false); }}
              disabled={questions.length === 0}
              className="w-full bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition disabled:opacity-50"
            >
              Start Review
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Questions</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-indigo-600 font-semibold bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">No questions yet. Add one or ask AI!</p>
            <button onClick={() => setShowAddModal(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Add First Question</button>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-200 transition group relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{q.type}</span>
                  </div>
                  <p className="text-lg font-medium text-slate-800">{q.question}</p>
                  {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-sm px-3 py-2 rounded border ${opt === q.answer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type !== QuestionType.MULTIPLE_CHOICE && (
                    <div className="mt-3 text-sm text-emerald-600 font-medium bg-emerald-50 inline-block px-3 py-1 rounded">
                      Answer: {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                <span>Added by {q.author}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditQuestion(q)}
                    className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded font-medium text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded font-medium text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-slate-800">{editingQuestion ? 'Edit Question' : 'Add to Reviewer'}</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Banner */}
              <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg shadow-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles size={20} className="text-yellow-300" />
                  </div>
                  <div>
                    <h4 className="font-bold">Feeling lazy?</h4>
                    <p className="text-sm text-indigo-100">Let Gemini generate questions for you.</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Auto-Generate'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    {QUESTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setQType(t.value as QuestionType)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition ${qType === t.value ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                  <textarea
                    value={qText}
                    onChange={e => setQText(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Type your question here..."
                  />
                </div>

                {qType === QuestionType.MULTIPLE_CHOICE && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Options (Select the correct one)</label>
                    {qOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setQAnswer(qOptions[idx])}
                          className={`w-10 flex-shrink-0 flex items-center justify-center rounded-lg border transition ${qAnswer === qOptions[idx] && qOptions[idx] !== '' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-slate-400 hover:border-slate-400'}`}
                        >
                          {qAnswer === qOptions[idx] && qOptions[idx] !== '' ? <CheckCircle size={18} /> : String.fromCharCode(65 + idx)}
                        </button>
                        <input
                          value={opt}
                          onChange={e => {
                            const newOpts = [...qOptions];
                            const oldValue = newOpts[idx];
                            newOpts[idx] = e.target.value;
                            setQOptions(newOpts);
                            // If this option was selected as answer, update answer to new value
                            if (qAnswer === oldValue) {
                              setQAnswer(e.target.value);
                            }
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {qType !== QuestionType.MULTIPLE_CHOICE && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
                    <input
                      value={qAnswer}
                      onChange={e => setQAnswer(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={qType === QuestionType.ENUMERATION ? "Comma separated items..." : "Exact answer..."}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="px-5 py-2.5 text-slate-600 font-medium hover:text-slate-800">Cancel</button>
              <button onClick={handleAddQuestion} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">{editingQuestion ? 'Update Question' : 'Save Question'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
