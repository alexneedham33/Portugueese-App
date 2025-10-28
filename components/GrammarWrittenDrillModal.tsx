import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WrittenDrill } from '../types';
import { generateWrittenDrills } from '../services/geminiService';
import { Loader } from './Loader';

interface GrammarWrittenDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {id: string, name: string, description: string};
}

type DrillStatus = 'loading' | 'ready' | 'submitted' | 'error';

const DRILL_COUNT = 10;

export const GrammarWrittenDrillModal: React.FC<GrammarWrittenDrillModalProps> = ({ isOpen, onClose, topic }) => {
  const [status, setStatus] = useState<DrillStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [drills, setDrills] = useState<WrittenDrill[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const listRef = useRef<HTMLDivElement>(null);

  const fetchDrills = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setRevealedIndices(new Set()); // Reset revealed answers
    try {
      const newDrills = await generateWrittenDrills(topic.name, DRILL_COUNT);
      if (newDrills.length < DRILL_COUNT) {
        throw new Error("The AI model returned fewer drills than expected. Please try again.");
      }
      setDrills(newDrills);
      setUserAnswers(new Array(newDrills.length).fill(''));
      setStatus('ready');
    } catch (err) {
      console.error("Failed to generate written drills:", err);
      setError("Could not generate the written drill. The AI might be busy. Please close and try again.");
      setStatus('error');
    }
  }, [topic.name]);

  useEffect(() => {
    if (isOpen) {
      fetchDrills();
    } else {
      // Reset state on close
      setTimeout(() => {
        setDrills([]);
        setUserAnswers([]);
        setStatus('loading');
        setError(null);
        setScore(0);
        setRevealedIndices(new Set());
      }, 300); // Delay reset to allow for fade-out animation
    }
  }, [isOpen, fetchDrills]);

  const handleInputChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  const handleRevealAnswer = (index: number) => {
    setRevealedIndices(prev => new Set(prev).add(index));
    handleInputChange(index, drills[index].correctAnswer);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let currentScore = 0;
    drills.forEach((drill, index) => {
      // Case-insensitive and trims whitespace for forgiving comparison
      if (userAnswers[index].trim().toLowerCase() === drill.correctAnswer.toLowerCase()) {
        currentScore++;
      }
    });
    setScore(currentScore);
    setStatus('submitted');
    // Scroll to the top of the list to show the score
    listRef.current?.scrollTo(0, 0);
  };

  const renderDrillItem = (drill: WrittenDrill, index: number) => {
    const sentenceParts = drill.sentenceWithBlank.split('___');
    const isSubmitted = status === 'submitted';
    const isRevealed = revealedIndices.has(index);
    const isCorrect = isSubmitted && userAnswers[index].trim().toLowerCase() === drill.correctAnswer.toLowerCase();

    let containerClasses = 'bg-white border-slate-200';
    let inputBorderClasses = 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-500';

    if (isSubmitted) {
        if (isCorrect) {
            containerClasses = 'bg-green-50 border-green-300';
            inputBorderClasses = 'border-green-500 ring-green-500';
        } else {
            containerClasses = 'bg-red-50 border-red-300';
            inputBorderClasses = 'border-red-500 ring-red-500';
        }
    } else if (isRevealed) {
        containerClasses = 'bg-blue-50 border-blue-200';
        inputBorderClasses = 'border-blue-400 ring-blue-400';
    }

    return (
        <div key={index} className={`p-4 border rounded-xl transition-colors ${containerClasses}`}>
            <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-1 flex-shrink-0">
                    <span className="text-lg font-bold text-slate-400">{index + 1}.</span>
                     <button
                        type="button"
                        onClick={() => handleRevealAnswer(index)}
                        disabled={isSubmitted || isRevealed}
                        className="mt-2 text-slate-400 hover:text-indigo-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                        aria-label="Reveal answer"
                        title="Reveal answer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>
                <div className="flex-grow min-w-0">
                    <p className="text-md text-slate-600 mb-3">
                        <span className="font-semibold">Translate:</span> "{drill.englishHint}"
                    </p>
                    <div className="flex items-center flex-wrap gap-2 text-xl text-slate-800 font-medium">
                        <span>{sentenceParts[0]}</span>
                        <input
                            type="text"
                            value={userAnswers[index]}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            disabled={isSubmitted || isRevealed}
                            className={`inline-block w-48 px-2 py-1 bg-white border-2 rounded-md text-xl shadow-sm text-center font-bold text-indigo-700
                                        ${inputBorderClasses}
                                        focus:outline-none focus:ring-1 
                                        disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200`}
                            aria-label={`Answer for sentence ${index + 1}`}
                            autoComplete="off"
                        />
                        <span>{sentenceParts[1]}</span>
                    </div>

                    {isSubmitted && (
                        <div className="mt-4 p-3 rounded-lg bg-white border border-slate-200">
                            {isCorrect ? (
                                <div className="flex items-center gap-2 font-semibold text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Correct!</span>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Correct answer:</p>
                                    <p className="font-bold text-green-600">"{drill.correctAnswer}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  }

  const renderContent = () => {
    if (status === 'loading') {
        return <Loader message={`Building your drill for "${topic.name}"...`} size="lg"/>;
    }

    if (status === 'error') {
        return (
            <div className="text-center p-4">
                <h3 className="text-xl font-bold mb-2 text-red-600">An Error Occurred</h3>
                <p className="text-slate-600">{error}</p>
                <button onClick={onClose} className="mt-6 bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">Close</button>
            </div>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-2xl font-bold text-slate-800">Written Drill: <span className="text-indigo-600">{topic.name}</span></h2>
                <p className="text-slate-500 mt-1">Fill in the blanks, reveal answers, or check your score when you're done.</p>
            </div>
            
            <div ref={listRef} className="flex-grow p-6 space-y-4 overflow-y-auto bg-slate-50">
                {status === 'submitted' && (
                    <div className="p-4 mb-6 text-center bg-indigo-50 rounded-xl border border-indigo-200">
                        <h3 className="text-xl font-bold text-indigo-800">Drill Complete!</h3>
                        <p className="mt-2 text-2xl font-bold text-slate-700">
                            You scored <span className="text-indigo-600">{score}</span> / <span className="text-slate-500">{drills.length}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Review your answers below.</p>
                    </div>
                )}
                {drills.map(renderDrillItem)}
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0">
                {status === 'ready' && (
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500 transition-colors">
                        Check All Answers
                    </button>
                )}
                {status === 'submitted' && (
                     <div className="flex flex-col sm:flex-row gap-3">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                            Close
                        </button>
                        <button type="button" onClick={fetchDrills} className="w-full sm:flex-1 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500 transition-colors">
                            Try a New Set
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        `}</style>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up relative">
             <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10" aria-label="Close written drill">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            {renderContent()}
        </div>
    </div>
  );
};
