import React, { useState, useRef, useEffect } from 'react';
import type { GrammarParagraph, GrammarTheory } from '../types';
import { Loader } from './Loader';
import { getSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';

// Helper to render paragraph with highlighted words
const HighlightedParagraph: React.FC<{ text: string; highlights: string[] }> = ({ text, highlights }) => {
    if (!highlights || highlights.length === 0) {
        return <p className="text-lg leading-relaxed text-slate-800">{text}</p>;
    }
    const regex = new RegExp(`\\b(${highlights.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
        <p className="text-lg leading-relaxed text-slate-800">
            {parts.map((part, i) =>
                highlights.some(h => h.toLowerCase() === part.toLowerCase()) ? (
                    <strong key={i} className="bg-indigo-100 text-indigo-700 font-bold rounded-md px-1 py-0.5">
                        {part}
                    </strong>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                )
            )}
        </p>
    );
};

const AudioButton: React.FC<{ isLoading: boolean; onClick: () => void; }> = ({ isLoading, onClick }) => {
    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors duration-200 disabled:bg-slate-100 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
        aria-label="Play audio for paragraph"
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


interface GrammarResultDisplayModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    error: string | null;
    paragraph: GrammarParagraph | null;
    theory: GrammarTheory | null;
    onGenerateAnother: () => void;
}

export const GrammarResultDisplayModal: React.FC<GrammarResultDisplayModalProps> = ({
    isOpen,
    onClose,
    isLoading,
    error,
    paragraph,
    theory,
    onGenerateAnother,
}) => {
    const [paragraphAudio, setParagraphAudio] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        // Cleanup audio on modal close
        if (!isOpen) {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }
        }
    }, [isOpen]);


    useEffect(() => {
        if (!paragraph?.portugueseParagraph) {
            setParagraphAudio(null);
            return;
        }

        let isCancelled = false;
        const prefetchAudio = async () => {
            try {
                const audioBase64 = await getSpeech(paragraph.portugueseParagraph);
                if (!isCancelled) setParagraphAudio(audioBase64);
            } catch (audioError) {
                console.warn("Silent audio pre-fetch failed:", audioError);
            }
        };
        prefetchAudio();
        return () => { isCancelled = true; };
    }, [paragraph]);

    const handlePlayAudio = async () => {
        if (!paragraph?.portugueseParagraph || isAudioLoading) return;

        // Stop any currently playing audio from this modal
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }

        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                alert("Sorry, your browser does not support audio playback.");
                return;
            }
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        const audioCtx = audioContextRef.current;
        
        const play = async (base64: string) => {
            try {
                const audioData = decode(base64);
                const audioBuffer = await decodeAudioData(audioData, audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
                audioSourceRef.current = source;
                source.onended = () => {
                    if (audioSourceRef.current === source) {
                        audioSourceRef.current = null;
                    }
                };
            } catch (err) {
                console.error("Error playing audio:", err);
                alert("Sorry, an error occurred while playing the audio.");
            }
        };

        if (paragraphAudio) {
            await play(paragraphAudio);
            return;
        }

        setIsAudioLoading(true);
        try {
            const audioBase64 = await getSpeech(paragraph.portugueseParagraph);
            setParagraphAudio(audioBase64);
            await play(audioBase64);
        } catch (err) {
            alert("Sorry, could not play the audio. The AI might be busy.");
        } finally {
            setIsAudioLoading(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            const message = theory ? "Loading theory..." : "Crafting your paragraph...";
            return <div className="p-8"><Loader message={message} size="lg" /></div>;
        }

        if (error) {
            return (
                <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg m-6">
                    {error}
                </div>
            );
        }

        if (theory) {
            return (
                <>
                    <div className="p-6 pr-16 border-b border-slate-200 bg-white">
                        <h3 className="text-2xl font-bold text-slate-800">Theory: <span className="text-indigo-600">{theory.topic}</span></h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {theory.explanation.split(/\*\*(.*?)\*\*/g).map((part, index) => 
                                index % 2 === 1 ? <strong key={index} className="font-semibold text-slate-800 bg-indigo-50 px-1 rounded-sm">{part}</strong> : <React.Fragment key={index}>{part}</React.Fragment>
                            )}
                        </p>
                        <div>
                            <h4 className="font-semibold text-slate-800 text-lg mt-4 mb-3 border-b border-slate-200 pb-2">Examples</h4>
                            <ul className="space-y-4">
                                {theory.examples.map((ex, i) => (
                                    <li key={i} className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-semibold text-slate-900">"{ex.portuguese}"</p>
                                        <p className="text-slate-600 mt-1">"{ex.english}"</p>
                                        {ex.explanation && <p className="text-sm italic text-indigo-700 bg-indigo-50 p-2 mt-2 rounded-md">{ex.explanation}</p>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            );
        }
        
        if (paragraph) {
            return (
                <>
                    <div className="p-6 pr-16 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
                        <h3 className="text-2xl font-bold text-slate-800">Generated Example</h3>
                        <AudioButton isLoading={isAudioLoading} onClick={handlePlayAudio} />
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div>
                           <HighlightedParagraph text={paragraph.portugueseParagraph} highlights={paragraph.highlightedWords} />
                        </div>
                        <div className="border-t border-slate-200 pt-4">
                           <p className="text-sm text-slate-500 mb-2 italic">English Translation:</p>
                           <p className="text-md leading-relaxed text-slate-600">{paragraph.englishTranslation}</p>
                        </div>
                    </div>
                </>
            );
        }

        return null;
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                 <div className="relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {renderContent()}
                </div>
                 <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end items-center gap-3">
                    {paragraph && !isLoading && (
                         <button onClick={onGenerateAnother} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                            Generate Another
                        </button>
                    )}
                    <button onClick={onClose} className="px-5 py-2 bg-slate-600 text-white font-semibold rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}