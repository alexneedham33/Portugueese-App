import React from 'react';
import type { VocabularyItem } from '../types';

interface WordBankProps {
    wordBank: Record<string, VocabularyItem[]>;
    onRemoveWord: (item: VocabularyItem, category: string) => void;
}

export const WordBank: React.FC<WordBankProps> = ({ wordBank, onRemoveWord }) => {
    const categories = Object.keys(wordBank).sort();
    
    if (categories.length === 0) {
        return <div className="text-center p-8 text-slate-500 text-sm">Your word bank is empty. Add words from vocabulary lists using the '+' icon.</div>;
    }

    return (
        <div className="flex-grow max-h-[65vh] overflow-y-auto">
            <ul className="space-y-4">
                {categories.map(category => (
                    <li key={category}>
                        <h3 className="font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-md text-sm sticky top-0">{category}</h3>
                        <ul className="mt-1 space-y-1">
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
                    </li>
                ))}
            </ul>
        </div>
    );
};
