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

  // Reset local state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
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

  const submitAnswer = async (answer: string) => {
    if (!sessionId || hasSubmitted || session?.showAnswer) return;
    
    setSelectedAnswer(answer);
    setHasSubmitted(true);
    
    const currentQ = questions[session!.currentQuestionIndex];
    const isCorrect = answer === currentQ.answer; // Simplified string match

    if (isCorrect) {
        // Increment score directly in Firestore
        // Note: For robust app, use Firestore transactions. Here using simple update logic for prototype.
        // We read current score from local session state to be fast, but ideally use atomic increment
        // Since we can't easily do deep map update increment without 'dot notation' which requires the key known
        const playerRef = `players.${uid}.score`;
        const currentScore = session?.players[uid]?.score || 0;
        await dbService.updateSession(sessionId, { 
            [playerRef]: currentScore + 100 
        });
    }
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

  return (
    <div className="max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6 px-4">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-slate-600 border border-slate-200">
                Question {session.currentQuestionIndex + 1} / {questions.length}
            </div>
            {!isHost && (
                <div className="bg-indigo-600 px-4 py-2 rounded-full shadow-sm text-sm font-bold text-white flex items-center gap-2">
                    <Trophy size={14} /> {session.players[uid]?.score || 0} pts
                </div>
            )}
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[400px] flex flex-col border border-slate-100">
            <div className="bg-slate-50 p-8 border-b border-slate-100">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight text-center">{currentQ.question}</h2>
            </div>

            <div className="p-8 flex-grow flex flex-col justify-center">
                {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    onClick={() => !isHost && submitAnswer(opt)}
                                    disabled={hasSubmitted || session.showAnswer || isHost}
                                    className={`p-6 rounded-2xl border-2 text-lg font-bold transition-all duration-200 ${stateClass}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-400 italic mb-4">Text input answers not fully supported in prototype mode.</p>
                        {session.showAnswer && (
                             <div className="text-2xl font-bold text-emerald-600">{Array.isArray(currentQ.answer) ? currentQ.answer.join(', ') : currentQ.answer}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Host Controls */}
            {isHost && (
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <span className="font-mono text-sm text-slate-400 ml-4">HOST CONTROLS</span>
                    <div className="flex gap-4">
                        {!session.showAnswer ? (
                            <button 
                                onClick={revealAnswer}
                                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-bold transition"
                            >
                                Reveal Answer
                            </button>
                        ) : (
                            <button 
                                onClick={nextQuestion}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold transition flex items-center gap-2"
                            >
                                Next Question <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Live Leaderboard (Small) */}
        {session.showAnswer && (
             <div className="mt-8 bg-white/50 backdrop-blur rounded-2xl p-6 border border-white/50">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Live Standings</h3>
                 <div className="flex gap-4 overflow-x-auto pb-2">
                     {Object.values(session.players || {})
                        .sort((a: any, b: any) => b.score - a.score)
                        .slice(0, 5)
                        .map((p: any, i) => (
                         <div key={p.id} className="flex-shrink-0 flex flex-col items-center w-20">
                             <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs mb-1">
                                 {i + 1}
                             </div>
                             <span className="text-xs font-bold text-slate-800 truncate w-full text-center">{p.name}</span>
                             <span className="text-xs text-indigo-600 font-mono">{p.score}</span>
                         </div>
                     ))}
                 </div>
             </div>
        )}
    </div>
  );
};
