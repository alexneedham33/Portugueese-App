import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Example } from '../types';
import { getPronunciationFeedback } from '../services/geminiService';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  examples: Example[];
}

// Fix: Use `(window as any)` for both SpeechRecognition and webkitSpeechRecognition to handle non-standard browser APIs.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

export const PracticeModal: React.FC<PracticeModalProps> = ({ isOpen, onClose, examples }) => {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [userSpeech, setUserSpeech] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  
  // Fix: The 'SpeechRecognition' variable is a value, not a type. Using 'any' for the ref because the type is not standard.
  const recognitionRef = useRef<any | null>(null);

  const currentExample = examples[currentExampleIndex];

  const resetForCurrentExample = useCallback(() => {
    setUserSpeech('');
    setFeedback('');
    setIsLoadingFeedback(false);
    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (!isSpeechRecognitionSupported) {
        console.warn("Speech Recognition API not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setUserSpeech(transcript);
        setIsLoadingFeedback(true);
        try {
            const fb = await getPronunciationFeedback(currentExample.portuguese, transcript);
            setFeedback(fb);
        } catch (error) {
            console.error("Error getting feedback:", error);
            setFeedback("Sorry, I couldn't get feedback for your attempt.");
        } finally {
            setIsLoadingFeedback(false);
        }
    };
    
    recognitionRef.current = recognition;

    return () => {
        recognition.abort();
    };
  }, [isOpen, currentExample]);
  
  useEffect(() => {
    // Reset state when the modal is opened or examples change
    if (isOpen) {
        setCurrentExampleIndex(0);
        resetForCurrentExample();
    }
  }, [isOpen, examples, resetForCurrentExample]);


  const handleStartListening = () => {
    resetForCurrentExample();
    recognitionRef.current?.start();
  };

  const handleNext = () => {
    setCurrentExampleIndex(prev => (prev + 1) % examples.length);
    resetForCurrentExample();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .animate-pulse-opacity { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-slide-up">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Speaking Practice</h2>
            <p className="text-sm text-slate-500">Sentence {currentExampleIndex + 1} of {examples.length}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close practice modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
            {!isSpeechRecognitionSupported ? (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-center">
                    <p className="font-semibold">Browser Not Supported</p>
                    <p className="text-sm mt-1">The speaking practice feature requires a browser that supports the Web Speech API, such as Google Chrome.</p>
                </div>
            ) : (
                <>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Try to say:</p>
                        <p className="text-2xl font-bold text-slate-800">"{currentExample.portuguese}"</p>
                        <p className="text-md text-slate-600 mt-1">"{currentExample.english}"</p>
                    </div>

                    <div className="text-center py-4">
                        <button 
                            onClick={handleStartListening}
                            disabled={isListening || isLoadingFeedback}
                            className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {isListening ? (
                                <span className="w-8 h-8 animate-pulse-opacity bg-white rounded-full" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                                    <path d="M5.5 9.5a.5.5 0 01.5.5v1a4 4 0 004 4v-1.5a.5.5 0 011 0V16a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1a6 6 0 01-6-6v-1a.5.5 0 01.5-.5z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="min-h-[100px] p-4 bg-slate-50 rounded-lg">
                        {isLoadingFeedback ? (
                            <div className="flex items-center text-slate-500">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Evaluating...</span>
                            </div>
                        ) : feedback ? (
                            <div>
                                <p className="text-sm font-semibold text-slate-700">You said: <span className="italic font-normal">"{userSpeech}"</span></p>
                                <p className="mt-2 text-md text-indigo-800">{feedback}</p>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center">Click the mic and speak the sentence.</p>
                        )}
                    </div>
                </>
            )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
            {feedback && (
                <button
                    onClick={handleStartListening}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                    Try Again
                </button>
            )}
            <button
                onClick={handleNext}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                Next Sentence
            </button>
        </div>
      </div>
    </div>
  );
};