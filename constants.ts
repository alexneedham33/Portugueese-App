import type { FunctionalDomain } from './types';

export const INITIAL_VERBS: string[] = [
  "Ser",       // To be (permanent)
  "Estar",     // To be (temporary)
  "Ter",       // To have
  "Haver",     // To have (auxiliary)
  "Ir",        // To go
  "Vir",       // To come
  "Fazer",     // To do/make
  "Dizer",     // To say
  "Poder",     // To be able to (can)
  "Saber",     // To know
  "Querer",    // To want
  "Dever",     // To must / to owe
  "Pôr",       // To put
  "Trazer",    // To bring
  "Ver",       // To see
  "Dar",       // To give
  "Falar",     // To speak
  "Amar",      // To love
  "Comer",     // To eat
  "Viver",     // To live
  "Partir",    // To leave
  "Abrir",     // To open
  "Fechar",    // To close
  "Pedir",     // To ask for
  "Ouvir",     // To hear
  "Ler",       // To read
  "Escrever",  // To write
  "Dormir",    // To sleep
  "Sentir",    // To feel
  "Ficar",     // To stay/become
  "Trabalhar", // To work
  "Estudar",   // To study
  "Pensar",    // To think
  "Achar",     // To find/think
  "Começar",   // To start
  "Entender",  // To understand
  "Conhecer",  // To know (people/places)
  "Jogar",     // To play
  "Correr",    // To run
  "Andar",     // To walk
  "Voltar",    // To return
  "Gostar",    // To like
  "Ajudar",    // To help
  "Mudar",     // To change
  "Perder",    // To lose
  "Encontrar", // To find/meet
  "Lembrar",   // To remember
  "Esquecer",  // To forget
  "Tentar",    // To try
  "Usar",      // To use
];

export const GRAMMAR_TOPIC_GROUPS = [
    {
        level: 'Foundations',
        topics: [
            { id: 'ser_vs_estar', name: 'Ser vs. Estar', description: 'The fundamental differences between the two "to be" verbs.', example: { pt: 'Ela é professora. / Ela está cansada.', en: 'She is a teacher. / She is tired.' } },
            { id: 'present_indicative', name: 'Present Tense', description: 'Actions happening now or regularly.', example: { pt: 'Eu falo português todos os dias.', en: 'I speak Portuguese every day.' } },
            { id: 'subject_verb_agreement', name: 'Subject-Verb Agreement', description: 'Ensuring verbs match their subjects (Concordância Verbal).', example: { pt: 'As meninas são muito inteligentes.', en: 'The girls are very smart.' } },
            { id: 'noun_gender', name: 'Gender of Nouns', description: 'Masculine and feminine noun rules.', example: { pt: 'O carro é novo. / A casa é nova.', en: 'The car is new. / The house is new.' } },
            { id: 'noun_pluralisation', name: 'Pluralisation of Nouns', description: 'Rules for making nouns plural.', example: { pt: 'um problema / dois problemas', en: 'one problem / two problems' } },
            { id: 'adjectives', name: 'Adjectives', description: 'Position, agreement, and usage.', example: { pt: 'um homem alto / uma mulher alta', en: 'a tall man / a tall woman' } },
            { id: 'negation', name: 'Negation', description: 'Using não, nunca, jamais, and nem.', example: { pt: 'Eu nunca vou à praia no inverno.', en: 'I never go to the beach in the winter.' } },
            { id: 'prepositions', name: 'Prepositions', description: 'Connecting words (de, em, por, para, com).', example: { pt: 'Vou para o Brasil em dezembro.', en: 'I am going to Brazil in December.' } },
        ]
    },
    {
        level: 'Building Fluency',
        topics: [
            { id: 'preterite_tense', name: 'Preterite Tense', description: 'Completed actions in the past (Pretérito Perfeito).', example: { pt: 'Ele comeu o bolo inteiro ontem.', en: 'He ate the whole cake yesterday.' } },
            { id: 'imperfect_tense', name: 'Imperfect Tense', description: 'Ongoing or habitual past actions (Pretérito Imperfeito).', example: { pt: 'Nós líamos muitos livros na infância.', en: 'We used to read many books in childhood.' } },
            { id: 'gerunds', name: 'Progressive / Gerunds', description: 'Ongoing actions (falando, comendo, partindo).', example: { pt: 'Estou trabalhando agora, te ligo depois.', en: 'I am working now, I\'ll call you later.' } },
            { id: 'imperative_mood', name: 'Imperative Mood', description: 'Giving commands and making requests (e.g., "Fale!").', example: { pt: 'Fale com ele agora, por favor!', en: 'Speak with him now, please!' } },
            { id: 'reflexive_verbs', name: 'Reflexive Verbs', description: 'Actions done to oneself (e.g., levantar-se).', example: { pt: 'Ela se levanta cedo todos os dias.', en: 'She gets up early every day.' } },
            { id: 'direct_object_pronouns', name: 'Direct Object Pronouns', description: 'Using o, a, os, as.', example: { pt: 'Você viu meu irmão? Eu o vi na rua.', en: 'Did you see my brother? I saw him on the street.' } },
            { id: 'indirect_object_pronouns', name: 'Indirect Object Pronouns', description: 'Using lhe, lhes.', example: { pt: 'Eu lhe dei o presente ontem.', en: 'I gave him/her the present yesterday.' } },
            { id: 'verb_preposition', name: 'Verb + Preposition', description: 'Common verb-preposition pairs (gostar de, precisar de).', example: { pt: 'Eu preciso de ajuda com isto.', en: 'I need help with this.' } },
            { id: 'comparatives_superlatives', name: 'Comparatives & Superlatives', description: 'Making comparisons (mais/menos que, o maior).', example: { pt: 'Ele é mais alto que ela.', en: 'He is taller than her.' } },
            { id: 'quantifiers', name: 'Quantifiers', description: 'Expressing quantity with muito, pouco, tanto, todo.', example: { pt: 'Tenho muitos amigos no Brasil.', en: 'I have many friends in Brazil.' } },
            { id: 'adverbs', name: 'Adverbs & Adverbial Phrases', description: 'Modifying verbs, adjectives, or other adverbs.', example: { pt: 'Ele corre rapidamente para o trabalho.', en: 'He runs quickly to work.' } },
            { id: 'conjunctions', name: 'Conjunctions', description: 'Connecting ideas (mas, e, porque, quando).', example: { pt: 'Eu estudo de manhã e trabalho à tarde.', en: 'I study in the morning and work in the afternoon.' } },
        ]
    },
    {
        level: 'Advanced Concepts',
        topics: [
            { id: 'conditional_tense', name: 'Conditional Tense', description: 'Expressing "would" do something (Futuro do Pretérito).', example: { pt: 'Eu compraria um carro se tivesse dinheiro.', en: 'I would buy a car if I had money.' } },
            { id: 'present_subjunctive', name: 'Present Subjunctive', description: 'Expressing wishes, doubts, or hypotheticals.', example: { pt: 'Espero que você venha para a festa.', en: 'I hope that you come to the party.' } },
            { id: 'imperfect_subjunctive', name: 'Imperfect Subjunctive', description: 'For unlikely events or past hypotheticals.', example: { pt: 'Se eu pudesse, eu viajaria o mundo.', en: 'If I could, I would travel the world.' } },
            { id: 'future_subjunctive', name: 'Future Subjunctive', description: 'Hypothetical future actions (e.g., "Quando eu for...").', example: { pt: 'Quando você vir o filme, vai entender.', en: 'When you see the movie, you will understand.' } },
            { id: 'negative_imperative', name: 'Negative Imperative', description: 'Giving negative commands (e.g., "Não fale!").', example: { pt: 'Não coma isso, está estragado!', en: 'Don\'t eat that, it\'s spoiled!' } },
            { id: 'compound_tenses', name: 'Compound Tenses (Perfect)', description: 'Perfect forms using "ter" or "haver" (e.g., "tenho ido").', example: { pt: 'Eu tenho estudado muito ultimamente.', en: 'I have been studying a lot lately.' } },
            { id: 'personal_infinitive', name: 'Personal Infinitive', description: 'Infinitives with a specific subject (e.g., "para eu fazer").', example: { pt: 'É importante para eles aprenderem isso.', en: 'It is important for them to learn this.' } },
            { id: 'passive_voice', name: 'Passive Voice', description: 'When the subject receives the action (ser + participle).', example: { pt: 'O livro foi escrito por uma autora famosa.', en: 'The book was written by a famous author.' } },
            { id: 'clitic_placement', name: 'Clitic Placement', description: 'Pronoun placement (próclise, ênclise, mesóclise).', example: { pt: 'Eu te amo. / Amo-te.', en: 'I love you. / I love you. (formal)' } },
            { id: 'impersonal_se', name: 'Impersonal "se"', description: 'General statements like "one does" (faz-se).', example: { pt: 'Fala-se português aqui.', en: 'Portuguese is spoken here.' } },
            { id: 'causative_constructions', name: 'Causative Constructions', description: 'Using mandar, fazer, or deixar + infinitive.', example: { pt: 'Deixei meu filho jogar videogame.', en: 'I let my son play video games.' } },
            { id: 'pronominal_verbs', name: 'Pronominal Verbs', description: 'Verbs that require a reflexive pronoun but aren\'t reflexive.', example: { pt: 'Eu me esqueci da chave.', en: 'I forgot the key.' } },
            { id: 'idiomatic_expressions', name: 'Idiomatic Expressions', description: 'Common phrases with verbs like dar, fazer, ter, estar.', example: { pt: 'No final, deu tudo certo.', en: 'In the end, everything went well.' } },
            { id: 'demonstrative_pronouns', name: 'Demonstrative Pronouns', description: 'Pointing things out with este, esse, aquele.', example: { pt: 'Este livro aqui é meu, aquele lá é seu.', en: 'This book here is mine, that one there is yours.' } },
            { id: 'relative_pronouns', name: 'Relative Pronouns', description: 'Connecting clauses with que, quem, cujo, onde.', example: { pt: 'A casa onde eu moro é grande.', en: 'The house where I live is big.' } },
            { id: 'diminutives_augmentatives', name: 'Diminutives & Augmentatives', description: 'Expressing size or affection (-inho, -ão).', example: { pt: 'gato / gatinho / gatão', en: 'cat / little cat / big cat' } },
        ]
    }
];

export const VOCABULARY_CATEGORIES = [
    // Everyday Life
    { id: 'greetings_basics', name: 'Greetings & Basics', emoji: '👋', description: 'Essential phrases for everyday interactions.' },
    { id: 'family_people', name: 'Family & People', emoji: '👨‍👩‍👧‍👦', description: 'Words for family members and describing people.' },
    { id: 'food_dining', name: 'Food & Dining', emoji: '🍔', description: 'Vocabulary for restaurants, meals, and different types of food.' },
    { id: 'home_daily_routine', name: 'Home & Daily Routine', emoji: '🏠', description: 'Vocabulary for rooms in a house and daily activities.' },
    { id: 'shopping_city', name: 'Shopping & The City', emoji: '🛍️', description: 'Vocabulary for clothing, stores, and navigating a city.' },
    { id: 'numbers_time_date', name: 'Numbers, Time & Date', emoji: '📅', description: 'Cardinal and ordinal numbers, telling time, and dates.' },
    
    // Travel & Places
    { id: 'travel_transport', name: 'Travel & Transport', emoji: '✈️', description: 'Words related to airports, hotels, and getting around.' },
    { id: 'nature_weather', name: 'Nature & Weather', emoji: '🌳', description: 'Vocabulary for landscapes, animals, and weather conditions.' },
    { id: 'geography_countries', name: 'Geography & Countries', emoji: '🌍', description: 'Names of continents, countries, and geographical features.' },

    // Work & Study
    { id: 'work_professions', name: 'Work & Professions', emoji: '💼', description: 'Terms used in the office and for various jobs.' },
    { id: 'education', name: 'Education', emoji: '🎓', description: 'Words related to school, subjects, and university.' },
    { id: 'technology_internet', name: 'Technology & Internet', emoji: '💻', description: 'Essential terms for computers, the web, and gadgets.' },
    { id: 'business_finance', name: 'Business & Finance', emoji: '📈', description: 'Vocabulary for meetings, marketing, and money.' },
    
    // Leisure & Culture
    { id: 'leisure_hobbies', name: 'Leisure & Hobbies', emoji: '⚽️', description: 'Words for sports, music, and other free-time activities.' },
    { id: 'the_arts', name: 'The Arts', emoji: '🎨', description: 'Vocabulary for film, theatre, literature, and visual arts.' },
    { id: 'celebrations_holidays', name: 'Celebrations & Holidays', emoji: '🎉', description: 'Words for birthdays, festivals, and public holidays.' },
    
    // Health & Body
    { id: 'health_body', name: 'Health & The Body', emoji: '💪', description: 'Words for parts of the body and visiting the doctor.' },
    { id: 'clothing_accessories', name: 'Clothing & Accessories', emoji: '👕', description: 'Names for various items of clothing and fashion.' },

    // Abstract & Language
    { id: 'feelings_emotions', name: 'Feelings & Emotions', emoji: '😊', description: 'Words to express how you are feeling.' },
    { id: 'character_personality', name: 'Character & Personality', emoji: '🎭', description: 'Adjectives to describe people\'s personalities.' },
    { id: 'slang_idioms', name: 'Slang & Idioms', emoji: '😎', description: 'Common informal expressions and colloquialisms.' },
];

export const FUNCTIONAL_DOMAINS: FunctionalDomain[] = [
  {
    id: 'everyday_communication',
    name: 'Everyday Communication',
    emoji: '💬',
    subtopics: [
      {
        name: 'Greetings & Introductions',
        functions: ['Greeting people', 'Introducing yourself', 'Introducing others', 'Responding to an introduction', 'Saying goodbye']
      },
      {
        name: 'Basic Conversation',
        functions: ['Making small talk', 'Asking how someone is', 'Keeping a conversation going', 'Asking for repetition', 'Asking for clarification']
      },
      {
        name: 'Social Politeness',
        functions: ['Thanking someone', 'Responding to thanks', 'Apologizing', 'Responding to an apology', 'Giving compliments']
      }
    ]
  },
  {
    id: 'expressing_yourself',
    name: 'Expressing Yourself',
    emoji: '💡',
    subtopics: [
      {
        name: 'Opinions & Feelings',
        functions: ['Expressing an opinion', 'Agreeing', 'Disagreeing', 'Expressing likes and dislikes', 'Talking about feelings']
      },
      {
        name: 'Information & Explanations',
        functions: ['Giving examples', 'Explaining reasons', 'Comparing things', 'Describing people or places', 'Checking information']
      },
      {
        name: 'Requests & Suggestions',
        functions: ['Making a suggestion', 'Giving advice', 'Making a request', 'Asking for permission', 'Expressing uncertainty']
      }
    ]
  },
  {
    id: 'food_and_travel',
    name: 'Food & Travel',
    emoji: '✈️',
    subtopics: [
      {
        name: 'At a Restaurant',
        functions: ['Booking a table', 'Ordering food and drinks', 'Asking for the bill', 'Making a complaint']
      },
      {
        name: 'Hotels & Accommodation',
        functions: ['Checking in at a hotel', 'Asking for hotel services', 'Checking out', 'Problems at a hotel']
      },
      {
        name: 'Getting Around',
        functions: ['Asking for directions', 'Buying tickets (bus, train)', 'Using a taxi', 'At the airport']
      },
      {
        name: 'Shopping',
        functions: ['Asking for prices', 'Asking about sizes/colours', 'Paying for items', 'Returning an item']
      }
    ]
  },
  {
    id: 'work_and_business',
    name: 'Work & Business',
    emoji: '💼',
    subtopics: [
      {
        name: 'In the Office',
        functions: ['Making offers of help', 'Asking for permission', 'Arranging a meeting', 'Participating in a meeting']
      },
      {
        name: 'Phone Calls',
        functions: ['Making a phone call', 'Leaving a message', 'Answering the phone']
      },
      {
        name: 'Presentations & Networking',
        functions: ['Starting a presentation', 'Fielding questions', 'Networking with colleagues']
      }
    ]
  },
  {
    id: 'daily_life_and_home',
    name: 'Daily Life & Home',
    emoji: '🏠',
    subtopics: [
      {
        name: 'Making Arrangements',
        functions: ['Planning an outing', 'Setting a time to meet', 'Confirming plans']
      },
      {
        name: 'Household',
        functions: ['Talking about chores', 'Renting an apartment', 'Dealing with repairs']
      }
    ]
  },
  {
    id: 'socializing_and_hobbies',
    name: 'Socializing & Hobbies',
    emoji: '🎉',
    subtopics: [
      {
        name: 'Invitations',
        functions: ['Inviting someone', 'Accepting an invitation', 'Declining an invitation']
      },
      {
        name: 'Hobbies & Interests',
        functions: ['Talking about hobbies', 'Making plans for leisure activities', 'Joining a club or group']
      }
    ]
  },
  {
    id: 'health_and_emergencies',
    name: 'Health & Emergencies',
    emoji: '🚑',
    subtopics: [
      {
        name: 'At the Doctor',
        functions: ['Making an appointment', 'Describing symptoms', 'At the pharmacy']
      },
      {
        name: 'Emergencies',
        functions: ['Asking for help', 'Reporting an emergency', 'Describing a problem (e.g., lost item)']
      }
    ]
  },
  {
    id: 'storytelling_and_narration',
    name: 'Storytelling & Narration',
    emoji: '📖',
    subtopics: [
      {
        name: 'Recounting Events',
        functions: ['Setting the scene', 'Sequencing events (first, then, finally)', 'Describing past actions', 'Talking about cause and effect', 'Concluding a story']
      },
      {
        name: 'Describing Experiences',
        functions: ['Expressing how something felt', 'Describing people\'s reactions', 'Sharing a personal anecdote', 'Hyping up a story']
      }
    ]
  },
  {
    id: 'discussion_and_persuasion',
    name: 'Discussion & Persuasion',
    emoji: '⚖️',
    subtopics: [
      {
        name: 'Certainty & Doubt',
        functions: ['Expressing certainty', 'Expressing doubt or skepticism', 'Hedging or being vague', 'Asking for confirmation']
      },
      {
        name: 'Building an Argument',
        functions: ['Presenting a point', 'Providing evidence or examples', 'Countering an argument', 'Making a concession', 'Summarizing a position']
      },
      {
        name: 'Negotiating & Compromising',
        functions: ['Making a proposal', 'Rejecting a proposal politely', 'Finding a middle ground', 'Stating conditions']
      }
    ]
  }
];


export const VOCABULARY_CUSTOM_CATEGORIES_STORAGE_KEY = 'portugueseVocabularyCustomCategories';
export const WORD_BANK_STORAGE_KEY = 'portugueseWordBank';
export const FUNCTIONAL_CUSTOM_DOMAINS_STORAGE_KEY = 'portugueseFunctionalCustomDomains';