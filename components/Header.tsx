import React from 'react';

type AppView = 'conjugator' | 'grammar' | 'vocabulary' | 'functional' | 'ai_chat';

interface HeaderProps {
    activeView: AppView;
    onViewChange: (view: AppView) => void;
}

const NavButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ isActive, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
        >
            {children}
        </button>
    );
};


export const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
               <span style={{transform: 'translateY(-1px)'}}>P</span>
             </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Portuguese <span className="text-indigo-600">Learner</span>
            </h1>
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-2" aria-label="Main navigation">
            <NavButton isActive={activeView === 'conjugator'} onClick={() => onViewChange('conjugator')}>
                Verbs
            </NavButton>
            <NavButton isActive={activeView === 'grammar'} onClick={() => onViewChange('grammar')}>
                Grammar
            </NavButton>
            <NavButton isActive={activeView === 'vocabulary'} onClick={() => onViewChange('vocabulary')}>
                Vocabulary
            </NavButton>
            <NavButton isActive={activeView === 'functional'} onClick={() => onViewChange('functional')}>
                Functions
            </NavButton>
            <NavButton isActive={activeView === 'ai_chat'} onClick={() => onViewChange('ai_chat')}>
                AI Chat
            </NavButton>
          </nav>
        </div>
      </div>
    </header>
  );
};