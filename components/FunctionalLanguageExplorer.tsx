import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Loader } from './Loader';
import { FUNCTIONAL_DOMAINS, FUNCTIONAL_CUSTOM_DOMAINS_STORAGE_KEY } from '../constants';
import { getFunctionalScene, getSpeech, generateFunctionalDomain } from '../services/geminiService';
import type { FunctionalScene, FunctionalDomain, FunctionalSubtopic } from '../types';
import { playAudio } from '../utils/audio';

const WelcomeContent: React.FC = () => (
    <div className="text-center flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl mb-4">
            🎯
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Functional Language Explorer</h2>
        <p className="mt-2 text-slate-500 max-w-md">
            Learn what to say in real-life situations. Select a category, or describe a scenario in the search bar and click "Generate" to create your own.
        </p>
    </div>
);

const GenerationChoice: React.FC<{ query: string; onQuickConversation: () => void; onCreateCard: () => void; isCreatingCard: boolean; }> = 
    ({ query, onQuickConversation, onCreateCard, isCreatingCard }) => (
    <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Generate for: <span className="text-indigo-600">"{query}"</span></h2>
            <p className="mt-2 text-slate-500 max-w-md">
                Choose how you want to learn about this topic.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                 <button 
                    onClick={onQuickConversation}
                    className="w-full sm:w-auto flex-1 flex flex-col items-center justify-center p-6 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                    <span className="text-2xl">⚡️</span>
                    <span className="font-semibold text-slate-700 mt-2">Quick Conversation</span>
                    <span className="text-sm text-slate-500 mt-1">Get an immediate example dialogue.</span>
                </button>
                <button 
                    onClick={onCreateCard}
                    disabled={isCreatingCard}
                    className="w-full sm:w-auto flex-1 flex flex-col items-center justify-center p-6 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isCreatingCard ? (
                        <>
                           <Loader size="sm" />
                           <span className="font-semibold text-slate-700 mt-2">Creating Card...</span>
                           <span className="text-sm text-slate-500 mt-1">This may take a moment.</span>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl">🗂️</span>
                            <span className="font-semibold text-slate-700 mt-2">Create Topic Card</span>
                            <span className="text-sm text-slate-500 mt-1">Generate a full, savable topic.</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
);

const AudioButton: React.FC<{ isLoading: boolean; onClick: () => void; }> = ({ isLoading, onClick }) => {
    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors duration-200 disabled:bg-slate-100 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
        aria-label="Play audio for phrase"
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
        )}
      </button>
    );
};

export const FunctionalLanguageExplorer: React.FC = () => {
    // Navigation State
    const [selectedDomain, setSelectedDomain] = useState<FunctionalDomain | null>(null);
    const [selectedSubtopic, setSelectedSubtopic] = useState<FunctionalSubtopic | null>(null);
    const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [generationChoice, setGenerationChoice] = useState<{ query: string } | null>(null);

    // Custom Topics State
    const [customDomains, setCustomDomains] = useState<FunctionalDomain[]>([]);
    
    // Data State
    const [scene, setScene] = useState<FunctionalScene | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Audio states
    const [loadingAudio, setLoadingAudio] = useState<Set<string>>(new Set());
    const [audioCache, setAudioCache] = useState<Record<string, string>>({});
    const audioContextRef = useRef<AudioContext | null>(null);

    // --- Load and Save Custom Domains ---
    useEffect(() => {
        try {
            const savedDomains = window.localStorage.getItem(FUNCTIONAL_CUSTOM_DOMAINS_STORAGE_KEY);
            if (savedDomains) setCustomDomains(JSON.parse(savedDomains));
        } catch (error) {
            console.error("Failed to load custom domains from localStorage:", error);
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(FUNCTIONAL_CUSTOM_DOMAINS_STORAGE_KEY, JSON.stringify(customDomains));
        } catch (error) {
            console.error("Failed to save custom domains:", error);
        }
    }, [customDomains]);

    const allDomains = useMemo(() => [...customDomains, ...FUNCTIONAL_DOMAINS], [customDomains]);

    const filteredDomains = useMemo((): FunctionalDomain[] => {
        if (!searchQuery.trim()) {
          return allDomains;
        }
        const lowerQuery = searchQuery.toLowerCase();
      
        return allDomains
          .map(domain => {
            if (domain.name.toLowerCase().includes(lowerQuery)) {
                return domain; // If domain name matches, include the whole domain
            }

            const matchingSubtopics = domain.subtopics
              .map(subtopic => {
                if (subtopic.name.toLowerCase().includes(lowerQuery)) {
                    return subtopic; // If subtopic name matches, include it
                }
                const matchingFunctions = subtopic.functions.filter(func =>
                  func.toLowerCase().includes(lowerQuery)
                );
                if (matchingFunctions.length > 0) {
                  return { ...subtopic, functions: matchingFunctions };
                }
                return null;
              })
              .filter((st): st is FunctionalSubtopic => st !== null);
            
            if (matchingSubtopics.length > 0) {
              return { ...domain, subtopics: matchingSubtopics };
            }
            return null;
          })
          .filter((d): d is FunctionalDomain => d !== null);
    }, [searchQuery, allDomains]);

    const handleSelectFunction = async (func: string, domain?: FunctionalDomain | null, subtopic?: FunctionalSubtopic | null) => {
        const currentDomain = domain || selectedDomain;
        const currentSubtopic = subtopic || selectedSubtopic;
        if (!currentDomain || !currentSubtopic) return;

        setSelectedFunction(func);
        setIsLoading(true);
        setError(null);
        setScene(null);
        setAudioCache({});

        try {
            const data = await getFunctionalScene(currentDomain.name, currentSubtopic.name, func);
            setScene(data);
        } catch (err) {
            console.error("Error fetching functional scene:", err);
            setError("Failed to load scene. The AI model may be busy. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRandomFunction = () => {
        if (!selectedDomain || !selectedDomain.subtopics || selectedDomain.subtopics.length === 0) {
            return;
        }
    
        // Filter out subtopics that have no functions
        const validSubtopics = selectedDomain.subtopics.filter(st => st.functions && st.functions.length > 0);
        if (validSubtopics.length === 0) {
            return; // No functions to choose from in this domain
        }
    
        const randomSubtopicIndex = Math.floor(Math.random() * validSubtopics.length);
        const randomSubtopic = validSubtopics[randomSubtopicIndex];
    
        const randomFunctionIndex = Math.floor(Math.random() * randomSubtopic.functions.length);
        const randomFunction = randomSubtopic.functions[randomFunctionIndex];
    
        // Reuse the existing handler to fetch data and update state
        setSelectedSubtopic(randomSubtopic); // Set this first for UI consistency
        handleSelectFunction(randomFunction, selectedDomain, randomSubtopic);
    };

    const handleGenerateChoice = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        setGenerationChoice({ query });
        setError(null);
        setSelectedFunction(null);
        setSelectedDomain(null);
        setSelectedSubtopic(null);
        setScene(null);
        setAudioCache({});
    };

    const handleGenerateQuickConversation = async (query: string) => {
        setGenerationChoice(null);
        setIsLoading(true);
        try {
            const data = await getFunctionalScene('Custom', 'User Query', query);
            setScene(data);
            setSelectedFunction(query); // Set this to show a title
        } catch (err) {
            console.error("Error generating quick conversation:", err);
            setError(`Failed to generate a scene for "${query}". The AI may be busy. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    }

    const handleGenerateTopicCard = async (query: string) => {
        setIsGeneratingCard(true);
        setError(null);
        try {
            const domainData = await generateFunctionalDomain(query);
            const newDomain: FunctionalDomain = {
                ...domainData,
                id: `custom-${Date.now()}`,
                isCustom: true,
            };
            setCustomDomains(prev => [newDomain, ...prev]);
            setGenerationChoice(null); // Success, close the choice UI
            setSearchQuery(''); // Clear search
        } catch (err) {
            console.error("Error generating topic card:", err);
            setError(`Failed to create a topic card for "${query}". Please try a different topic or try again.`);
            setGenerationChoice(null); // Also close on error
        } finally {
            setIsGeneratingCard(false);
        }
    }

    const handleDeleteTopic = (e: React.MouseEvent, domainId: string) => {
        e.stopPropagation();
        const domainToDelete = customDomains.find(d => d.id === domainId);
        if (domainToDelete && window.confirm(`Are you sure you want to delete the custom topic "${domainToDelete.name}"?`)) {
            setCustomDomains(prev => prev.filter(d => d.id !== domainId));
            if (selectedDomain?.id === domainId) {
                resetSelection();
            }
        }
    };

    const handleRegenerateScene = async () => {
        const domainName = selectedDomain?.name;
        const subtopicName = selectedSubtopic?.name;
        const functionName = selectedFunction;

        if (!domainName || !subtopicName || !functionName || !scene) return;
    
        setIsRegenerating(true);
        setError(null);
        setAudioCache({});
    
        try {
            const data = await getFunctionalScene(domainName, subtopicName, functionName, scene);
            setScene(data);
        } catch (err) {
            console.error("Error regenerating scene:", err);
            setError("Failed to generate a new scene. Please try again.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handlePlayAudio = async (text: string) => {
        if (loadingAudio.has(text)) return;
    
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
    
        if (audioCache[text]) {
            await playAudio(audioCache[text], audioCtx);
            return;
        }
    
        setLoadingAudio(prev => new Set(prev).add(text));
        try {
            const audioBase64 = await getSpeech(text);
            setAudioCache(prev => ({ ...prev, [text]: audioBase64 }));
            await playAudio(audioBase64, audioCtx);
        } catch (error) {
            console.error("Failed to fetch and play audio:", error);
        } finally {
            setLoadingAudio(prev => {
                const newSet = new Set(prev);
                newSet.delete(text);
                return newSet;
            });
        }
    };
    
    const resetSelection = () => {
        setSelectedDomain(null);
        setSelectedSubtopic(null);
        setSelectedFunction(null);
        setScene(null);
        setError(null);
        setSearchQuery('');
        setGenerationChoice(null);
    }
    
    const renderLeftPanel = () => {
        if (selectedDomain && !searchQuery) {
            return (
                <div className="p-2 flex flex-col h-full">
                    <div className="p-2 pb-3 border-b border-slate-200 mb-2 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <button onClick={() => resetSelection()} className="flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                All Topics
                            </button>
                            <button
                                onClick={handleSelectRandomFunction}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-semibold rounded-full shadow-sm hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                                title="Pick a random function from this topic"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                <span>Surprise Me</span>
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 px-2 mt-2">{selectedDomain.emoji} {selectedDomain.name}</h2>
                    </div>
                    <div className="flex-grow max-h-[70vh] overflow-y-auto pr-1">
                        <ul className="space-y-4">
                            {selectedDomain.subtopics.map(subtopic => (
                                <li key={subtopic.name}>
                                    <h3 className="font-semibold text-slate-600 px-3 py-1">{subtopic.name}</h3>
                                    <ul className="space-y-1">
                                        {subtopic.functions.map(func => (
                                            <li key={func}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSubtopic(subtopic);
                                                        handleSelectFunction(func, selectedDomain, subtopic);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 rounded-lg text-md font-medium transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                                        selectedFunction === func && selectedSubtopic?.name === subtopic.name
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {func}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )
        }

        return (
             <div className="p-2">
                <form onSubmit={handleGenerateChoice} className="p-2 pb-3 border-b border-slate-200 mb-2">
                    <h2 className="text-xl font-bold text-slate-800 px-2 mb-3">Language Functions</h2>
                    <div className="flex items-center space-x-2 px-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setSelectedDomain(null); }}
                            placeholder="Filter topics or describe a scene..."
                            className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                         <button
                            type="submit"
                            className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-28"
                            disabled={!searchQuery.trim()}
                        >
                            Generate
                        </button>
                    </div>
                </form>

                <div className="flex-grow max-h-[65vh] overflow-y-auto pr-1 p-2">
                    <div className="grid grid-cols-2 gap-2">
                        {filteredDomains.map(domain => (
                            <div key={domain.id} className="relative group">
                                <button 
                                    onClick={() => setSelectedDomain(domain)}
                                    className="w-full p-4 flex flex-col items-center justify-center text-center aspect-square rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                                >
                                    <span className="text-4xl">{domain.emoji}</span>
                                    <span className="mt-2 font-semibold text-slate-700">{domain.name}</span>
                                </button>
                                {domain.isCustom && (
                                    <button 
                                        onClick={(e) => handleDeleteTopic(e, domain.id)}
                                        className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-slate-200/50 text-slate-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all focus:opacity-100"
                                        aria-label={`Delete custom topic ${domain.name}`}
                                        title="Delete topic"
                                    >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const hasContent = !!scene;
    const currentLoadingState = isLoading;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-4 xl:col-span-3">
                <Card className="h-full">
                    <CardContent className="p-0">
                       {renderLeftPanel()}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-8 xl-col-span-9">
                <Card className="min-h-[75vh]">
                    {generationChoice ? (
                        <GenerationChoice 
                            query={generationChoice.query}
                            onQuickConversation={() => handleGenerateQuickConversation(generationChoice.query)}
                            onCreateCard={() => handleGenerateTopicCard(generationChoice.query)}
                            isCreatingCard={isGeneratingCard}
                        />
                    ) : !hasContent && !currentLoadingState && !error ? (
                        <WelcomeContent />
                    ) : currentLoadingState ? (
                        <div className="flex items-center justify-center h-full">
                           <Loader message={'Building conversation scene...'} size="lg" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <p className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</p>
                            <button onClick={resetSelection} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md">Back to Topics</button>
                        </div>
                    ) : scene ? (
                       <div className="p-6 flex flex-col h-full">
                            <div className="mb-6 px-2 flex-shrink-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-800">
                                        {scene.sceneTitle}
                                    </h2>
                                    <p className="mt-1 text-slate-500">{scene.sceneDescription}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRegenerateScene}
                                        disabled={isRegenerating}
                                        className="flex-shrink-0 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isRegenerating ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm10.293 9.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L15 14.414V17a1 1 0 11-2 0v-2.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3z" clipRule="evenodd" /></svg>
                                                <span>New Scene</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                           <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 flex-grow">
                                {scene.phrases.map((phrase, index) => (
                                    <div key={index} className="bg-slate-50 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-indigo-700">{phrase.speaker || 'Narrator'}:</p>
                                                <p className="text-xl text-slate-800 mt-1">
                                                    "{phrase.portuguese}"
                                                </p>
                                                <p className="text-md text-slate-600 mt-2 italic">
                                                    "{phrase.english}"
                                                </p>
                                            </div>
                                            <AudioButton
                                                isLoading={loadingAudio.has(phrase.portuguese)}
                                                onClick={() => handlePlayAudio(phrase.portuguese)}
                                            />
                                        </div>
                                    </div>
                                ))}
                           </div>
                       </div>
                    ) : null}
                </Card>
            </div>
        </div>
    );
};
