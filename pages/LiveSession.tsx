import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../firebase';
import { GameSession, GameStatus, Question } from '../types';
import { Trophy, Clock, Users, ChevronRight, Crown } from 'lucide-react';

export const LiveSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const uid = localStorage.getItem('collab_uid')!;
  const username = localStorage.getItem('collab_username')!;

  const [session, setSession] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    const unsubSession = dbService.subscribeToSession(sessionId, (data) => {
      if (data) {
        setSession(data as GameSession);
        setIsHost(data.hostId === uid);
        
        // Auto-join if not host and not in list
        if (data.hostId !== uid && !data.players?.[uid] && !hasJoined) {
          joinGame(sessionId, uid, username);
          setHasJoined(true);
        }

        // Track submission counts
        const players = Object.values(data.players || {});
        const submitted = players.filter((p: any) => p.hasSubmitted).length;
        setSubmittedCount(submitted);
        setTotalPlayers(players.length);
        
        // Auto-reveal when all players have submitted
        if (data.status === GameStatus.PLAYING && !data.showAnswer && 
            players.length > 0 && submitted === players.length && submitted > 0) {
          setTimeout(() => {
            dbService.updateSession(sessionId, { showAnswer: true });
          }, 500);
        }
        
        // Auto-advance to next question after 5 seconds of showing answer
        if (data.status === GameStatus.PLAYING && data.showAnswer && 
            players.length > 0 && submitted === players.length) {
          setTimeout(() => {
            const nextIdx = data.currentQuestionIndex + 1;
            if (nextIdx < questions.length) {
              dbService.updateSession(sessionId, { 
                currentQuestionIndex: nextIdx,
                showAnswer: false 
              });
            } else {
              dbService.updateSession(sessionId, { status: GameStatus.FINISHED });
            }
          }, 5000);
        }

        // Fetch questions only once if needed
        if (questions.length === 0 && data.deckId) {
           dbService.getQuestions(data.deckId, (qs) => setQuestions(qs));
        }
      } else {
        alert("Session ended or not found");
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubSession();
  }, [sessionId, uid, username, hasJoined, questions.length, navigate]);

  // Reset submission states for all players when question changes
  useEffect(() => {
    if (!sessionId || !session) return;
    
    setSelectedAnswer(null);
    setHasSubmitted(false);
    
    // Reset all players' submission status
    const updates: any = {};
    Object.keys(session.players || {}).forEach(playerId => {
      updates[`players.${playerId}.hasSubmitted`] = false;
      updates[`players.${playerId}.submittedAnswer`] = null;
      updates[`players.${playerId}.isCorrect`] = null;
    });
    
    if (Object.keys(updates).length > 0) {
      dbService.updateSession(sessionId, updates);
    }
  }, [session?.currentQuestionIndex]);

  const joinGame = async (sid: string, pid: string, pname: string) => {
     await dbService.joinSession(sid, pid, pname);
  };

  const startGame = async () => {
    if (!sessionId) return;
    await dbService.updateSession(sessionId, { status: GameStatus.PLAYING, currentQuestionIndex: 0 });
  };

  const nextQuestion = async () => {
    if (!sessionId || !session) return;
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
       await dbService.updateSession(sessionId, { 
         currentQuestionIndex: nextIdx,
         showAnswer: false 
       });
    } else {
       await dbService.updateSession(sessionId, { status: GameStatus.FINISHED });
    }
  };

  const revealAnswer = async () => {
    if(!sessionId) return;
    await dbService.updateSession(sessionId, { showAnswer: true });
  };

  const submitAnswer = async () => {
    if (!sessionId || !selectedAnswer || hasSubmitted || session?.showAnswer) return;
    
    setHasSubmitted(true);
    
    const currentQ = questions[session!.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQ.answer;

    // Update player submission status and answer
    const updates: any = {
      [`players.${uid}.hasSubmitted`]: true,
      [`players.${uid}.submittedAnswer`]: selectedAnswer,
      [`players.${uid}.isCorrect`]: isCorrect
    };
    
    // Award points if correct
    if (isCorrect) {
      const currentScore = session?.players[uid]?.score || 0;
      updates[`players.${uid}.score`] = currentScore + 100;
    }
    
    await dbService.updateSession(sessionId, updates);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-indigo-600 font-bold">Connecting...</div>;
  if (!session) return null;

  const currentQ = questions[session.currentQuestionIndex];

  // ---------------- LOBBY VIEW ----------------
  if (session.status === GameStatus.LOBBY) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
         <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-3xl text-center space-y-8 border border-slate-100">
            <div className="inline-block p-4 bg-indigo-50 rounded-full mb-4">
                <Crown size={48} className="text-indigo-600" />
            </div>
            <div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">{session.deckTitle}</h1>
                <p className="text-xl text-slate-500 font-medium">Session ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">{session.id}</span></p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-8">
                {Object.values(session.players || {}).map((player: any) => (
                    <div key={player.id} className="animate-in zoom-in duration-300 flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl font-bold text-slate-600 border-2 border-white shadow-md">
                            {player.name[0].toUpperCase()}
                        </div>
                        <span className="mt-2 text-sm font-bold text-slate-700">{player.name}</span>
                    </div>
                ))}
                {Object.keys(session.players || {}).length === 0 && (
                    <div className="col-span-full text-slate-400 italic">Waiting for players to join...</div>
                )}
            </div>

            {isHost ? (
                <button 
                  onClick={startGame}
                  disabled={Object.keys(session.players || {}).length === 0}
                  className="w-full md:w-auto px-12 py-4 bg-indigo-600 text-white text-xl font-bold rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Game
                </button>
            ) : (
                <div className="flex items-center justify-center gap-3 text-indigo-600 font-bold animate-pulse">
                    <Clock size={20} />
                    Waiting for host to start...
                </div>
            )}
         </div>
      </div>
    );
  }

  // ---------------- GAME OVER VIEW ----------------
  if (session.status === GameStatus.FINISHED) {
      const sortedPlayers = Object.values(session.players || {}).sort((a:any, b:any) => b.score - a.score);
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
             <div className="text-center mb-12">
                 <Trophy size={64} className="mx-auto text-yellow-400 mb-4 drop-shadow-lg" />
                 <h1 className="text-5xl font-black text-slate-900">Game Over!</h1>
             </div>
             
             <div className="w-full max-w-md space-y-4">
                 {sortedPlayers.map((player: any, idx) => (
                     <div key={player.id} className={`flex items-center justify-between p-4 rounded-xl shadow-lg border-2 ${idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' : 'bg-white border-slate-100'}`}>
                         <div className="flex items-center gap-4">
                             <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-600'}`}>
                                 {idx + 1}
                             </div>
                             <span className="font-bold text-lg text-slate-800">{player.name}</span>
                         </div>
                         <span className="font-mono font-bold text-indigo-600">{player.score} pts</span>
                     </div>
                 ))}
             </div>
             <button onClick={() => navigate('/')} className="mt-12 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">Back to Dashboard</button>
          </div>
      );
  }

  // ---------------- PLAYING VIEW ----------------
  if (!currentQ) return <div>Loading Question...</div>;

  const sortedPlayers = Object.values(session.players || {}).sort((a: any, b: any) => b.score - a.score);

  return (
    <div className="flex gap-6 py-8 px-4 max-w-7xl mx-auto">
        {/* Live Ranking Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Trophy size={20} />
                        Live Rankings
                    </h3>
                </div>
                <div className="p-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {sortedPlayers.map((player: any, idx) => (
                        <div 
                            key={player.id} 
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                player.id === uid 
                                    ? 'bg-indigo-50 border-2 border-indigo-300 scale-105' 
                                    : idx === 0 
                                    ? 'bg-yellow-50 border border-yellow-200' 
                                    : 'bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${
                                    idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                                    idx === 1 ? 'bg-slate-300 text-slate-700' :
                                    idx === 2 ? 'bg-amber-600 text-white' :
                                    'bg-slate-200 text-slate-600'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm truncate">
                                        {player.name}
                                        {player.id === uid && <span className="text-indigo-600 ml-1">(You)</span>}
                                    </div>
                                    {player.hasSubmitted && !session.showAnswer && (
                                        <div className="text-xs text-emerald-600 font-medium">✓ Submitted</div>
                                    )}
                                    {session.showAnswer && player.isCorrect !== undefined && (
                                        <div className={`text-xs font-bold ${player.isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {player.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="font-mono font-bold text-indigo-600 text-sm">
                                {player.score}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-6">
                <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-slate-600 border border-slate-200">
                    Question {session.currentQuestionIndex + 1} / {questions.length}
                </div>
                <div className="bg-indigo-600 px-4 py-2 rounded-full shadow-sm text-sm font-bold text-white flex items-center gap-2">
                    <Trophy size={14} /> {session.players[uid]?.score || 0} pts
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[400px] flex flex-col border border-slate-100">
            <div className="bg-slate-50 p-8 border-b border-slate-100">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight text-center">{currentQ.question}</h2>
            </div>

            <div className="p-8 flex-grow flex flex-col justify-center">
                {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options ? (
                    <>
                    {/* Countdown message when all submitted */}
                    {!session.showAnswer && submittedCount === totalPlayers && totalPlayers > 0 && (
                        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                            <p className="text-indigo-700 font-bold animate-pulse">
                                🎯 All players submitted! Revealing answer...
                            </p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {currentQ.options.map((opt, idx) => {
                            let stateClass = "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
                            if (session.showAnswer) {
                                if (opt === currentQ.answer) stateClass = "bg-emerald-500 border-emerald-500 text-white";
                                else if (selectedAnswer === opt && opt !== currentQ.answer) stateClass = "bg-rose-100 border-rose-200 text-rose-500 opacity-50";
                                else stateClass = "opacity-50 border-slate-100";
                            } else if (selectedAnswer === opt) {
                                stateClass = "bg-indigo-600 border-indigo-600 text-white";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !hasSubmitted && setSelectedAnswer(opt)}
                                    disabled={hasSubmitted || session.showAnswer}
                                    className={`p-6 rounded-2xl border-2 text-lg font-bold transition-all duration-200 ${stateClass} ${!hasSubmitted && !session.showAnswer ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Submit Button and Status */}
                    {!session.showAnswer && (
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={submitAnswer}
                                disabled={!selectedAnswer || hasSubmitted}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {hasSubmitted ? '✓ Submitted' : 'Submit Answer'}
                            </button>
                            <p className="text-sm text-slate-500">
                                {submittedCount} / {totalPlayers} players submitted
                                {isHost && <span className="ml-2 text-indigo-600 font-bold">(You're the host)</span>}
                            </p>
                        </div>
                    )}
                    </>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-400 italic mb-4">Text input answers not fully supported in prototype mode.</p>
                        {session.showAnswer && (
                             <div className="text-2xl font-bold text-emerald-600">{Array.isArray(currentQ.answer) ? currentQ.answer.join(', ') : currentQ.answer}</div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Mobile Rankings - Show at bottom on small screens */}
        <div className="lg:hidden mt-6 bg-white rounded-2xl p-4 border border-slate-200 shadow-lg">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy size={16} />
                Live Rankings
            </h3>
            <div className="space-y-2">
                {sortedPlayers.map((p: any, i) => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${
                        p.id === uid ? 'bg-indigo-50 border border-indigo-200' :
                        i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'
                    }`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                i === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {i + 1}
                            </div>
                            <span className="font-bold text-sm text-slate-800">
                                {p.name} {p.id === uid && '(You)'}
                            </span>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 text-sm">{p.score}</span>
                    </div>
                ))}
            </div>
        </div>
        </div>
    </div>
  );
};
