import React, { useState, useEffect } from 'react';

interface GrammarPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {id: string, name: string} | null;
  onLearnTheory: () => void;
  onGenerateParagraph: (theme: string) => void;
  onStartWrittenDrill: () => void;
  onStartSpeakingPractice: () => void;
}

export const GrammarPracticeModal: React.FC<GrammarPracticeModalProps> = ({
    isOpen,
    onClose,
    topic,
    onLearnTheory,
    onGenerateParagraph,
    onStartWrittenDrill,
    onStartSpeakingPractice,
}) => {
    const [theme, setTheme] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset theme when modal is closed to not persist across selections
            setTimeout(() => setTheme(''), 200);
        }
    }, [isOpen]);

    if (!isOpen || !topic) return null;

    const buttonStyle = "w-full flex items-center justify-start text-left p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const iconContainerStyle = "h-10 w-10 mr-4 p-2 rounded-lg flex-shrink-0 flex items-center justify-center";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Practice Options</h2>
                            <p className="text-lg text-indigo-600 font-semibold mt-1">{topic.name}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close practice options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <button onClick={onLearnTheory} className={buttonStyle}>
                        <div className={`${iconContainerStyle} bg-green-100 text-green-600`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3-5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0114.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800">Learn the Theory</h4>
                            <p className="text-sm text-slate-500">Read a detailed explanation with examples.</p>
                        </div>
                    </button>
                    
                     <div className="p-4 bg-white border border-slate-200 rounded-lg">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className={`${iconContainerStyle} bg-indigo-100 text-indigo-600`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M11.983 1.907a.75.75 0 00-1.192-.727l-6.5 4.25a.75.75 0 000 1.14l6.5 4.25a.75.75 0 001.192-.727V8.623l3.517 2.302a.75.75 0 001.192-.727V5.802a.75.75 0 00-1.192-.727L11.983 7.377V1.907zM4.5 3.5c.828 0 1.5.672 1.5 1.5v10c0 .828-.672 1.5-1.5 1.5s-1.5-.672-1.5-1.5V5c0-.828.672-1.5 1.5-1.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Generate Paragraph</h4>
                                    <p className="text-sm text-slate-500">See the grammar in a real-world context.</p>
                                </div>
                            </div>
                            <label htmlFor="theme-input-modal" className="sr-only">
                                Theme for paragraph generation
                            </label>
                            <input
                                id="theme-input-modal"
                                type="text"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                placeholder="Optional theme (e.g., ordering coffee)"
                                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                aria-label="Theme for paragraph"
                            />
                            <button onClick={() => onGenerateParagraph(theme)} className="w-full mt-2 text-sm bg-indigo-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors">
                                Generate
                            </button>
                        </div>
                    </div>

                    <button onClick={onStartWrittenDrill} className={buttonStyle}>
                        <div className={`${iconContainerStyle} bg-blue-100 text-blue-600`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800">Written Drills</h4>
                            <p className="text-sm text-slate-500">Test your knowledge with fill-in-the-blank exercises.</p>
                        </div>
                    </button>

                    <button onClick={onStartSpeakingPractice} className={buttonStyle}>
                         <div className={`${iconContainerStyle} bg-red-100 text-red-600`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm-2 6a2 2 0 114 0 2 2 0 01-4 0zM10 18a7 7 0 100-14 7 7 0 000 14z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800">Speaking Practice</h4>
                            <p className="text-sm text-slate-500">Practice saying sentences out loud.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
