import React from 'react';
import type { ConjugationData, SelectedConjugation } from '../types';
import { Card, CardHeader, CardContent } from './Card';
import { Loader } from './Loader';

interface ConjugationDisplayProps {
  verb: string | null;
  conjugations: ConjugationData | null;
  isLoading: boolean;
  error: string | null;
  selectedConjugation: SelectedConjugation | null;
  onSelectConjugation: (conjugation: SelectedConjugation) => void;
  onGenerateGeneralExamples: () => void;
}

const TENSE_MAP: { [key: string]: string } = {
  presente: 'Present',
  preterito_perfeito: 'Simple Past (Preterite)',
  preterito_imperfeito: 'Imperfect Past',
  preterito_perfeito_composto: 'Present Perfect',
  futuro_do_presente: 'Simple Future',
  futuro_do_preterito: 'Conditional',
  presente_do_subjuntivo: 'Present Subjunctive',
  imperfeito_do_subjuntivo: 'Imperfect Subjunctive',
};

const TENSE_ORDER: (keyof ConjugationData)[] = [
  'presente',
  'preterito_perfeito',
  'preterito_imperfeito',
  'preterito_perfeito_composto',
  'futuro_do_presente',
  'futuro_do_preterito',
  'presente_do_subjuntivo',
  'imperfeito_do_subjuntivo',
];

const PRONOUNS: { key: keyof ConjugationData['presente']; label: string }[] = [
    { key: 'eu', label: 'Eu' },
    { key: 'voce', label: 'Você/Ele/Ela' },
    { key: 'nos', label: 'Nós' },
    { key: 'voces', label: 'Vocês/Eles/Elas' },
];

export const ConjugationDisplay: React.FC<ConjugationDisplayProps> = ({
  verb,
  conjugations,
  isLoading,
  error,
  selectedConjugation,
  onSelectConjugation,
  onGenerateGeneralExamples,
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader message={`Conjucating "${verb}"...`} />
        </div>
      );
    }

    if (error) {
      return <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
    }

    if (!conjugations) {
      return <div className="text-center text-slate-500 p-8">Select a verb to see its conjugations.</div>;
    }

    return (
      <div className="space-y-6">
        {TENSE_ORDER.map((tense) => {
            const forms = conjugations[tense];
            if (!forms) return null;

            return (
              <div key={tense}>
                <h3 className="text-lg font-semibold text-indigo-700 mb-3 capitalize">{TENSE_MAP[tense]}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRONOUNS.map(({key: pronounKey, label: pronounLabel}) => {
                        const form = forms[pronounKey];
                        if (!form) return null;

                        const isSelected = selectedConjugation?.tense === tense && selectedConjugation?.pronoun === pronounLabel;
                        
                        return (
                            <button
                            key={pronounKey}
                            onClick={() => verb && onSelectConjugation({ verb, form, tense, pronoun: pronounLabel })}
                            className={`p-3 rounded-lg transition-all duration-200 ease-in-out text-left flex items-center space-x-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                isSelected
                                ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-500'
                                : 'bg-slate-100 hover:bg-slate-200'
                            }`}
                            >
                              <div className="flex items-baseline space-x-3">
                                <span className="font-medium text-slate-600 w-32 shrink-0">{pronounLabel}</span>
                                <span className="font-bold text-slate-900">{form}</span>
                              </div>
                            </button>
                        )
                    })}
                </div>
              </div>
            )
        })}
      </div>
    );
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800">
                Conjugations for <span className="text-indigo-600">{verb || '...'}</span>
                </h2>
                <p className="text-sm text-slate-500">Click a form to see examples</p>
            </div>
            {verb && (
                <button
                    onClick={onGenerateGeneralExamples}
                    className="flex-shrink-0 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-2"
                    aria-label={`Generate general examples for ${verb}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Verb Examples</span>
                </button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};