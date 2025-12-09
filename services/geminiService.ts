
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ConjugationData, Example, GrammarParagraph, GrammarTheory, WrittenDrill, VocabularyItem, FunctionalScene, FunctionalDomain, ChatMessage, ChatStreamEvent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Caching ---
const CONJUGATION_CACHE_KEY = 'portugueseConjugationCache';
const EXAMPLE_CACHE_KEY = 'portugueseExampleCache';
const VOCABULARY_CACHE_KEY = 'portugueseVocabularyCache';
const FUNCTIONAL_SCENE_CACHE_KEY = 'portugueseFunctionalSceneCache';

// Function to load cache from localStorage
const loadCache = <T>(key: string): Map<string, T> => {
    try {
        const savedCache = window.localStorage.getItem(key);
        if (savedCache) {
            const parsed = JSON.parse(savedCache);
            if (Array.isArray(parsed)) {
                return new Map(parsed);
            }
        }
    } catch (error) {
        console.error(`Error loading cache from localStorage for key "${key}":`, error);
        window.localStorage.removeItem(key);
    }
    return new Map<string, T>();
};


// Function to save cache to localStorage
const saveCache = <T>(key: string, cache: Map<string, T>) => {
    try {
        const cacheArray = Array.from(cache.entries());
        window.localStorage.setItem(key, JSON.stringify(cacheArray));
    } catch (error) {
        console.error(`Error saving cache to localStorage for key "${key}":`, error);
    }
}


const conjugationCache = loadCache<ConjugationData>(CONJUGATION_CACHE_KEY);
const exampleCache = loadCache<Example[]>(EXAMPLE_CACHE_KEY);
const vocabularyCache = loadCache<VocabularyItem[]>(VOCABULARY_CACHE_KEY);
const functionalSceneCache = loadCache<FunctionalScene>(FUNCTIONAL_SCENE_CACHE_KEY);
// -----------------

// --- Centralized API Error Handling ---
const handleApiError = (error: unknown): never => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('429') || errorMessage.includes('quota')) {
            throw new Error("API Quota Exceeded: You have run out of free daily requests. Please check your billing configuration in your Google AI project to continue using the service.");
        }
        if (errorMessage.includes('api key not valid')) {
            throw new Error("Invalid API Key: The provided API key is not valid. Please ensure it is configured correctly.");
        }
        if (errorMessage.includes('timed out')) {
            throw new Error("Request Timed Out: The request to the AI model took too long to respond. Please check your internet connection and try again.");
        }
    }
    // Fallback for other errors
    throw new Error("An unexpected error occurred with the AI model. The service may be temporarily unavailable. Please try again later.");
};
// -----------------


const verbValidationSchema = {
    type: Type.OBJECT,
    properties: {
        isValid: { 
            type: Type.BOOLEAN,
            description: "Whether the provided word is a valid infinitive verb in Brazilian Portuguese."
        },
        reason: { 
            type: Type.STRING,
            description: "A brief, user-friendly explanation in English if the word is not a valid verb (e.g., 'it is a noun', 'it is misspelled'). Is null if the verb is valid."
        },
    },
    required: ["isValid", "reason"],
};

export interface VerbValidationResult {
    isValid: boolean;
    reason: string | null;
}

const conjugationFormsSchema = {
    type: Type.OBJECT,
    properties: {
        eu: { type: Type.STRING },
        voce: { type: Type.STRING, description: "Conjugation for você/ele/ela." },
        nos: { type: Type.STRING },
        voces: { type: Type.STRING, description: "Conjugation for vocês/eles/elas." },
    },
    required: ["eu", "voce", "nos", "voces"],
};

const conjugationSchema = {
  type: Type.OBJECT,
  properties: {
    presente: { ...conjugationFormsSchema, description: "Present Indicative tense." },
    preterito_perfeito: { ...conjugationFormsSchema, description: "Preterite Perfect tense (simple past)." },
    preterito_imperfeito: { ...conjugationFormsSchema, description: "Imperfect Past tense." },
    preterito_perfeito_composto: { ...conjugationFormsSchema, description: "Present Perfect Compound tense using 'ter' (e.g., 'tenho falado')." },
    futuro_do_presente: { ...conjugationFormsSchema, description: "Simple Future tense." },
    futuro_do_preterito: { ...conjugationFormsSchema, description: "Conditional tense." },
    presente_do_subjuntivo: { ...conjugationFormsSchema, description: "Present Subjunctive tense." },
    imperfeito_do_subjuntivo: { ...conjugationFormsSchema, description: "Imperfect Subjunctive tense." },
  },
  required: [
    "presente",
    "preterito_perfeito",
    "preterito_imperfeito",
    "preterito_perfeito_composto",
    "futuro_do_presente",
    "futuro_do_preterito",
    "presente_do_subjuntivo",
    "imperfeito_do_subjuntivo"
  ],
};

const examplesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      portuguese: {
        type: Type.STRING,
        description: "The example sentence in Brazilian Portuguese.",
      },
      english: {
        type: Type.STRING,
        description: "The English translation of the sentence.",
      },
    },
    required: ["portuguese", "english"],
  },
};

const grammarParagraphSchema = {
    type: Type.OBJECT,
    properties: {
        portugueseParagraph: {
            type: Type.STRING,
            description: "A short, informal paragraph in Brazilian Portuguese about the theme, using the specified grammar topic.",
        },
        englishTranslation: {
            type: Type.STRING,
            description: "The English translation of the Portuguese paragraph.",
        },
        highlightedWords: {
            type: Type.ARRAY,
            description: "An array of the specific words or short phrases from the Portuguese paragraph that are examples of the grammar topic.",
            items: { type: Type.STRING },
        },
    },
    required: ["portugueseParagraph", "englishTranslation", "highlightedWords"],
};

const grammarTheoryExampleSchema = {
    type: Type.OBJECT,
    properties: {
        portuguese: { type: Type.STRING, description: "The example sentence in Brazilian Portuguese." },
        english: { type: Type.STRING, description: "The English translation of the sentence." },
        explanation: { type: Type.STRING, description: "Optional: A brief explanation of how the grammar topic is applied in this specific sentence." },
    },
    required: ["portuguese", "english"],
};

const grammarTheorySchema = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: "The name of the grammar topic being explained." },
        explanation: { type: Type.STRING, description: "A clear and concise explanation of the grammar topic, including its use cases, rules, and any exceptions. Formatted for readability (e.g., with newlines)." },
        examples: {
            type: Type.ARRAY,
            description: "An array of 3-4 distinct examples illustrating the grammar topic.",
            items: grammarTheoryExampleSchema,
        },
    },
    required: ["topic", "explanation", "examples"],
};

const writtenDrillSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        sentenceWithBlank: {
          type: Type.STRING,
          description: "A Portuguese sentence with '___' as a placeholder for the user to fill in.",
        },
        correctAnswer: {
          type: Type.STRING,
          description: "The exact word or words that correctly fill the blank.",
        },
        englishHint: {
          type: Type.STRING,
          description: "An English translation of the complete, correct sentence to provide context.",
        },
      },
      required: ["sentenceWithBlank", "correctAnswer", "englishHint"],
    },
  };

  const vocabularyItemSchema = {
    type: Type.OBJECT,
    properties: {
      portugueseWord: { type: Type.STRING },
      englishTranslation: { type: Type.STRING },
      wordType: { type: Type.STRING, description: "e.g., 'noun (masculine)', 'verb', 'adjective', 'phrase'" },
      exampleSentence: { type: Type.STRING, description: "A practical example sentence in Brazilian Portuguese using the word." },
      exampleTranslation: { type: Type.STRING, description: "The English translation of the example sentence." },
    },
    required: ["portugueseWord", "englishTranslation", "wordType", "exampleSentence", "exampleTranslation"],
  };
  
  const vocabularyListSchema = {
    type: Type.ARRAY,
    items: vocabularyItemSchema,
  };

  const functionalSceneSchema = {
    type: Type.OBJECT,
    properties: {
      sceneTitle: { type: Type.STRING, description: "A short, descriptive title for the situation, e.g., 'Ordering Coffee'." },
      sceneDescription: { type: Type.STRING, description: "A one-sentence description of the context for the learner." },
      phrases: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING, description: "The role of the person speaking (e.g., 'You', 'Barista', 'Waiter', 'Friend'). Keep it simple." },
            portuguese: { type: Type.STRING, description: "The phrase in Brazilian Portuguese." },
            english: { type: Type.STRING, description: "The English translation of the phrase." },
          },
          required: ["speaker", "portuguese", "english"],
        },
      },
    },
    required: ["sceneTitle", "sceneDescription", "phrases"],
  };

  const functionalSubtopicSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'A logical sub-category of the main topic. E.g., for "At the Airport", a subtopic could be "Checking In".' },
        functions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'A list of 3-5 specific, practical language functions or tasks within this subtopic. E.g., for "Checking In", functions could be "Stating your destination", "Checking luggage", "Asking for a window seat".'
        },
    },
    required: ['name', 'functions']
};

// FIX: Corrected a syntax error where 'description' was a shorthand property without a value.
const functionalDomainSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'A concise, title-cased name for the main topic provided by the user.' },
        emoji: { type: Type.STRING, description: 'A single, relevant emoji that represents the topic.' },
        subtopics: {
            type: Type.ARRAY,
            items: functionalSubtopicSchema,
            description: 'A list of 2-4 logical sub-topics related to the main topic.'
        },
    },
    required: ['name', 'emoji', 'subtopics'],
};

export const validateVerb = async (verb: string): Promise<VerbValidationResult> => {
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Is "${verb}" a valid infinitive verb in Brazilian Portuguese?`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: verbValidationSchema,
            },
        });
        const json = JSON.parse(result.text);
        return json;
    } catch (error) {
        handleApiError(error);
    }
};

export const getConjugations = async (verb: string): Promise<ConjugationData> => {
    if (conjugationCache.has(verb)) {
        return conjugationCache.get(verb)!;
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // More complex task, use pro model
            contents: `Conjugate the verb "${verb}" in Brazilian Portuguese for the following tenses: presente, pretérito perfeito, pretérito imperfeito, pretérito perfeito composto (using 'ter'), futuro do presente, futuro do pretérito, presente do subjuntivo, and imperfeito do subjuntivo. Provide conjugations for eu, você/ele/ela, nós, and vocês/eles/elas.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: conjugationSchema,
            },
        });

        const data: ConjugationData = JSON.parse(result.text);
        conjugationCache.set(verb, data);
        saveCache(CONJUGATION_CACHE_KEY, conjugationCache);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getExamples = async (verb: string, form: string, existingExamples?: Example[]): Promise<Example[]> => {
    const cacheKey = `${verb}-${form}`;
    if (!existingExamples && exampleCache.has(cacheKey)) {
        return exampleCache.get(cacheKey)!;
    }

    let prompt = `Provide 5 unique and practical example sentences in Brazilian Portuguese using the verb form "${form}" (from the verb "${verb}"). The sentences should be distinct from each other.`;
    if (existingExamples && existingExamples.length > 0) {
        const existingPortuguese = existingExamples.map(e => `"${e.portuguese}"`).join(', ');
        prompt = `Provide 5 new and unique example sentences for the verb form "${form}" that are different from these: ${existingPortuguese}.`;
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: examplesSchema,
            },
        });
        
        const data: Example[] = JSON.parse(result.text);

        if (!existingExamples) {
            exampleCache.set(cacheKey, data);
            saveCache(EXAMPLE_CACHE_KEY, exampleCache);
        }

        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getGeneralVerbExamples = async (verb: string, existingExamples?: Example[]): Promise<Example[]> => {
    let prompt = `Provide 5 unique and practical example sentences in Brazilian Portuguese using the verb "${verb}" in various common tenses. The sentences should be distinct from each other.`;
    if (existingExamples && existingExamples.length > 0) {
        const existingPortuguese = existingExamples.map(e => `"${e.portuguese}"`).join(', ');
        prompt = `Provide 5 new and unique example sentences for the verb "${verb}" that are different from these: ${existingPortuguese}. Use a variety of common tenses.`;
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: examplesSchema,
            },
        });
        
        const data: Example[] = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getSpeech = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateGrammarParagraph = async (topic: string, theme: string): Promise<GrammarParagraph> => {
    const prompt = `Create a short, informal paragraph in modern, spoken Brazilian Portuguese about the theme "${theme || 'daily life'}" that clearly demonstrates the use of the grammar topic: "${topic}". The paragraph must sound natural and reflect how people actually speak in Brazil today. Also provide an English translation and an array of the specific words/phrases that are examples of the topic.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: grammarParagraphSchema,
            },
        });
        
        const data: GrammarParagraph = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getGrammarTheory = async (topic: string): Promise<GrammarTheory> => {
    const prompt = `Explain the grammar topic "${topic}" for a student of spoken Brazilian Portuguese. The explanation must focus on how this grammar is used in everyday, informal conversation in Brazil. If there's a difference between formal/written Portuguese and common spoken usage, you must highlight it. For example, for compound tenses, explain that the simple past is often preferred in speech for completed actions. All example sentences must be natural and reflect modern, spoken Brazilian Portuguese. Provide a clear explanation with rules and use cases, and give 3-4 distinct example sentences with English translations. Format the explanation for readability, using double asterisks for bolding key terms.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Theory needs more reasoning
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: grammarTheorySchema,
            },
        });
        
        const data: GrammarTheory = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateWrittenDrills = async (topic: string, count: number): Promise<WrittenDrill[]> => {
    const prompt = `Create ${count} written drill exercises for the grammar topic "${topic}". Each exercise must use natural, common, spoken Brazilian Portuguese. Each exercise should be a sentence with a blank '___', the correct answer for the blank, and an English hint (the full translated sentence). The drills should be varied and reflect everyday conversation.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: writtenDrillSchema,
            },
        });
        
        const data: WrittenDrill[] = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getVocabularyForCategory = async (category: string, existingWords?: VocabularyItem[], wordsToExclude?: string[]): Promise<VocabularyItem[]> => {
    const cacheKey = category;
    if (!existingWords && !wordsToExclude && vocabularyCache.has(cacheKey)) {
        return vocabularyCache.get(cacheKey)!;
    }

    let prompt = `Generate a list of 10 useful vocabulary items (words or short phrases) in Brazilian Portuguese for the category "${category}". For each item, provide the Portuguese word, its English translation, the word type (e.g., noun, verb), a practical example sentence in Portuguese, and the English translation of the example.`;
    
    const exclusions = new Set(wordsToExclude || []);
    if (existingWords) {
        existingWords.forEach(w => exclusions.add(w.portugueseWord));
    }
    
    if (exclusions.size > 0) {
        const exclusionList = Array.from(exclusions).join(', ');
        prompt += `\n\nIMPORTANT: Do not include any of the following words in your response: ${exclusionList}.`;
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: vocabularyListSchema,
            },
        });
        
        const data: VocabularyItem[] = JSON.parse(result.text);

        if (!existingWords && !wordsToExclude) {
            vocabularyCache.set(cacheKey, data);
            saveCache(VOCABULARY_CACHE_KEY, vocabularyCache);
        }

        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateGrammarExamplesBatch = async (topic: string, count: number, existingExamples?: Example[]): Promise<Example[]> => {
    let prompt = `Generate ${count} distinct example sentences in modern, spoken Brazilian Portuguese that clearly demonstrate the grammar topic: "${topic}". The sentences must sound natural and reflect how people actually talk in Brazil, avoiding overly formal or literary constructions. Provide an English translation for each sentence.`;
    if (existingExamples && existingExamples.length > 0) {
        const existingPortuguese = existingExamples.map(e => `"${e.portuguese}"`).join(', ');
        prompt += `\n\nThe new sentences must be different from these: ${existingPortuguese}.`;
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: examplesSchema,
            },
        });
        
        const data: Example[] = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const getFunctionalScene = async (domain: string, subtopic: string, func: string, existingScene?: FunctionalScene): Promise<FunctionalScene> => {
    const cacheKey = `${domain}-${subtopic}-${func}`;
    if (!existingScene && functionalSceneCache.has(cacheKey)) {
        return functionalSceneCache.get(cacheKey)!;
    }

    let prompt = `Create a short, practical conversation or scene in Brazilian Portuguese that demonstrates the language function: "${func}". This function belongs to the subtopic "${subtopic}" and the main domain "${domain}". The scene should include 4-6 phrases, alternating between simple speaker roles (e.g., 'You', 'Waiter'). Provide a simple title and one-sentence description for the scene.`;
    if (existingScene) {
        prompt = `Generate a new, different scene for the language function "${func}" within the topic "${subtopic}". The new scene should be distinct from a previous one which had the title "${existingScene.sceneTitle}".`;
    }
    
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: functionalSceneSchema,
            },
        });
        
        const data: FunctionalScene = JSON.parse(result.text);

        if (!existingScene) {
            functionalSceneCache.set(cacheKey, data);
            saveCache(FUNCTIONAL_SCENE_CACHE_KEY, functionalSceneCache);
        }

        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const generateFunctionalDomain = async (topic: string): Promise<Omit<FunctionalDomain, 'id' | 'isCustom'>> => {
    const prompt = `Analyze the user-provided topic "${topic}" and structure it as a functional language domain. Create a concise name, a single relevant emoji, and 2-4 logical subtopics. For each subtopic, provide a name and a list of 3-5 specific, practical language functions.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: functionalDomainSchema,
            },
        });
        
        const data: Omit<FunctionalDomain, 'id' | 'isCustom'> = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export const startChat = async (topic: string): Promise<Omit<ChatMessage, 'id' | 'sender'>> => {
    const systemInstruction = `You are a friendly and patient Portuguese language tutor. You are starting a conversation with a student about the topic: "${topic}". Your goal is to help them practice. Start with a simple opening question or statement in Portuguese to begin the conversation. Keep your responses relatively short. Also provide an English translation of your response.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Start the conversation.',
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        portuguese: { type: Type.STRING },
                        english: { type: Type.STRING },
                    },
                    required: ['portuguese', 'english'],
                },
            },
        });
        
        const data: Omit<ChatMessage, 'id' | 'sender'> = JSON.parse(result.text);
        return data;
    } catch (error) {
        handleApiError(error);
    }
};

export async function* getChatResponseStream(
    history: ChatMessage[],
    userMessage: string
): AsyncGenerator<ChatStreamEvent> {
    const systemInstruction = `You are a friendly and patient Portuguese language tutor. Your goal is to help the user practice Portuguese.
1. First, analyze the user's last message ("${userMessage}"). If it contains grammatical errors, provide a correction. If it's correct, the correction is null.
2. Then, provide a natural, conversational response in Portuguese.
3. Finally, provide the English translation of your Portuguese response.
Your entire output MUST be a single JSON object with three keys: "correction" (object with "portuguese" and "english" strings, or null), "portugueseResponse" (string), and "englishTranslation" (string).
Do not add any text outside of this JSON object.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.portuguese }],
    }));

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correction: {
                            type: Type.OBJECT,
                            nullable: true,
                            properties: {
                                portuguese: { type: Type.STRING },
                                english: { type: Type.STRING },
                            },
                            required: ['portuguese', 'english'],
                        },
                        portugueseResponse: { type: Type.STRING },
                        englishTranslation: { type: Type.STRING },
                    },
                    required: ['correction', 'portugueseResponse', 'englishTranslation'],
                }
            },
        });

        const responseJson = JSON.parse(result.text);

        const { correction, portugueseResponse, englishTranslation } = responseJson;

        yield { type: 'correction', correction: correction || null };

        const chunks = portugueseResponse.match(/.{1,10}/g) || [portugueseResponse];
        for (const chunk of chunks) {
            await new Promise(res => setTimeout(res, 50));
            yield { type: 'portuguese_chunk', chunk };
        }

        yield { type: 'english_translation', english: englishTranslation };

    } catch (error) {
        handleApiError(error);
    }
}

export const getSuggestedResponse = async (history: ChatMessage[]): Promise<{ portuguese: string }> => {
    const systemInstruction = `You are an AI assistant helping a Portuguese learner. Based on the conversation history, suggest a logical, simple, and relevant response that the user could say next. The suggestion should be in Portuguese.`;
    
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.portuguese }],
    }));

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [...contents, { role: 'user', parts: [{ text: 'What could I say next?' }] }],
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        portuguese: { type: Type.STRING, description: 'A suggested response in Portuguese.' },
                    },
                    required: ['portuguese'],
                },
            },
        });
        
        const data: { portuguese: string } = JSON.parse(result.text);
        data.portuguese = data.portuguese.replace(/^"|"$/g, '');
        return data;
    } catch (error) {
        handleApiError(error);
    }
};
