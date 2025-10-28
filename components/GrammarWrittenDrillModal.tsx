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

  const formRef = useRef<HTMLFormElement>(null);

  const fetchDrills = useCallback(async () => {
    setStatus('loading');
    setError(null);
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
      }, 300); // Delay reset to allow for fade-out animation
    }
  }, [isOpen, fetchDrills]);

  const handleInputChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
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
    // Scroll to the top of the form to show the score
    formRef.current?.scrollTo(0, 0);
  };

  const renderDrillInput = (drill: WrittenDrill, index: number) => {
    const sentenceParts = drill.sentenceWithBlank.split('___');
    const isSubmitted = status === 'submitted';
    const isCorrect = isSubmitted && userAnswers[index].trim().toLowerCase() === drill.correctAnswer.toLowerCase();
    
    let borderColor = 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
    if (isSubmitted) {
        borderColor = isCorrect ? 'border-green-500 ring-green-500' : 'border-red-500 ring-red-500';
    }

    return (
        <div 
            key={index} 
            className={`p-4 rounded-lg transition-colors ${isSubmitted ? (isCorrect ? 'bg-green-50' : 'bg-red-50') : 'bg-slate-50'}`}
        >
            <p className="text-sm text-slate-500 mb-2 italic">"{drill.englishHint}"</p>
            <div className="flex items-center flex-wrap gap-2 text-lg text-slate-800">
                <span>{sentenceParts[0]}</span>
                <input
                    type="text"
                    value={userAnswers[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    disabled={isSubmitted}
                    className={`inline-block w-40 px-2 py-1 bg-white border-2 rounded-md text-lg shadow-sm text-center font-semibold text-indigo-700
                                ${borderColor}
                                focus:outline-none focus:ring-1 
                                disabled:bg-slate-100 disabled:text-slate-500`}
                    aria-label={`Answer for sentence ${index + 1}`}
                />
                <span>{sentenceParts[1]}</span>
            </div>
            {isSubmitted && !isCorrect && (
                <div className="mt-2 text-sm">
                    <span className="font-semibold text-slate-700">Correct answer:</span>{' '}
                    <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md">{drill.correctAnswer}</span>
                </div>
            )}
            {isSubmitted && isCorrect && (
                 <div className="mt-2 text-sm flex items-center gap-1 font-semibold text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Correct!</span>
                </div>
            )}
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
        <form onSubmit={handleSubmit} ref={formRef} className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Written Drill: <span className="text-indigo-600">{topic.name}</span></h2>
                <p className="text-slate-500 mt-1">Fill in the blanks with the correct form of the verb or word.</p>
            </div>
            
            <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                {status === 'submitted' && (
                    <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg text-indigo-800 mb-6">
                        <h3 className="font-bold text-xl">Drill Complete!</h3>
                        <p className="mt-1">You scored <span className="font-bold">{score} out of {drills.length}</span>. Check your answers below.</p>
                    </div>
                )}
                {drills.map(renderDrillInput)}
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50">
                {status === 'ready' && (
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-indigo-500 transition-colors">
                        Check Answers
                    </button>
                )}
                {status === 'submitted' && (
                     <button type="button" onClick={fetchDrills} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-indigo-500 transition-colors">
                        Try a New Set
                    </button>
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
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