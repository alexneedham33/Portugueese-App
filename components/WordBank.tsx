import React, { useState } from 'react';
import type { VocabularyItem } from '../types';

interface WordBankProps {
    wordBank: Record<string, VocabularyItem[]>;
    onRemoveWord: (item: VocabularyItem, category: string) => void;
}

export const WordBank: React.FC<WordBankProps> = ({ wordBank, onRemoveWord }) => {
    const categories = Object.keys(wordBank).sort();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const handleToggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    if (categories.length === 0) {
        return <div className="text-center p-8 text-slate-500 text-sm">Your word bank is empty. Add words from vocabulary lists using the '+' icon.</div>;
    }

    return (
        <div className="flex-grow max-h-[65vh] overflow-y-auto pr-1">
            <ul className="space-y-2">
                {categories.map(category => {
                    const isExpanded = expandedCategories.has(category);
                    return (
                        <li key={category}>
                             <button
                                onClick={() => handleToggleCategory(category)}
                                className="w-full flex items-center justify-between font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-md text-sm text-left hover:bg-indigo-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                aria-expanded={isExpanded}
                            >
                                <span>{category}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-5 w-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isExpanded && (
                                <ul className="mt-1 space-y-1 pl-2 pr-1 pt-1">
                                    {wordBank[category].map(item => (
                                        <li key={item.portugueseWord} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 group">
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-semibold text-slate-800 truncate">{item.portugueseWord}</p>
                                                <p className="text-sm text-slate-500 truncate">{item.englishTranslation}</p>
                                            </div>
                                            <div className="flex items-center flex-shrink-0 ml-2">
                                                <button
                                                    onClick={() => onRemoveWord(item, category)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title={`Remove "${item.portugueseWord}"`}
                                                    aria-label={`Remove "${item.portugueseWord}" from word bank`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};