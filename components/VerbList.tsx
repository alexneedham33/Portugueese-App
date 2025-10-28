import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './Card';

interface VerbListProps {
  verbs: string[];
  selectedVerb: string | null;
  onSelectVerb: (verb: string) => void;
  onAddVerb: (verb: string) => Promise<boolean>;
  isAdding: boolean;
  addError: string | null;
  onClearAddError: () => void;
}

export const VerbList: React.FC<VerbListProps> = ({ 
    verbs, 
    selectedVerb, 
    onSelectVerb, 
    onAddVerb, 
    isAdding, 
    addError,
    onClearAddError
}) => {
  const [newVerb, setNewVerb] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVerb.trim() && !isAdding) {
        onAddVerb(newVerb.trim()).then((success) => {
            if (success) {
                setNewVerb('');
            }
        });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (addError) {
        onClearAddError();
    }
    setNewVerb(e.target.value);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="text-xl font-bold text-slate-800">Verbs</h2>
        <p className="text-sm text-slate-500">Select a verb or add a new one</p>
      </CardHeader>
      <CardContent className="p-2 flex flex-col">
        <form onSubmit={handleSubmit} className="p-2 pb-3 border-b border-slate-200 mb-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newVerb}
              onChange={handleInputChange}
              placeholder="Enter an infinitive verb..."
              className={`block w-full px-3 py-2 bg-white border rounded-md text-sm shadow-sm placeholder-slate-400
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                        ${isAdding ? 'bg-slate-50 text-slate-500 border-slate-200' : 'border-slate-300'}
                        ${addError ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              aria-label="Add new verb"
              disabled={isAdding}
              aria-invalid={!!addError}
              aria-describedby="verb-error"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-20"
              disabled={!newVerb.trim() || isAdding}
              aria-label="Add verb"
            >
              {isAdding ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Add'}
            </button>
          </div>
          {addError && <p id="verb-error" className="mt-2 text-sm text-red-600">{addError}</p>}
        </form>
        <div className="flex-grow max-h-[65vh] overflow-y-auto">
          <ul className="space-y-1">
            {verbs.map((verb) => (
              <li key={verb}>
                <button
                  onClick={() => onSelectVerb(verb)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-md font-medium transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                    selectedVerb === verb
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {verb}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};