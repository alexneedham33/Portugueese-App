import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './Card';
import { Loader } from './Loader';
import { GRAMMAR_TOPICS } from '../constants';
import { generateGrammarParagraph, getGrammarTheory } from '../services/geminiService';
import type { GrammarParagraph, GrammarTheory } from '../types';
import { GrammarWrittenDrillModal } from './GrammarWrittenDrillModal';
import { GrammarSpeakingDrillModal } from './GrammarSpeakingDrillModal';

// Helper to render paragraph with highlighted words
const HighlightedParagraph: React.FC<{ text: string; highlights: string[] }> = ({ text, highlights }) => {
    if (!highlights || highlights.length === 0) {
        return <p className="text-lg leading-relaxed text-slate-800">{text}</p>;
    }

    // Create a regex that is case-insensitive and captures the highlights.
    // The regex looks for the highlights as whole words to avoid matching parts of other words.
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


export const GrammarExplorer: React.FC = () => {
    const [selectedTopic, setSelectedTopic] = useState<{id: string, name: string, description: string} | null>(GRAMMAR_TOPICS[0]);
    const [theme, setTheme] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GrammarParagraph | null>(null);
    
    const [isTheoryLoading, setIsTheoryLoading] = useState(false);
    const [theory, setTheory] = useState<GrammarTheory | null>(null);
    const [theoryError, setTheoryError] = useState<string | null>(null);

    const [isWrittenDrillModalOpen, setIsWrittenDrillModalOpen] = useState(false);
    const [isSpeakingDrillModalOpen, setIsSpeakingDrillModalOpen] = useState(false);

    const handleGenerate = async () => {
        if (!selectedTopic) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        setTheory(null);
        setTheoryError(null);

        try {
            const data = await generateGrammarParagraph(selectedTopic.name, theme);
            setResult(data);
        } catch (err) {
            console.error(err);
            setError("Failed to generate paragraph. The AI model might be busy or the request was invalid. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLearnTheory = async () => {
        if (!selectedTopic) return;
        setIsTheoryLoading(true);
        setTheory(null);
        setTheoryError(null);
        setResult(null); 
        setError(null);

        try {
            const data = await getGrammarTheory(selectedTopic.name);
            setTheory(data);
        } catch (err) {
            console.error(err);
            setTheoryError("Failed to load theory. The AI model might be busy. Please try again.");
        } finally {
            setIsTheoryLoading(false);
        }
    };

    return (
        <>
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold text-slate-800">Grammar Explorer</h2>
                    <p className="text-sm text-slate-500">Learn the theory, generate contextual paragraphs, or start a drill.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">1. Choose a grammar topic</label>
                        <div className="flex flex-wrap gap-2">
                           {GRAMMAR_TOPICS.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => setSelectedTopic(topic)}
                                    title={topic.description}
                                    className={`px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                        selectedTopic?.id === topic.id 
                                            ? 'bg-indigo-600 text-white shadow-sm' 
                                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    {topic.name}
                                </button>
                           ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="theme-input" className="block text-sm font-medium text-slate-700 mb-2">2. Enter a theme for paragraph generation (optional)</label>
                        <input
                            id="theme-input"
                            type="text"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., A trip to the beach, ordering coffee"
                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            aria-label="Theme for paragraph"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <button 
                            onClick={handleLearnTheory} 
                            disabled={isTheoryLoading || !selectedTopic} 
                            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                             {isTheoryLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Loading Theory...</span>
                                </>
                             ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3-5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0114.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" />
                                    </svg>
                                    <span>Learn the Theory</span>
                                </>
                             )}
                        </button>
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !selectedTopic} 
                            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M11.983 1.907a.75.75 0 00-1.192-.727l-6.5 4.25a.75.75 0 000 1.14l6.5 4.25a.75.75 0 001.192-.727V8.623l3.517 2.302a.75.75 0 001.192-.727V5.802a.75.75 0 00-1.192-.727L11.983 7.377V1.907zM4.5 3.5c.828 0 1.5.672 1.5 1.5v10c0 .828-.672 1.5-1.5 1.5s-1.5-.672-1.5-1.5V5c0-.828.672-1.5 1.5-1.5z" />
                                    </svg>
                                    <span>Generate Paragraph</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => setIsWrittenDrillModalOpen(true)}
                            disabled={!selectedTopic}
                            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            <span>Written Drills</span>
                        </button>
                        <button
                            onClick={() => setIsSpeakingDrillModalOpen(true)}
                            disabled={!selectedTopic}
                            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm-2 6a2 2 0 114 0 2 2 0 01-4 0zM10 18a7 7 0 100-14 7 7 0 000 14z" clipRule="evenodd" />
                             </svg>
                            <span>Speaking Practice</span>
                        </button>
                    </div>

                </CardContent>
            </Card>

            {isTheoryLoading && (
                <div className="flex justify-center p-8">
                    <Loader message="Loading theory..." size="lg" />
                </div>
            )}
            
            {theory && !isTheoryLoading && (
                <Card>
                     <CardHeader>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">Theory: <span className="text-indigo-600">{theory.topic}</span></h3>
                            <button onClick={() => setTheory(null)} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close theory">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {theory.explanation.split(/\*\*(.*?)\*\*/g).map((part, index) => {
                                if (index % 2 === 1) {
                                    // This is the bolded part
                                    return <strong key={index} className="font-semibold text-slate-800 bg-indigo-50 px-1 rounded-sm">{part}</strong>;
                                }
                                // This is the regular text part
                                return <React.Fragment key={index}>{part}</React.Fragment>;
                            })}
                        </p>
                        
                        <div>
                            <h4 className="font-semibold text-slate-800 text-lg mt-4 mb-3 border-b border-slate-200 pb-2">Examples</h4>
                            <ul className="space-y-4">
                                {theory.examples.map((ex, i) => {
                                    return (
                                        <li key={i} className="p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-semibold text-slate-900 flex-grow">"{ex.portuguese}"</p>
                                            </div>
                                            <p className="text-slate-600 mt-1">"{ex.english}"</p>
                                            {ex.explanation && <p className="text-sm italic text-indigo-700 bg-indigo-50 p-2 mt-2 rounded-md">{ex.explanation}</p>}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {theoryError && !isTheoryLoading && (
                 <Card>
                    <CardContent>
                        <p className="text-red-600 text-center font-medium">{theoryError}</p>
                    </CardContent>
                </Card>
            )}

            {isLoading && (
                <div className="flex justify-center p-8">
                    <Loader message="Crafting your paragraph..." size="lg" />
                </div>
            )}
            
            {result && !isLoading && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-xl font-bold text-slate-800">Generated Example</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                           <HighlightedParagraph text={result.portugueseParagraph} highlights={result.highlightedWords} />
                        </div>
                        <div className="border-t border-slate-200 pt-4">
                           <p className="text-sm text-slate-500 mb-2 italic">English Translation:</p>
                           <p className="text-md leading-relaxed text-slate-600">{result.englishTranslation}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && !isLoading && (
                <Card>
                    <CardContent>
                        <p className="text-red-600 text-center font-medium">{error}</p>
                    </CardContent>
                </Card>
            )}
        </div>
        {selectedTopic && (
            <>
                <GrammarWrittenDrillModal
                    isOpen={isWrittenDrillModalOpen}
                    onClose={() => setIsWrittenDrillModalOpen(false)}
                    topic={selectedTopic}
                />
                <GrammarSpeakingDrillModal
                    isOpen={isSpeakingDrillModalOpen}
                    onClose={() => setIsSpeakingDrillModalOpen(false)}
                    topic={selectedTopic}
                />
            </>
        )}
        </>
    );
};