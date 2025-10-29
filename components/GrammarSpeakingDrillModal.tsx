import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Example } from '../types';
import { generateGrammarExamplesBatch, getSpeech } from '../services/geminiService';
import { playAudio } from '../utils/audio';
import { Loader } from './Loader';

interface GrammarSpeakingDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {id: string, name: string, description: string};
}

type DrillStatus = 'loading' | 'ready' | 'finished' | 'error';
const DRILL_COUNT = 10;

export const GrammarSpeakingDrillModal: React.FC<GrammarSpeakingDrillModalProps> = ({ isOpen, onClose, topic }) => {
  const [status, setStatus] = useState<DrillStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [audioData, setAudioData] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const fetchDrills = useCallback(async (isNewSet = true) => {
    setStatus('loading');
    setError(null);
    setAudioData({}); // Clear audio cache
    if(isNewSet) {
        setExamples([]); // Clear existing examples if fetching a new set
    }
    
    try {
      const newExamples = await generateGrammarExamplesBatch(topic.name, DRILL_COUNT, isNewSet ? undefined : examples);
      if (newExamples.length < DRILL_COUNT) {
        throw new Error("The AI model returned fewer examples than expected. Please try again.");
      }
      setExamples(newExamples);
      setCurrentIndex(0);
      setIsRevealed(false);
      setStatus('ready');
    } catch (err) {
      console.error("Failed to generate speaking drills:", err);
      setError("Could not generate the speaking drill. The AI might be busy. Please close and try again.");
      setStatus('error');
    }
  }, [topic.name, examples]);

  useEffect(() => {
    if (isOpen) {
      if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
            setError("Your browser does not support audio playback.");
            setStatus('error');
        }
      }
      fetchDrills(true);
    } else {
      setTimeout(() => {
        setExamples([]);
        setAudioData({});
        setStatus('loading');
        setError(null);
        setCurrentIndex(0);
        setIsRevealed(false);
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const playAndPrefetchAudio = useCallback(async (index: number) => {
    if (!examples[index] || !audioContextRef.current) return;
    
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Play current audio
    if (audioData[index]) {
        // Check if we are still on the same index before playing from cache
        if (currentIndex === index) {
            await playAudio(audioData[index], audioCtx);
        }
    } else {
        setIsAudioLoading(true);
        try {
            const base64 = await getSpeech(examples[index].portuguese);
            setAudioData(prev => ({ ...prev, [index]: base64 }));
            // After fetching, only play the audio if the index is still current
            if (currentIndex === index) {
                await playAudio(base64, audioCtx);
            }
        } catch (err) {
            console.error("Audio playback failed:", err);
        } finally {
            // Only turn off the loader if this operation was for the current index
            if (currentIndex === index) {
                setIsAudioLoading(false);
            }
        }
    }

    // Pre-fetch audio for the next sentence
    const nextIndex = index + 1;
    if (nextIndex < examples.length && !audioData[nextIndex]) {
        // No await needed, this runs in the background
        getSpeech(examples[nextIndex].portuguese)
            .then(base64 => {
                setAudioData(prev => ({ ...prev, [nextIndex]: base64 }));
            })
            .catch(err => {
                console.warn(`Audio prefetch for index ${nextIndex} failed:`, err);
            });
    }
  }, [examples, audioData, currentIndex]);

  const handleNext = () => {
    if (!isRevealed) {
        setIsRevealed(true);
        playAndPrefetchAudio(currentIndex);
        return;
    }

    if (currentIndex < examples.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
    } else {
        setStatus('finished');
    }
  };

  const handlePracticeMore = () => {
    fetchDrills(false);
  };

  const renderContent = () => {
    if (status === 'loading') {
      return <div className="flex-grow flex items-center justify-center"><Loader message={`Generating example sentences for "${topic.name}"...`} size="lg"/></div>;
    }

    if (status === 'error') {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-xl font-bold mb-2 text-red-300">An Error Occurred</h3>
            <p className="text-red-300 bg-red-900 bg-opacity-50 p-3 rounded-lg">{error}</p>
        </div>
      );
    }
    
    const currentExample = examples[currentIndex];

    if (status === 'finished') {
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 m-6">
                 <div className="w-20 h-20 bg-white/20 text-white rounded-full flex items-center justify-center text-4xl mb-6">
                    🎉
                </div>
                <h3 className="text-3xl font-bold text-white">Practice Complete!</h3>
                <p className="mt-2 text-indigo-200 text-lg">You've completed this set of sentences.</p>
            </div>
        )
    }

    if (!currentExample) return null;

    return (
        <div className="flex-grow flex flex-col p-6 space-y-8 justify-center text-center">
            <div className="space-y-4">
                <p className="text-lg text-indigo-200">How would you say this in Portuguese?</p>
                <p className="text-4xl font-bold text-white">"{currentExample.english}"</p>
            </div>
            
            <div className="min-h-[90px] flex items-center justify-center p-4">
                {isRevealed && (
                    <div className="flex items-center gap-4">
                        <p className="text-3xl font-bold text-white transition-opacity duration-300 animate-fade-in">
                            {currentExample.portuguese}
                        </p>
                        {isAudioLoading && <Loader size="sm" />}
                    </div>
                )}
            </div>
            
            <div className="mt-6">
                 <button 
                    onClick={handleNext} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg text-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
                 >
                    {isRevealed ? 'Next Sentence' : 'Translate'}
                </button>
            </div>
        </div>
    );
  }

  const renderFooter = () => {
    if (status === 'finished') {
        return (
            <div className="w-full flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <button onClick={onClose} className="w-full sm:w-1/2 bg-white/10 border border-indigo-400 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-900 focus:ring-indigo-300 transition-colors">
                    Exit
                </button>
                <button onClick={handlePracticeMore} className="w-full sm:w-1/2 bg-indigo-200 text-indigo-900 font-bold py-3 px-6 rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-900 focus:ring-indigo-300 transition-colors">
                    Continue
                </button>
            </div>
        )
    }
    if (status === 'error') {
        return (
            <button onClick={onClose} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-slate-500 transition-colors">
                Close
            </button>
        )
    }
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-indigo-900 text-white flex flex-col z-50 p-4 animate-fade-in">
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}</style>
        
        <header className="flex-shrink-0">
             <div className="flex justify-between items-center">
                <div className="text-left">
                    <h2 className="text-2xl font-bold text-white">Speaking Practice</h2>
                    <p className="text-indigo-300">{topic.name}</p>
                </div>
                <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors z-10" aria-label="Close speaking drill">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
             </div>
             {status === 'ready' && <p className="text-indigo-200 mt-2 text-center font-semibold">Sentence {currentIndex + 1} of {examples.length}</p>}
        </header>

        <main className="flex-grow flex flex-col justify-center items-center">
            {renderContent()}
        </main>
        
        <footer className="flex-shrink-0 py-4">
             <div className="text-center">
                {renderFooter()}
            </div>
        </footer>
    </div>
  );
};
