
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from './Card';
import { Loader } from './Loader';
import { VOCABULARY_CATEGORIES, VOCABULARY_CUSTOM_CATEGORIES_STORAGE_KEY, WORD_BANK_STORAGE_KEY } from '../constants';
import { getVocabularyForCategory } from '../services/geminiService';
import type { VocabularyItem } from '../types';
import { WordBank } from './WordBank';

interface Category {
    id: string;
    name: string;
    emoji: string;
    description: string;
    isCustom?: boolean;
}

const WelcomeContent: React.FC = () => (
    <div className="text-center flex flex-col items-center justify-center h-full p-8">
         <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl mb-4">
            📚
         </div>
        <h2 className="text-2xl font-bold text-slate-800">Welcome to the Vocabulary Explorer</h2>
        <p className="mt-2 text-slate-500 max-w-md">
            Select a category, or create your own by typing a topic above and clicking "Generate". Saved topics will appear in the list.
        </p>
    </div>
);

export const VocabularyExplorer: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    // --- Custom Categories State ---
    const [customTopicInput, setCustomTopicInput] = useState('');
    const [customCategories, setCustomCategories] = useState<Category[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
    const [unsavedTopic, setUnsavedTopic] = useState<{name: string; items: VocabularyItem[]} | null>(null);

    // --- Word Bank State ---
    const [leftColumnView, setLeftColumnView] = useState<'categories' | 'bank'>('categories');
    const [wordBank, setWordBank] = useState<Record<string, VocabularyItem[]>>({});
    // This Set is used to quickly check which words have been 'banked' by the user.
    // We explicitly type `allWords` to `string[]` to avoid potential type inference
    // issues with `Array.prototype.flat()` in some environments, which could lead
    // to `bankedWordsSet` being inferred as `Set<unknown>`.
    const bankedWordsSet = useMemo(() => {
        // FIX: Replaced a complex reduce operation with a more explicit loop to flatten the array of vocabulary items.
        // This avoids potential TypeScript type inference issues with array methods like .flat() or .reduce() in some environments.
        const allItems: VocabularyItem[] = [];
        // Fix: Explicitly cast Object.values to VocabularyItem[][] to ensure correct iteration typing.
        for (const items of Object.values(wordBank) as VocabularyItem[][]) {
            allItems.push(...items);
        }
        const allWords: string[] = allItems.map((item) => item.portugueseWord);
        return new Set(allWords);
    }, [wordBank]);

    // --- Load and Save Custom Categories & Word Bank ---
    useEffect(() => {
        try {
            const savedCustom = window.localStorage.getItem(VOCABULARY_CUSTOM_CATEGORIES_STORAGE_KEY);
            if (savedCustom) setCustomCategories(JSON.parse(savedCustom));

            const savedBank = window.localStorage.getItem(WORD_BANK_STORAGE_KEY);
            if (savedBank) setWordBank(JSON.parse(savedBank));

        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(VOCABULARY_CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
        } catch (error) {
            console.error("Failed to save custom categories:", error);
        }
    }, [customCategories]);

    useEffect(() => {
        try {
            window.localStorage.setItem(WORD_BANK_STORAGE_KEY, JSON.stringify(wordBank));
        } catch (error) {
            console.error("Failed to save word bank:", error);
        }
    }, [wordBank]);

    // Combine default and custom categories into one list for rendering
    useEffect(() => {
        setAllCategories([...VOCABULARY_CATEGORIES, ...customCategories]);
    }, [customCategories]);


    useEffect(() => {
        const fetchVocabulary = async () => {
            if (!selectedCategory) return;
            
            setUnsavedTopic(null);
            setIsLoading(true);
            setError(null);
            setVocabulary([]);

            try {
                // Fix: `Array.from(bankedWordsSet)` correctly produces `string[]` now that `bankedWordsSet` is `Set<string>`.
                // Add explicit type assertion for `wordsToExclude` to resolve potential inference issues.
                const wordsToExclude: string[] = Array.from(bankedWordsSet);
                const data = await getVocabularyForCategory(selectedCategory.name, undefined, wordsToExclude);
                setVocabulary(data);
            } catch (err) {
                console.error("Error fetching vocabulary:", err);
                setError("Failed to load vocabulary. The AI model may be busy. Please try another category or try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchVocabulary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory]);

    const handleGenerateCustomTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        const topicName = customTopicInput.trim();
        if (!topicName || isGeneratingCustom) return;

        setIsGeneratingCustom(true);
        setSelectedCategory(null);
        setVocabulary([]);
        setError(null);

        try {
            // Fix: `Array.from(bankedWordsSet)` correctly produces `string[]` now that `bankedWordsSet` is `Set<string>`.
            // Add explicit type assertion for `wordsToExclude` to resolve potential inference issues.
            const wordsToExclude: string[] = Array.from(bankedWordsSet);
            const data = await getVocabularyForCategory(topicName, undefined, wordsToExclude);
            setUnsavedTopic({ name: topicName, items: data });
            setCustomTopicInput('');
        } catch (err) {
            console.error("Error generating custom topic:", err);
            setError(`Failed to generate vocabulary for "${topicName}". Please try again.`);
        } finally {
            setIsGeneratingCustom(false);
        }
    };

    const handleSaveTopic = () => {
        if (!unsavedTopic) return;

        const newCategory: Category = {
            id: `custom-${Date.now()}`,
            name: unsavedTopic.name,
            emoji: '📌', // Default emoji for custom topics
            description: 'A custom topic you created.',
            isCustom: true,
        };

        const updatedCustomCategories = [...customCategories, newCategory];
        setCustomCategories(updatedCustomCategories);
        setVocabulary(unsavedTopic.items);
        setSelectedCategory(newCategory);
        setUnsavedTopic(null);
    };

    const handleDeleteTopic = (e: React.MouseEvent, topicId: string) => {
        e.stopPropagation(); // Prevent selection when clicking delete
        const topicToDelete = customCategories.find(c => c.id === topicId);
        if (topicToDelete && window.confirm(`Are you sure you want to delete the custom topic "${topicToDelete.name}"?`)) {
            setCustomCategories(prev => prev.filter(c => c.id !== topicId));
            if (selectedCategory?.id === topicId) {
                setSelectedCategory(null);
                setVocabulary([]);
            }
        }
    };

    const handleAddToBank = (item: VocabularyItem) => {
        if (!currentTopicName) return;
        setWordBank(prev => {
            const newBank = { ...prev };
            const categoryWords = newBank[currentTopicName] || [];
            if (!categoryWords.some(bankedItem => bankedItem.portugueseWord === item.portugueseWord)) {
                newBank[currentTopicName] = [...categoryWords, item].sort((a,b) => a.portugueseWord.localeCompare(b.portugueseWord));
            }
            return newBank;
        });
    };

    const handleRemoveFromBank = (itemToRemove: VocabularyItem, category: string) => {
        setWordBank(prev => {
            const newBank = { ...prev };
            if (!newBank[category]) return prev;
            newBank[category] = newBank[category].filter(item => item.portugueseWord !== itemToRemove.portugueseWord);
            if (newBank[category].length === 0) {
                delete newBank[category];
            }
            return newBank;
        });
    };
    
    const currentTopicName = unsavedTopic?.name || selectedCategory?.name;
    const currentTopicEmoji = selectedCategory?.emoji;
    const currentVocabularyList = unsavedTopic?.items || vocabulary;

    const handleRegenerateVocabulary = async () => {
        if (!currentTopicName) return;
    
        setIsRegenerating(true);
        setError(null);
    
        try {
            // Fix: `Array.from(bankedWordsSet)` correctly produces `string[]` now that `bankedWordsSet` is `Set<string>`.
            // Add explicit type assertion for `wordsToExclude` to resolve potential inference issues.
            const wordsToExclude: string[] = Array.from(bankedWordsSet);
            const newItems = await getVocabularyForCategory(currentTopicName, currentVocabularyList, wordsToExclude);
    
            if (unsavedTopic) {
                setUnsavedTopic({ ...unsavedTopic, items: newItems });
            } else {
                setVocabulary(newItems);
            }
    
        } catch (err) {
            console.error("Error regenerating vocabulary:", err);
            setError("Failed to generate a new set of words. Please try again.");
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-4 xl:col-span-3">
                <Card className="h-full">
                    <CardContent className="p-2 flex flex-col h-full">
                        <div className="p-2 border-b border-slate-200 mb-2">
                            <div className="flex bg-slate-100 rounded-lg p-1 text-sm font-semibold">
                                <button
                                    onClick={() => setLeftColumnView('categories')}
                                    className={`w-1/2 p-2 rounded-md transition-colors ${leftColumnView === 'categories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                                >
                                    Categories
                                </button>
                                <button
                                    onClick={() => setLeftColumnView('bank')}
                                    className={`w-1/2 p-2 rounded-md transition-colors ${leftColumnView === 'bank' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                                >
                                    Word Bank ({bankedWordsSet.size})
                                </button>
                            </div>
                        </div>

                        {leftColumnView === 'categories' ? (
                             <>
                                <form onSubmit={handleGenerateCustomTopic} className="p-2 pb-3 border-b border-slate-200 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={customTopicInput}
                                            onChange={(e) => setCustomTopicInput(e.target.value)}
                                            placeholder="Create a custom topic..."
                                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                                            aria-label="Create custom vocabulary topic"
                                            disabled={isGeneratingCustom}
                                        />
                                        <button
                                            type="submit"
                                            className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-28"
                                            disabled={!customTopicInput.trim() || isGeneratingCustom}
                                        >
                                            {isGeneratingCustom ? <Loader size="sm" /> : 'Generate'}
                                        </button>
                                    </div>
                                </form>
                                <div className="flex-grow max-h-[65vh] overflow-y-auto">
                                    <ul className="space-y-1">
                                        {allCategories.map((cat) => (
                                            <li key={cat.id}>
                                                <button
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 flex items-center justify-between ${
                                                        selectedCategory?.id === cat.id
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center overflow-hidden">
                                                        <span className="text-xl mr-3">{cat.emoji}</span>
                                                        <div className="truncate">
                                                            <p className="font-semibold truncate">{cat.name}</p>
                                                            <p className={`text-xs truncate ${selectedCategory?.id === cat.id ? 'text-indigo-200' : 'text-slate-500'}`}>{cat.description}</p>
                                                        </div>
                                                    </div>
                                                    {cat.isCustom && (
                                                        <div
                                                            onClick={(e) => handleDeleteTopic(e, cat.id)}
                                                            className="p-1.5 rounded-full hover:bg-black/20 ml-2 flex-shrink-0"
                                                            aria-label={`Delete custom topic ${cat.name}`}
                                                            title="Delete topic"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             </>
                        ) : (
                            <WordBank wordBank={wordBank} onRemoveWord={handleRemoveFromBank} />
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-8 xl:col-span-9">
                <Card className="min-h-[75vh]">
                    {!selectedCategory && !unsavedTopic && !isGeneratingCustom && !error ? (
                        <WelcomeContent />
                    ) : isLoading || isGeneratingCustom ? (
                        <div className="flex items-center justify-center h-full">
                           <Loader message={`Fetching vocabulary for ${currentTopicName}...`} size="lg" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-center p-8">
                            <p className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</p>
                        </div>
                    ) : (
                       <div className="p-4">
                            <div className="flex items-center justify-between gap-4 mb-4 px-2">
                                <h2 className="text-2xl font-bold text-slate-800 truncate">
                                    {currentTopicEmoji && <span className="mr-2">{currentTopicEmoji}</span>}
                                    {currentTopicName}
                                </h2>
                                {unsavedTopic && (
                                    <button
                                        onClick={handleSaveTopic}
                                        className="flex-shrink-0 px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 0a1 1 0 00-1 1v1a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1H8z" />
                                        </svg>
                                        <span>Save Topic</span>
                                    </button>
                                )}
                            </div>
                           <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {currentVocabularyList.map((item, index) => {
                                    const isBanked = bankedWordsSet.has(item.portugueseWord);
                                    return (
                                        <div key={index} className="bg-slate-50 rounded-lg p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-grow">
                                                    <h3 className="text-xl font-bold text-indigo-700">{item.portugueseWord}</h3>
                                                    <p className="text-slate-600">{item.englishTranslation} <span className="italic text-slate-500 text-sm">({item.wordType})</span></p>
                                                </div>
                                                <div className="flex items-center flex-shrink-0 gap-2">
                                                    {isBanked ? (
                                                        <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-green-100 text-green-600" title="Saved in Word Bank">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddToBank(item)}
                                                            className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                                                            aria-label={`Add "${item.portugueseWord}" to word bank`}
                                                            title="Add to Word Bank"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 border-t border-slate-200 pt-3">
                                                <p className="text-slate-800">"{item.exampleSentence}"</p>
                                                <p className="text-sm text-slate-500 italic mt-1">"{item.exampleTranslation}"</p>
                                            </div>
                                        </div>
                                    )
                                })}
                           </div>
                           {currentVocabularyList.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <button
                                        onClick={handleRegenerateVocabulary}
                                        disabled={isRegenerating || isLoading || isGeneratingCustom}
                                        className="w-full flex items-center justify-center px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isRegenerating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            'Generate New Set'
                                        )}
                                    </button>
                                </div>
                           )}
                       </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
