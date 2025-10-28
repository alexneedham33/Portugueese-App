import React, { useState, useRef, useEffect } from 'react';
import type { Example, SelectedConjugation } from '../types';
import { Card, CardHeader, CardContent } from './Card';
import { Loader } from './Loader';
import { PracticeModal } from './PracticeModal';
import { getSpeech } from '../services/geminiService';
import { playAudio } from '../utils/audio';

interface ExampleSentencesProps {
  examples: Example[] | null;
  isLoading: boolean;
  error: string | null;
  selectedConjugation: SelectedConjugation | null;
  selectedVerb: string | null;
  isGeneratingMore: boolean;
  onGenerateMore: () => void;
}

const AudioButton: React.FC<{ isLoading: boolean; onClick: () => void; }> = ({ isLoading, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors duration-200 disabled:bg-slate-100 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
      aria-label="Play audio for sentence"
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.707.707zM15.924 12.076a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM14.51 14.2a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM15.924 7.924a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 011.414-1.414l.707.707zM14.51 5.8a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 011.414-1.414l.707.707z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

export const ExampleSentences: React.FC<ExampleSentencesProps> = ({
  examples,
  isLoading,
  error,
  selectedConjugation,
  selectedVerb,
  isGeneratingMore,
  onGenerateMore,
}) => {
  const [loadingAudio, setLoadingAudio] = useState<Set<string>>(new Set());
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // This effect prefetches audio silently in the background when examples load.
  useEffect(() => {
    if (!examples || examples.length === 0) {
      setAudioCache({}); // Clear cache for new set of examples
      return;
    }

    const prefetchAudio = async (text: string) => {
      // Don't re-fetch if already in cache
      if (audioCache[text]) return; 

      try {
        const audioBase64 = await getSpeech(text);
        // Use a functional update to avoid stale closures
        setAudioCache(prevCache => ({ ...prevCache, [text]: audioBase64 }));
      } catch (error) {
        console.warn(`Silent prefetch failed for: "${text}"`, error);
        // We fail silently. The user can still click to trigger a manual fetch.
      }
    };

    // Trigger prefetching for all sentences
    examples.forEach(example => {
      prefetchAudio(example.portuguese);
    });
    // This effect should only run when the list of examples changes.
    // audioCache is not included as a dependency to prevent an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examples]);


  const handlePlayAudio = async (text: string) => {
    // Prevent multiple clicks while an audio is being fetched on demand
    if (loadingAudio.has(text)) return;

    // Initialize AudioContext
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
            alert("Sorry, your browser does not support audio playback.");
            return;
        }
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    const audioCtx = audioContextRef.current;

    // Case 1: Audio is already cached. Play it immediately.
    if (audioCache[text]) {
        try {
            await playAudio(audioCache[text], audioCtx);
        } catch (error) {
            console.error("Failed to play cached audio:", error);
            alert("Sorry, an error occurred while trying to play the audio.");
        }
        return;
    }

    // Case 2: Audio is not cached (prefetch is slow or failed). Fetch on demand.
    // Show a loading spinner for this specific button.
    setLoadingAudio(prev => new Set(prev).add(text));
    try {
        const audioBase64 = await getSpeech(text);
        setAudioCache(prev => ({ ...prev, [text]: audioBase64 }));
        await playAudio(audioBase64, audioCtx);
    } catch (error) {
        console.error("Failed to fetch and play audio for sentence:", error);
        alert("Sorry, could not play the audio. The AI might be busy.");
    } finally {
        // Remove from loading set regardless of success or failure
        setLoadingAudio(prev => {
            const newSet = new Set(prev);
            newSet.delete(text);
            return newSet;
        });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
            <Loader message={`Finding examples...`} />
        </div>
      );
    }

    // If we have examples, display them, and display any subsequent error inline.
    if (examples && examples.length > 0) {
      return (
        <div className="flex flex-col h-full">
            <ul className="space-y-5 flex-grow overflow-y-auto pr-2">
                {examples.map((example, index) => {
                    return (
                        <li key={index} className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-slate-800 flex-1">
                                "{example.portuguese}"
                            </p>
                             <AudioButton
                                isLoading={loadingAudio.has(example.portuguese)}
                                onClick={() => handlePlayAudio(example.portuguese)}
                            />
                            </div>
                            <p className="text-md text-slate-600 mt-1">
                                "{example.english}"
                            </p>
                        </li>
                    )
                })}
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <button
                    onClick={onGenerateMore}
                    disabled={isGeneratingMore}
                    className="w-full px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isGeneratingMore ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating...</span>
                        </>
                    ) : 'Get New Examples'}
                </button>

                <button
                    onClick={() => setIsPracticeModalOpen(true)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path d="M5.5 9.5a.5.5 0 01.5.5v1a4 4 0 004 4v-1.5a.5.5 0 011 0V16a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1a6 6 0 01-6-6v-1a.5.5 0 01.5-.5z" />
                    </svg>
                    <span>Practice Speaking</span>
                </button>

                {error && <p className="text-sm text-center text-red-600">{error}</p>}
            </div>
        </div>
      );
    }
    
    // If we have no examples, any error must be from the initial load. Show the full block.
    if (error) {
      return <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
    }
    
    if (!selectedConjugation && !(examples && examples.length > 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Select a conjugated form to see it in action.</p>
            </div>
        );
    }

    // Default case if there are no examples but a conjugation is selected.
    return <div className="text-center text-slate-500 p-8">No examples found for this form.</div>;
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <h2 className="text-xl font-bold text-slate-800">Examples</h2>
          {selectedConjugation ? (
              <p className="text-sm text-slate-500">
                  Usage of <span className="font-semibold text-indigo-600">"{selectedConjugation.form}"</span>
              </p>
          ) : selectedVerb && examples && examples.length > 0 ? (
              <p className="text-sm text-slate-500">
                  General examples for <span className="font-semibold text-indigo-600">"{selectedVerb}"</span>
              </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
          {renderContent()}
        </CardContent>
      </Card>

      {examples && examples.length > 0 && (
         <PracticeModal
            isOpen={isPracticeModalOpen}
            onClose={() => setIsPracticeModalOpen(false)}
            examples={examples}
        />
      )}
    </>
  );
};