export interface ConjugationForms {
  eu: string;
  voce: string;
  nos: string;
  voces: string;
}

export interface ConjugationData {
  presente: ConjugationForms;
  preterito_perfeito: ConjugationForms;
  preterito_imperfeito: ConjugationForms;
  preterito_perfeito_composto: ConjugationForms;
  futuro_do_presente: ConjugationForms;
  futuro_do_preterito: ConjugationForms;
  presente_do_subjuntivo: ConjugationForms;
  imperfeito_do_subjuntivo: ConjugationForms;
}

export interface Example {
  portuguese: string;
  english: string;
}

export interface SelectedConjugation {
  verb: string;
  form: string;
  tense: string;
  pronoun: string;
}

export interface GrammarParagraph {
  portugueseParagraph: string;
  englishTranslation: string;
  highlightedWords: string[];
}

export interface GrammarTheoryExample {
  portuguese: string;
  english: string;
  explanation?: string;
}

export interface GrammarTheory {
  topic: string;
  explanation: string;
  examples: GrammarTheoryExample[];
}

export interface WrittenDrill {
  sentenceWithBlank: string;
  correctAnswer: string;
  englishHint: string;
}

export interface VocabularyItem {
  portugueseWord: string;
  englishTranslation: string;
  wordType: string; // e.g., "noun (masculine)", "verb", "adjective"
  exampleSentence: string;
  exampleTranslation: string;
}

export interface FunctionalPhrase {
  portuguese: string;
  english: string;
  speaker?: string;
}

export interface FunctionalScene {
  sceneTitle: string;
  sceneDescription: string;
  phrases: FunctionalPhrase[];
}

// --- New Types for Structured Functional Language ---

export interface FunctionalSubtopic {
  name: string;
  functions: string[];
}

export interface FunctionalDomain {
  id: string; 
  name: string;
  emoji: string;
  subtopics: FunctionalSubtopic[];
  isCustom?: boolean;
}
