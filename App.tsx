import React, { useState, useEffect, useCallback } from 'react';
import { VerbList } from './components/VerbList';
import { ConjugationDisplay } from './components/ConjugationDisplay';
import { ExampleSentences } from './components/ExampleSentences';
import { getConjugations, getExamples, validateVerb, getGeneralVerbExamples } from './services/geminiService';
import { INITIAL_VERBS } from './constants';
import type { ConjugationData, Example, SelectedConjugation } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GrammarExplorer } from './components/GrammarExplorer';
import { VocabularyExplorer } from './components/VocabularyExplorer';
import { FunctionalLanguageExplorer } from './components/FunctionalLanguageExplorer';

const VERBS_STORAGE_KEY = 'portugueseVerbs';

const App: React.FC = () => {
  const [verbs, setVerbs] = useState<string[]>(() => {
    try {
      const savedVerbs = window.localStorage.getItem(VERBS_STORAGE_KEY);
      if (savedVerbs) {
        const parsed = JSON.parse(savedVerbs);
        // Basic validation to ensure we're loading a string array
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error reading verbs from localStorage:", error);
    }
    // Fallback to initial verbs if nothing is saved or data is corrupt
    return INITIAL_VERBS;
  });

  const [activeView, setActiveView] = useState<'conjugator' | 'grammar' | 'vocabulary' | 'functional'>('conjugator');
  const [selectedVerb, setSelectedVerb] = useState<string | null>(verbs[0] || null);
  const [conjugations, setConjugations] = useState<ConjugationData | null>(null);
  const [selectedConjugation, setSelectedConjugation] = useState<SelectedConjugation | null>(null);
  const [examples, setExamples] = useState<Example[] | null>(null);

  const [isLoadingConjugations, setIsLoadingConjugations] = useState<boolean>(true);
  const [isLoadingExamples, setIsLoadingExamples] = useState<boolean>(false);
  const [isGeneratingMoreExamples, setIsGeneratingMoreExamples] = useState<boolean>(false);
  
  const [conjugationError, setConjugationError] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);
  
  const [isAddingVerb, setIsAddingVerb] = useState<boolean>(false);
  const [addVerbError, setAddVerbError] = useState<string | null>(null);

  // Effect to save verbs to localStorage whenever the list changes
  useEffect(() => {
    try {
      window.localStorage.setItem(VERBS_STORAGE_KEY, JSON.stringify(verbs));
    } catch (error) {
      console.error("Error saving verbs to localStorage:", error);
    }
  }, [verbs]);

  // On initial load, prefetch conjugations for ALL initial verbs to make navigation instant.
  useEffect(() => {
    const prefetchInitialVerbs = () => {
      // The first verb (verbs[0]) is already being fetched by the main useEffect [selectedVerb].
      // We prefetch the REST of the list in the background. The geminiService will check
      // localStorage and the in-memory cache first, so this only fetches verbs not
      // seen in a previous session. This makes first-time navigation instant.
      const verbsToPrefetch = verbs.slice(1);
      
      console.log('Prefetching all remaining verbs:', verbsToPrefetch);
      
      verbsToPrefetch.forEach(verb => {
        getConjugations(verb).catch(error => {
          // This is a background task, so we just log the warning.
          // The user can still click the verb to trigger a manual fetch if needed.
          console.warn(`Initial prefetch failed for "${verb}":`, error);
        });
      });
    };

    // Delay prefetching slightly to not interfere with the main thread during initial render.
    const timerId = setTimeout(prefetchInitialVerbs, 1500);

    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchConjugations = useCallback(async (verb: string) => {
    setIsLoadingConjugations(true);
    setConjugations(null);
    setSelectedConjugation(null);
    setExamples(null);
    setConjugationError(null);
    setExampleError(null);

    try {
      const data = await getConjugations(verb);
      setConjugations(data);
    } catch (error) {
      console.error("Error fetching conjugations:", error);
      setConjugationError("Failed to load conjugations. The AI model might be busy. Please try again.");
    } finally {
      setIsLoadingConjugations(false);
    }
  }, []);

  useEffect(() => {
    if (selectedVerb && activeView === 'conjugator') {
      fetchConjugations(selectedVerb);
    } else {
      // Handle case where there are no verbs at all
      setIsLoadingConjugations(false);
      setConjugations(null);
      setExamples(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVerb, activeView]);

  const handleVerbSelect = (verb: string) => {
    setSelectedVerb(verb);

    // --- Predictive Prefetching ---
    // When a user selects a verb, prefetch the next couple in the list
    // to make navigation feel faster. The `getConjugations` service will
    // cache the results, making the next selection instant.
    const currentIndex = verbs.findIndex(v => v === verb);
    if (currentIndex > -1) {
      const nextVerbsToPrefetch = verbs.slice(currentIndex + 1, currentIndex + 3); // Get the next two
      nextVerbsToPrefetch.forEach(nextVerb => {
        getConjugations(nextVerb).catch(error => {
          console.warn(`Predictive prefetch failed for "${nextVerb}":`, error);
        });
      });
    }
  };

  const handleAddVerb = async (verbToAdd: string): Promise<boolean> => {
    setIsAddingVerb(true);
    setAddVerbError(null);
    const formattedVerb = verbToAdd.charAt(0).toUpperCase() + verbToAdd.slice(1).toLowerCase();
    
    if (verbs.some(v => v.toLowerCase() === formattedVerb.toLowerCase())) {
        setAddVerbError(`"${formattedVerb}" is already in the list.`);
        setIsAddingVerb(false);
        return false;
    }

    try {
        const validation = await validateVerb(formattedVerb);

        if (validation.isValid) {
            const newVerbs = [formattedVerb, ...verbs];
            setVerbs(newVerbs); // This will trigger the useEffect to save to localStorage
            setSelectedVerb(formattedVerb);
            setIsAddingVerb(false);
            return true;
        } else {
            setAddVerbError(validation.reason || `"${formattedVerb}" is not a valid verb.`);
            setIsAddingVerb(false);
            return false;
        }
    } catch (error) {
        console.error("Error in handleAddVerb:", error);
        setAddVerbError("An unexpected error occurred while adding the verb.");
        setIsAddingVerb(false);
        return false;
    }
  };

  const handleConjugationSelect = async (conjugation: SelectedConjugation) => {
    if (selectedConjugation?.tense === conjugation.tense && selectedConjugation?.pronoun === conjugation.pronoun) {
      // Deselect if clicking the same one again
      setSelectedConjugation(null);
      setExamples(null);
      return;
    }

    setSelectedConjugation(conjugation);
    setIsLoadingExamples(true);
    setExamples(null);
    setExampleError(null);

    try {
      const exampleData = await getExamples(conjugation.verb, conjugation.form);
      setExamples(exampleData);
    } catch (error) {
      console.error("Error fetching examples:", error);
      setExampleError("Failed to load examples. The AI model might be busy. Please try again.");
    } finally {
      setIsLoadingExamples(false);
    }
  };

  const handleGenerateGeneralExamples = async () => {
    if (!selectedVerb) return;

    setSelectedConjugation(null); // Deselect specific conjugation
    setIsLoadingExamples(true);
    setExamples(null);
    setExampleError(null);

    try {
      const exampleData = await getGeneralVerbExamples(selectedVerb);
      setExamples(exampleData);
    } catch (error) {
      console.error("Error fetching general examples:", error);
      setExampleError("Failed to load general examples. The AI model might be busy. Please try again.");
    } finally {
      setIsLoadingExamples(false);
    }
  };

  const handleGenerateMoreExamples = async () => {
    if (!examples || !selectedVerb) return;

    setIsGeneratingMoreExamples(true);
    setExampleError(null); // Clear previous error on new attempt

    try {
      let newExamples: Example[];
      if (selectedConjugation) {
        // Mode: specific conjugation examples
        newExamples = await getExamples(selectedConjugation.verb, selectedConjugation.form, examples);
      } else {
        // Mode: general verb examples
        newExamples = await getGeneralVerbExamples(selectedVerb, examples);
      }
      setExamples(newExamples); // Replace existing examples
    } catch (error) {
      console.error("Error fetching more examples:", error);
      setExampleError("Failed to load more examples. Please try again.");
    } finally {
      setIsGeneratingMoreExamples(false);
    }
  };

  const renderActiveView = () => {
    switch(activeView) {
      case 'conjugator':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-3">
              <VerbList 
                verbs={verbs} 
                selectedVerb={selectedVerb} 
                onSelectVerb={handleVerbSelect}
                onAddVerb={handleAddVerb}
                isAdding={isAddingVerb}
                addError={addVerbError}
                onClearAddError={() => setAddVerbError(null)}
              />
            </div>
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
              <div className="md:col-span-3">
                <ConjugationDisplay
                  verb={selectedVerb}
                  conjugations={conjugations}
                  isLoading={isLoadingConjugations}
                  error={conjugationError}
                  selectedConjugation={selectedConjugation}
                  onSelectConjugation={handleConjugationSelect}
                  onGenerateGeneralExamples={handleGenerateGeneralExamples}
                />
              </div>
              <div className="md:col-span-2">
                <ExampleSentences
                  examples={examples}
                  isLoading={isLoadingExamples}
                  error={exampleError}
                  selectedConjugation={selectedConjugation}
                  selectedVerb={selectedVerb}
                  isGeneratingMore={isGeneratingMoreExamples}
                  onGenerateMore={handleGenerateMoreExamples}
                />
              </div>
            </div>
          </div>
        );
      case 'grammar':
        return <GrammarExplorer />;
      case 'vocabulary':
        return <VocabularyExplorer />;
      case 'functional':
        return <FunctionalLanguageExplorer />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        {renderActiveView()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
