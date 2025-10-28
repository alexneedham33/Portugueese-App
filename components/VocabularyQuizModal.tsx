
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VocabularyItem } from '../types';
import { getVocabularyForCategory } from '../services/geminiService';
import { Loader } from './Loader';

interface VocabularyQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabularyItems: VocabularyItem[];
  categoryName: string;
  bankedWords: string[];
}

type QuizStatus = 'ready' | 'submitted';
type QuizMode = 'en-to-pt' | 'pt-to-en';
const QUIZ_SIZE = 10;
const MAX_REGENERATIONS = 5;

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Removes accents and diacritics for a more forgiving comparison
const normalizeString = (str: string): string => {
    return str
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .toLowerCase()
        .trim();
};


export const VocabularyQuizModal: React.FC<VocabularyQuizModalProps> = ({ isOpen, onClose, vocabularyItems, categoryName, bankedWords }) => {
  const [status, setStatus] = useState<QuizStatus>('ready');
  const [quizMode, setQuizMode] = useState<QuizMode>('en-to-pt');
  const [quizItems, setQuizItems] = useState<VocabularyItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  
  // States for pre-fetching logic
  const [allSeenWords, setAllSeenWords] = useState<VocabularyItem[]>([]);
  const [prefetchedItems, setPrefetchedItems] = useState<VocabularyItem[] | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [isLoadingNextSet, setIsLoadingNextSet] = useState(false); // For fallback loading
  const [fetchError, setFetchError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const setupQuiz = useCallback((itemsToQuiz: VocabularyItem[]) => {
    if (itemsToQuiz.length === 0) return;
    const shuffledItems = shuffleArray(itemsToQuiz);
    const quizSet = shuffledItems.slice(0, QUIZ_SIZE);
    setQuizItems(quizSet);
    setUserAnswers(new Array(quizSet.length).fill(''));
    setStatus('ready');
    setScore(0);
    setRevealedIndices(new Set());
    setFetchError(null); // Clear previous errors
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initializeAndPrefetch = async () => {
        // 1. Initial setup with the first set of words
        setAllSeenWords(vocabularyItems);
        setupQuiz(vocabularyItems);
        setRegenerationCount(0);
        
        // 2. Immediately start prefetching the next set in the background
        if (categoryName && regenerationCount < MAX_REGENERATIONS) {
          setIsPrefetching(true);
          try {
            const currentWords = vocabularyItems.map(item => item.portugueseWord);
            const wordsToExclude = [...new Set([...currentWords, ...bankedWords])];
            const newItems = await getVocabularyForCategory(categoryName, undefined, wordsToExclude);
            setPrefetchedItems(newItems.length > 0 ? newItems : []);
          } catch (error) {
            console.error("Initial prefetch failed:", error);
            setPrefetchedItems(null); // Set to null so fallback can trigger
          } finally {
            setIsPrefetching(false);
          }
        }
      };

      initializeAndPrefetch();
    } else {
      // Reset state on close
      setTimeout(() => {
        setQuizItems([]);
        setUserAnswers([]);
        setStatus('ready');
        setScore(0);
        setRevealedIndices(new Set());
        setQuizMode('en-to-pt');
        setAllSeenWords([]);
        setRegenerationCount(0);
        setPrefetchedItems(null);
        setIsPrefetching(false);
        setIsLoadingNextSet(false);
        setFetchError(null);
      }, 300); 
    }
  // setupQuiz and categoryName are stable dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vocabularyItems, bankedWords]);

  const handleInputChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  const handleRevealAnswer = (index: number) => {
    setRevealedIndices(prev => new Set(prev).add(index));
    const answerToReveal = quizMode === 'en-to-pt' 
        ? quizItems[index].portugueseWord 
        : quizItems[index].englishTranslation;
    handleInputChange(index, answerToReveal);
  };

  const checkAnswer = (userAnswer: string, correctAnswer: string, mode: QuizMode): boolean => {
    if (mode === 'en-to-pt') {
        // Forgiving check for Portuguese: remove accents, lowercase, trim
        return normalizeString(userAnswer) === normalizeString(correctAnswer);
    } else { // pt-to-en
        // Strict check for English: lowercase, trim
        return userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let currentScore = 0;
    quizItems.forEach((item, index) => {
      const correctAnswer = quizMode === 'en-to-pt' ? item.portugueseWord : item.englishTranslation;
      if (checkAnswer(userAnswers[index], correctAnswer, quizMode)) {
        currentScore++;
      }
    });
    setScore(currentScore);
    setStatus('submitted');
    listRef.current?.scrollTo(0, 0);
  };

  const handleModeSwap = () => {
    setQuizMode(prev => prev === 'en-to-pt' ? 'pt-to-en' : 'en-to-pt');
    // Reset progress when mode is swapped
    setUserAnswers(new Array(quizItems.length).fill(''));
    setRevealedIndices(new Set());
  };

  const handleGenerateNewSet = async () => {
    if (regenerationCount >= MAX_REGENERATIONS) return;

    // This function kicks off the next prefetch in the background.
    const startNextPrefetch = (currentSeenWords: VocabularyItem[]) => {
        const nextRegenCount = regenerationCount + 1;
        if (nextRegenCount >= MAX_REGENERATIONS || isPrefetching || !categoryName) return;

        setIsPrefetching(true);
        const seenPortugueseWords = currentSeenWords.map(item => item.portugueseWord);
        const wordsToExclude = [...new Set([...seenPortugueseWords, ...bankedWords])];
        
        getVocabularyForCategory(categoryName, undefined, wordsToExclude)
            .then(nextItems => {
                setPrefetchedItems(nextItems.length > 0 ? nextItems : []);
            })
            .catch(error => {
                console.error("Background prefetch failed:", error);
                setPrefetchedItems(null);
            })
            .finally(() => {
                setIsPrefetching(false);
            });
    };

    // Case 1: Prefetched data is ready. Use it instantly.
    if (prefetchedItems) {
        if (prefetchedItems.length === 0) {
            setFetchError("No more unique words could be found for this topic.");
            setRegenerationCount(MAX_REGENERATIONS); // Lock the button
            return;
        }

        const newSeenWords = [...allSeenWords, ...prefetchedItems];
        setAllSeenWords(newSeenWords);
        setupQuiz(prefetchedItems);
        setPrefetchedItems(null);
        setRegenerationCount(prev => prev + 1);
        startNextPrefetch(newSeenWords);
        return;
    }

    // Case 2: Prefetched data is NOT ready. Fetch on demand (fallback).
    setIsLoadingNextSet(true);
    setFetchError(null);
    try {
        const seenPortugueseWords = allSeenWords.map(item => item.portugueseWord);
        const wordsToExclude = [...new Set([...seenPortugueseWords, ...bankedWords])];
        const newItems = await getVocabularyForCategory(categoryName, undefined, wordsToExclude);
        if (newItems.length === 0) {
            setFetchError("No more unique words could be found for this topic.");
            setRegenerationCount(MAX_REGENERATIONS);
        } else {
            const newSeenWords = [...allSeenWords, ...newItems];
            setAllSeenWords(newSeenWords);
            setupQuiz(newItems);
            setRegenerationCount(prev => prev + 1);
            startNextPrefetch(newSeenWords); // Still prefetch the next one
        }
    } catch (error) {
        console.error("Failed to fetch new quiz set on demand:", error);
        setFetchError("Sorry, a new set of words could not be generated. Please try again.");
    } finally {
        setIsLoadingNextSet(false);
    }
  };


  const renderQuizItem = (item: VocabularyItem, index: number) => {
    const isSubmitted = status === 'submitted';
    const isRevealed = revealedIndices.has(index);

    const correctAnswer = quizMode === 'en-to-pt' ? item.portugueseWord : item.englishTranslation;
    const isCorrect = isSubmitted && checkAnswer(userAnswers[index], correctAnswer, quizMode);
    const isExactMatch = userAnswers[index].trim() === correctAnswer;

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
        <div key={item.portugueseWord + index} className={`p-4 border rounded-xl transition-colors ${containerClasses}`}>
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
                    {quizMode === 'en-to-pt' ? (
                        <p className="text-md text-slate-600 mb-3">
                            <span className="font-semibold">English:</span> "{item.englishTranslation}" <span className="italic">({item.wordType})</span>
                        </p>
                    ) : (
                        <p className="text-md text-slate-600 mb-3">
                            <span className="font-semibold">Portuguese:</span> "{item.portugueseWord}" <span className="italic">({item.wordType})</span>
                        </p>
                    )}
                    
                    <div className="flex items-center flex-wrap gap-2 text-xl text-slate-800 font-medium">
                        <input
                            type="text"
                            value={userAnswers[index]}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            disabled={isSubmitted || isRevealed}
                            className={`inline-block w-full sm:w-64 px-2 py-1 bg-white border-2 rounded-md text-xl shadow-sm font-bold text-indigo-700
                                        ${inputBorderClasses}
                                        focus:outline-none focus:ring-1 
                                        disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200`}
                            aria-label={`Answer for item ${index + 1}`}
                            placeholder={quizMode === 'en-to-pt' ? "Portuguese word..." : "English translation..."}
                            autoComplete="off"
                        />
                    </div>

                    {isSubmitted && (
                        <div className="mt-4 p-3 rounded-lg bg-white border border-slate-200">
                            {isCorrect ? (
                                <div>
                                    <div className="flex items-center gap-2 font-semibold text-green-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Correct!</span>
                                    </div>
                                    {quizMode === 'en-to-pt' && !isExactMatch && (
                                        <p className="mt-2 text-sm text-slate-700">
                                            The correct spelling is: <strong className="font-bold text-green-700">{correctAnswer}</strong>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Correct answer:</p>
                                    <p className="font-bold text-green-600">"{correctAnswer}"</p>
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
    if (quizItems.length === 0) {
        return <div className="text-slate-500 text-center p-8">No vocabulary words to quiz. Select a category with words first.</div>
    }
    
    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <div className="p-6 border-b border-slate-200 flex-shrink-0 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Vocabulary Quiz</h2>
                    <p className="text-slate-500 mt-1">
                        {quizMode === 'en-to-pt'
                            ? 'Type the Portuguese word for each English prompt.'
                            : 'Type the English translation for each Portuguese word.'
                        }
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleModeSwap}
                    disabled={status === 'submitted'}
                    className="flex-shrink-0 mr-8 flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    title="Reverse quiz direction"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12l-4-4m4 4l4-4m6-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                    <span>Swap</span>
                </button>
            </div>
            
            <div ref={listRef} className="flex-grow p-6 space-y-4 overflow-y-auto bg-slate-50">
                {status === 'submitted' && (
                    <div className="p-4 mb-6 text-center bg-indigo-50 rounded-xl border border-indigo-200">
                        <h3 className="text-xl font-bold text-indigo-800">Quiz Complete!</h3>
                        <p className="mt-2 text-2xl font-bold text-slate-700">
                            You scored <span className="text-indigo-600">{score}</span> / <span className="text-slate-500">{quizItems.length}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Review your answers below.</p>
                    </div>
                )}
                {quizItems.map(renderQuizItem)}
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0">
                {status === 'ready' && (
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500 transition-colors">
                        Check All Answers
                    </button>
                )}
                {status === 'submitted' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                                Close
                            </button>
                            <button 
                                type="button" 
                                onClick={handleGenerateNewSet} 
                                className="w-full sm:flex-1 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoadingNextSet || regenerationCount >= MAX_REGENERATIONS}
                            >
                                {isLoadingNextSet ? (
                                    <>
                                        <Loader size="sm" />
                                        <span className="ml-2">Generating...</span>
                                    </>
                                ) : (
                                    `Try a New Set (${MAX_REGENERATIONS - regenerationCount} left)`
                                )}
                            </button>
                        </div>
                        {fetchError && <p className="text-sm text-center text-red-600">{fetchError}</p>}
                        {regenerationCount >= MAX_REGENERATIONS && !fetchError && (
                            <p className="text-sm text-center text-slate-500">
                                Generation limit reached. Please close the quiz to start over.
                            </p>
                        )}
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
             <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10" aria-label="Close quiz">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            {renderContent()}
        </div>
    </div>
  );
};
