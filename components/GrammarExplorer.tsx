import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './Card';
import { GRAMMAR_TOPIC_GROUPS } from '../constants';
import { generateGrammarParagraph, getGrammarTheory } from '../services/geminiService';
import type { GrammarParagraph, GrammarTheory } from '../types';
import { GrammarWrittenDrillModal } from './GrammarWrittenDrillModal';
import { GrammarSpeakingDrillModal } from './GrammarSpeakingDrillModal';
import { GrammarPracticeModal } from './GrammarPracticeModal';
import { GrammarResultDisplayModal } from './GrammarResultDisplayModal';

export const GrammarExplorer: React.FC = () => {
    const [selectedTopic, setSelectedTopic] = useState<{id: string, name: string, description: string} | null>(null);
    
    // State for API calls and results
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GrammarParagraph | null>(null);
    
    const [isTheoryLoading, setIsTheoryLoading] = useState(false);
    const [theory, setTheory] = useState<GrammarTheory | null>(null);
    const [theoryError, setTheoryError] = useState<string | null>(null);

    // State for Modals
    const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isWrittenDrillModalOpen, setIsWrittenDrillModalOpen] = useState(false);
    const [isSpeakingDrillModalOpen, setIsSpeakingDrillModalOpen] = useState(false);
    
    const [lastTheme, setLastTheme] = useState('');

    const handleSelectTopic = (topic: {id: string; name: string; description: string}) => {
        setSelectedTopic(topic);
        setIsPracticeModalOpen(true);
        // Clear previous results when selecting a new topic
        setResult(null);
        setTheory(null);
        setError(null);
        setTheoryError(null);
    };

    const handleGenerate = async (theme: string) => {
        if (!selectedTopic) return;
        setLastTheme(theme);
        setIsPracticeModalOpen(false); // Close practice modal
        setIsResultModalOpen(true);   // Open result modal

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

    const handleGenerateAnother = () => {
        handleGenerate(lastTheme);
    };

    const handleLearnTheory = async () => {
        if (!selectedTopic) return;
        setIsPracticeModalOpen(false); // Close practice modal
        setIsResultModalOpen(true);   // Open result modal

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
    
    const handleCloseResultModal = () => {
        setIsResultModalOpen(false);
        // Delay clearing data to allow for modal fade-out animation
        setTimeout(() => {
            setResult(null);
            setTheory(null);
            setError(null);
            setTheoryError(null);
        }, 300);
    }

    return (
        <>
        <div className="max-w-7xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold text-slate-800">Grammar Explorer</h2>
                    <p className="text-sm text-slate-500">Learn the theory, generate contextual paragraphs, or start a drill.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">Choose a grammar topic</h3>
                        <div className="space-y-8">
                           {GRAMMAR_TOPIC_GROUPS.map(group => (
                               <section key={group.level} aria-labelledby={group.level.replace(/\s+/g, '-').toLowerCase()}>
                                   <h4 id={group.level.replace(/\s+/g, '-').toLowerCase()} className="text-xl font-bold text-indigo-700 mb-4 pb-2 border-b-2 border-indigo-100">{group.level}</h4>
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                       {group.topics.map(topic => (
                                            <button
                                                key={topic.id}
                                                onClick={() => handleSelectTopic(topic)}
                                                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left h-full flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                                    selectedTopic?.id === topic.id 
                                                        ? 'border-indigo-500 bg-indigo-50 shadow-lg' 
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                                }`}
                                            >
                                                <h4 className="font-bold text-slate-800">{topic.name}</h4>
                                                <p className="text-sm text-slate-500 mt-1 flex-grow">{topic.description}</p>
                                                {topic.example && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200/80 text-sm">
                                                        <p className="font-mono text-indigo-900 bg-indigo-100 rounded px-2 py-1 text-xs">
                                                            <span className="font-semibold">e.g.</span> {topic.example.pt}
                                                        </p>
                                                        <p className="font-mono text-slate-500 italic mt-1 text-xs pl-2">
                                                            {topic.example.en}
                                                        </p>
                                                    </div>
                                                )}
                                            </button>
                                       ))}
                                   </div>
                               </section>
                           ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <GrammarPracticeModal
            isOpen={isPracticeModalOpen}
            onClose={() => setIsPracticeModalOpen(false)}
            topic={selectedTopic}
            onGenerateParagraph={handleGenerate}
            onLearnTheory={handleLearnTheory}
            onStartWrittenDrill={() => {
                setIsPracticeModalOpen(false);
                setIsWrittenDrillModalOpen(true);
            }}
            onStartSpeakingPractice={() => {
                setIsPracticeModalOpen(false);
                setIsSpeakingDrillModalOpen(true);
            }}
        />

        <GrammarResultDisplayModal
            isOpen={isResultModalOpen}
            onClose={handleCloseResultModal}
            isLoading={isLoading || isTheoryLoading}
            error={error || theoryError}
            paragraph={result}
            theory={theory}
            onGenerateAnother={handleGenerateAnother}
        />

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