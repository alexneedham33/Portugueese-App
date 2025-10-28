import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ConjugationData, Example, GrammarParagraph, GrammarTheory, WrittenDrill, VocabularyItem, FunctionalScene, FunctionalDomain } from '../types';

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

const functionalDomainSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'A concise, title-cased name for the main topic provided by the user.' },
        emoji: { type: Type.STRING, description: 'A single, relevant emoji that represents the topic.' },
        subtopics: {
            type: Type.ARRAY,
            items: functionalSubtopicSchema,
            description: 'An array of 3-5 distinct subtopics that break down the main topic into smaller, manageable parts.'
        }
    },
    required: ['name', 'emoji', 'subtopics']
};

export const validateVerb = async (verb: string): Promise<VerbValidationResult> => {
    const prompt = `Is the word "${verb}" a valid infinitive verb in Brazilian Portuguese? Please provide a user-friendly reason if it is not.`;
  
    try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: verbValidationSchema,
            temperature: 0,
          },
        });
      
        const jsonString = response.text.trim();
        const data = JSON.parse(jsonString);
        return { isValid: data.isValid, reason: data.reason };
    } catch (error) {
      console.error(`Error validating verb '${verb}':`, error);
      return { isValid: false, reason: "Could not verify the verb at this time. Please try again." };
    }
  };

export const getConjugations = async (verb: string): Promise<ConjugationData> => {
  if (conjugationCache.has(verb)) {
    return conjugationCache.get(verb)!;
  }

  const prompt = `Generate the main conjugations for the Brazilian Portuguese verb '${verb}'. Include: Presente, Pretérito Perfeito, Pretérito Imperfeito, Pretérito Perfeito Composto (using the verb 'ter'), Futuro do Presente, Futuro do Pretérito, Presente do Subjuntivo, and Imperfeito do Subjuntivo. For each tense, provide the forms for 'eu', 'você/ele/ela', 'nós', and 'vocês/eles/elas'.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: conjugationSchema,
      temperature: 0.2,
    },
  });

  const jsonString = response.text.trim();
  const data = JSON.parse(jsonString) as ConjugationData;
  conjugationCache.set(verb, data); // Cache the result in memory
  saveCache(CONJUGATION_CACHE_KEY, conjugationCache); // Persist the updated cache to localStorage
  return data;
};

export const getExamples = async (verb: string, conjugatedForm: string, existingExamples?: Example[]): Promise<Example[]> => {
  const cacheKey = `${verb}:${conjugatedForm}`;
  // Only use cache for the initial fetch (no existing examples provided)
  if (!existingExamples && exampleCache.has(cacheKey)) {
    return exampleCache.get(cacheKey)!;
  }

  let prompt = `Provide 5 example sentences in Brazilian Portuguese using the verb '${verb}' in the form '${conjugatedForm}'. Ensure the sentences have a mix of difficulty, from simple to more complex. Also, showcase different meanings or use cases of the verb where applicable. For each sentence, also provide the English translation.`;

  if (existingExamples && existingExamples.length > 0) {
    const existingPortugueseSentences = existingExamples.map(ex => ex.portuguese);
    prompt = `Provide 5 new and different example sentences in Brazilian Portuguese using the verb '${verb}' in the form '${conjugatedForm}'. Ensure the sentences have a mix of difficulty, from simple to more complex. Also, showcase different meanings or use cases of the verb where applicable. For each sentence, also provide the English translation. Do not repeat any of the following sentences: ${JSON.stringify(existingPortugueseSentences)}`;
  }
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: examplesSchema,
    },
  });

  const jsonString = response.text.trim();
  const data = JSON.parse(jsonString) as Example[];
  
  // Cache the result only on the initial fetch
  if (!existingExamples) {
    exampleCache.set(cacheKey, data);
    saveCache(EXAMPLE_CACHE_KEY, exampleCache);
  }
  
  return data;
};

export const getGeneralVerbExamples = async (verb: string, existingExamples?: Example[]): Promise<Example[]> => {
  const cacheKey = `${verb}:general`;
  if (!existingExamples && exampleCache.has(cacheKey)) {
      return exampleCache.get(cacheKey)!;
  }

  let prompt = `Provide 5 diverse example sentences for the Brazilian Portuguese verb '${verb}'. The examples should cover a range of common tenses (like present, past, and future) and subjects (like 'eu', 'você', 'nós'). For each sentence, also provide the English translation.`;

  if (existingExamples && existingExamples.length > 0) {
    const existingPortugueseSentences = existingExamples.map(ex => ex.portuguese);
    prompt = `Provide 5 new and different diverse example sentences for the Brazilian Portuguese verb '${verb}'. The examples should cover a range of common tenses (like present, past, and future) and subjects. For each sentence, also provide the English translation. Do not repeat any of the following sentences: ${JSON.stringify(existingPortugueseSentences)}`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: examplesSchema,
    },
  });

  const jsonString = response.text.trim();
  const data = JSON.parse(jsonString) as Example[];
  
  // Cache the result only on the initial fetch
  if (!existingExamples) {
    exampleCache.set(cacheKey, data);
    saveCache(EXAMPLE_CACHE_KEY, exampleCache);
  }
  return data;
}

export const generateGrammarParagraph = async (topic: string, theme: string): Promise<GrammarParagraph> => {
    const prompt = `
      You are an expert in teaching Brazilian Portuguese.
      Your goal is to create a short, natural, and informal paragraph that helps a learner understand a specific grammar point.

      Grammar Topic: ${topic}
      Theme: ${theme || 'a daily life situation'}

      Instructions:
      1. Write a short paragraph (3-5 sentences) in modern, informal Brazilian Portuguese.
      2. The paragraph should be about the provided theme.
      3. The paragraph MUST prominently feature several examples of the specified grammar topic.
      4. Provide a clear English translation.
      5. Identify the exact words or short phrases in your Portuguese paragraph that are examples of the grammar topic.

      For example, if the topic is "Present Subjunctive" and theme is "planning a party", the paragraph might be "Espero que você venha para a minha festa. Tomara que faça sol..." and the highlighted words would be ["venha", "faça"].
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: grammarParagraphSchema,
            temperature: 0.7,
        },
    });

    const jsonString = response.text.trim();
    const data = JSON.parse(jsonString);

    return data as GrammarParagraph;
};

export const getGrammarTheory = async (topicName: string): Promise<GrammarTheory> => {
    const prompt = `
      You are an expert Portuguese language teacher. Your task is to provide a clear and concise explanation of a specific grammar topic for an intermediate learner, formatted in JSON.

      Grammar Topic: "${topicName}"

      Instructions:
      1. Your response MUST be a JSON object that adheres to the provided schema.
      2. Provide a main 'explanation' of the topic. Explain what it is, when to use it, and any important rules or exceptions. Keep it clear and easy to understand. Use \\n for newlines to create paragraphs.
      3. Provide at least 3-4 distinct 'examples'.
      4. For each example, provide the 'portuguese' sentence, the 'english' translation, and an optional brief 'explanation' of how the grammar topic is applied in that specific sentence.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: grammarTheorySchema,
            temperature: 0.3,
        },
    });

    const jsonString = response.text.trim();
    const data = JSON.parse(jsonString);

    return data as GrammarTheory;
};

export const generateGrammarExamplesBatch = async (topic: string, count: number, existingExamples?: Example[]): Promise<Example[]> => {
    const existingEnglishSentences = existingExamples?.map(ex => ex.english) || [];
    const prompt = `
      You are a language teacher creating practice exercises for a student learning Brazilian Portuguese.
      Your task is to generate ${count} new and unique practice sentence pairs.

      Grammar Topic to Test: "${topic}"

      Instructions:
      1. For each pair, create an English sentence for the student to translate. This sentence MUST require them to use the "${topic}" grammar concept in their Portuguese translation.
      2. Provide the correct and natural Brazilian Portuguese translation for that English sentence.
      3. IMPORTANT: Ensure a mix of simple, intermediate, and complex sentence structures. Vary the vocabulary, common verb tenses (if appropriate for the topic), and sentence complexity. Do not just provide easy sentences.
      4. Ensure all ${count} examples are different from each other.
      ${existingEnglishSentences.length > 0 ? `\n\nDo not repeat any of the following English sentences: ${JSON.stringify(existingEnglishSentences)}` : ''}
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: examplesSchema, // Re-use the existing schema for an array of examples
            temperature: 0.8, // Increased temperature for more creativity/variety
        },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as Example[];
};

export const generateWrittenDrills = async (topic: string, count: number): Promise<WrittenDrill[]> => {
    const prompt = `
      You are a language teacher creating written exercises for a student learning Brazilian Portuguese.
      Your task is to generate ${count} unique sentences that test a specific grammar point. Each sentence must have a blank space ('___') where the student needs to fill in the correct word or phrase.

      Grammar Topic to Test: "${topic}"

      Instructions:
      1. Create ${count} distinct exercises. Your response MUST be an array of ${count} items.
      2. For each exercise, provide:
         a) 'sentenceWithBlank': The Portuguese sentence with '___' as a placeholder. The placeholder must be exactly three underscores.
         b) 'correctAnswer': The exact word(s) that correctly fill the blank. This should be just the answer, not the full sentence.
         c) 'englishHint': A simple English translation of the complete, correct sentence to provide context.
      3. The difficulty should be intermediate. Vary verbs, vocabulary, and sentence structure.
      4. The blank should ideally contain just one or two words.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro", // Using a more powerful model for better instruction following
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: writtenDrillSchema,
            temperature: 0.7,
        },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as WrittenDrill[];
};

export const getVocabularyForCategory = async (category: string, existingWords?: VocabularyItem[], wordsToExclude?: string[]): Promise<VocabularyItem[]> => {
    // If we have words to exclude, we must bypass the generic cache because the result will be different.
    if (!existingWords && !wordsToExclude && vocabularyCache.has(category)) {
        return vocabularyCache.get(category)!;
    }

    const basePrompt = `
      You are a Brazilian Portuguese language expert creating a vocabulary list for a student.
      Your task is to generate a list of 15-20 essential and practical vocabulary items for a specific category.

      Category: "${category}"

      Instructions:
      1. Generate a diverse list of words and short phrases, including nouns, verbs, and adjectives where appropriate.
      2. For each item, you MUST provide:
         a) 'portugueseWord': The word or phrase in Portuguese.
         b) 'englishTranslation': The English equivalent.
         c) 'wordType': The grammatical type (e.g., "noun (masculine)", "noun (feminine)", "verb", "adjective", "phrase"). Be specific about noun gender.
         d) 'exampleSentence': A natural, practical example sentence in Brazilian Portuguese that shows how the word is used.
         e) 'exampleTranslation': The English translation of the example sentence.
      3. The response must be a JSON array that adheres to the provided schema.
    `;

    let prompt: string;
    const allExcludedWords = new Set<string>();

    if (existingWords && existingWords.length > 0) {
        existingWords.forEach(item => allExcludedWords.add(item.portugueseWord));
    }
    if (wordsToExclude && wordsToExclude.length > 0) {
        wordsToExclude.forEach(word => allExcludedWords.add(word));
    }

    if (allExcludedWords.size > 0) {
        const exclusionList = Array.from(allExcludedWords);
        prompt = `${basePrompt}\n4. IMPORTANT: Provide a completely new set of words. Do not repeat any of the following words: ${JSON.stringify(exclusionList)}.`;
    } else {
        prompt = basePrompt;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: vocabularyListSchema,
            temperature: 0.6,
        },
    });
    
    const jsonString = response.text.trim();
    const data = JSON.parse(jsonString) as VocabularyItem[];
    
    // Cache the result only on the initial fetch if there are no exclusions
    if (!existingWords && !wordsToExclude) {
        vocabularyCache.set(category, data);
        saveCache(VOCABULARY_CACHE_KEY, vocabularyCache);
    }
    return data;
};

export const getFunctionalScene = async (domain: string, subtopic: string, functionName: string, existingScene?: FunctionalScene): Promise<FunctionalScene> => {
    // Use a distinct cache key for custom, user-generated topics.
    const isCustom = domain === 'Custom';
    const cacheKey = isCustom ? `custom:${functionName}` : `${domain}:${subtopic}:${functionName}`;
    
    // If we are regenerating (existingScene is provided), bypass the cache.
    if (!existingScene && functionalSceneCache.has(cacheKey)) {
        return functionalSceneCache.get(cacheKey)!;
    }

    let basePrompt: string;

    if (isCustom) {
        // Prompt for generating a scene from a user's freeform query.
        basePrompt = `
            You are a Brazilian Portuguese language expert creating a micro-lesson for a language learner.
            Your task is to generate a short, realistic conversation scene or a pack of practical phrases based on a user-described situation.

            Situation: "${functionName}"

            Instructions:
            1. Create a JSON object that represents this scene.
            2. The 'sceneTitle' should be a concise, catchy summary of the situation (e.g., if the user wrote "at a party", a good title is "Making Small Talk at a Party").
            3. The 'sceneDescription' should be a one-sentence context for the learner.
            4. Provide a 'phrases' array containing 8-12 conversational turns.
            5. For each phrase, specify the 'speaker', 'portuguese' phrase, and 'english' translation.
            6. The dialogue should be natural, modern, and reflect informal Brazilian Portuguese.
        `;
    } else {
        // Original prompt for predefined topics.
        basePrompt = `
            You are a Brazilian Portuguese language expert creating a micro-lesson for a language learner.
            Your task is to generate a short, realistic conversation scene or a pack of practical phrases for a specific situation.

            Domain: "${domain}"
            Subtopic: "${subtopic}"
            Language Function: "${functionName}"

            Instructions:
            1. Create a JSON object that represents this scene.
            2. Give it a 'sceneTitle' that summarizes the situation (e.g., "Booking a Table").
            3. Write a brief 'sceneDescription' to set the context for the learner.
            4. Provide a 'phrases' array containing 8-12 conversational turns.
            5. For each phrase, specify the 'speaker' (e.g., 'You', 'Receptionist', 'Waiter'), the 'portuguese' phrase, and its 'english' translation.
            6. The dialogue should be natural, modern, and reflect informal Brazilian Portuguese.
            7. Ensure the phrases directly relate to the specified Language Function.
        `;
    }
    
    const regenerationPrompt = existingScene
        ? `\n\nIMPORTANT: You are generating a new version of an existing scene for a user who wants more variety. Please provide a significantly different scenario, context, or set of phrases. The previous scene was titled "${existingScene.sceneTitle}" and described as "${existingScene.sceneDescription}". Please generate a fresh take on the topic and avoid reusing phrases from the previous version.`
        : '';
    
    const prompt = basePrompt + regenerationPrompt;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: functionalSceneSchema,
            temperature: 0.8, // Slightly higher temperature for more variety on regeneration
        },
    });

    const jsonString = response.text.trim();
    const data = JSON.parse(jsonString) as FunctionalScene;

    // Only cache the result on the initial fetch (no existing scene provided)
    if (!existingScene) {
        functionalSceneCache.set(cacheKey, data);
        saveCache(FUNCTIONAL_SCENE_CACHE_KEY, functionalSceneCache);
    }

    return data;
};


export const generateFunctionalDomain = async (topic: string): Promise<Omit<FunctionalDomain, 'id' | 'isCustom'>> => {
    const prompt = `
        You are a language curriculum designer. Your task is to take a user-provided topic and break it down into a structured, practical learning module for Brazilian Portuguese.

        User Topic: "${topic}"

        Instructions:
        1.  Generate a concise, title-cased 'name' for the topic.
        2.  Choose a single, relevant 'emoji' that visually represents the topic.
        3.  Create an array of 3 to 5 logical 'subtopics'. Each subtopic should represent a key stage or aspect of the main topic.
        4.  For each subtopic, list 3 to 5 practical 'functions'. A function is a specific action or phrase a learner would need to use (e.g., "Asking for the price", "Making a reservation").
        5.  The entire output MUST be a valid JSON object adhering to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: functionalDomainSchema,
            temperature: 0.5,
        },
    });

    const jsonString = response.text.trim();
    // The type assertion is safe here because the schema ensures the structure.
    return JSON.parse(jsonString) as Omit<FunctionalDomain, 'id' | 'isCustom'>;
};


export const getSpeech = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `"${text}"` }] }], // Wrap in quotes for more natural TTS pausing
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A clear, standard voice
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from API.");
    }
    return base64Audio;
};

export const getPronunciationFeedback = async (originalSentence: string, userAttempt: string): Promise<string> => {
    const prompt = `
      You are a Brazilian Portuguese pronunciation coach providing feedback to a language learner.
      The student was asked to say: "${originalSentence}"
      The student said: "${userAttempt}"

      Your task is to provide brief, encouraging, and constructive feedback in English.
      - If the attempt is perfect or very close, praise them (e.g., "Excellent! That's perfect.").
      - If there are minor errors, gently point out one key thing to improve (e.g., "Very close! Try to make the 'o' sound in 'fogo' a bit more open.").
      - If the attempt is very different, be encouraging and highlight the most important word to focus on.
      - Keep the feedback concise (1-2 sentences) and easy for a learner to understand.
      - Do not just say "Correct" or "Incorrect". Provide actionable advice.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            temperature: 0.4,
        }
    });

    return response.text;
};
