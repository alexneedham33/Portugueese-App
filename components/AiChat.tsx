import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './Card';
import { Loader } from './Loader';
import { CHAT_TOPICS } from '../constants';
import { startChat, getChatResponseStream, getSuggestedResponse } from '../services/geminiService';
import type { ChatMessage } from '../types';

type ChatState = 'selecting_topic' | 'starting_chat' | 'chatting' | 'error';

interface AiChatProps {
    onClose: () => void;
}

export const AiChat: React.FC<AiChatProps> = ({ onClose }) => {
    const [chatState, setChatState] = useState<ChatState>('selecting_topic');
    const [selectedTopic, setSelectedTopic] = useState<{ id: string, name: string } | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [customTopicInput, setCustomTopicInput] = useState('');
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTranslations, setShowTranslations] = useState(true);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectTopic = async (topic: { id: string, name: string }) => {
        setSelectedTopic(topic);
        setChatState('starting_chat');
        setError(null);
        setMessages([]);

        try {
            const firstMessage = await startChat(topic.name);
            setMessages([{
                id: Date.now(),
                sender: 'ai',
                ...firstMessage
            }]);
            setChatState('chatting');
        } catch (err) {
            console.error("Error starting chat:", err);
            setError("Failed to start the chat. The AI might be busy. Please try again.");
            setChatState('error');
        }
    };

    const handleStartCustomChat = async (e: React.FormEvent) => {
        e.preventDefault();
        const topicName = customTopicInput.trim();
        if (!topicName) return;
    
        // Reuse the logic of handleSelectTopic, but with a custom object
        await handleSelectTopic({ id: `custom-${Date.now()}`, name: topicName });
        setCustomTopicInput('');
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoadingResponse) return;
    
        const userMessage: ChatMessage = {
            id: Date.now(),
            sender: 'user',
            portuguese: trimmedInput,
            english: "", // No translation for user message
        };
    
        // Add user message to history immediately for a responsive feel
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setUserInput('');
        setIsLoadingResponse(true);
        setError(null);
    
        try {
            const stream = getChatResponseStream(currentMessages, trimmedInput);
            const aiMessageId = Date.now() + 1;
            let isAiMessageAdded = false;
    
            for await (const event of stream) {
                if (event.type === 'correction' && event.correction) {
                    // Update the user's message with the correction if it exists
                    setMessages(prev => prev.map(msg => 
                        msg.id === userMessage.id ? { ...msg, correction: event.correction } : msg
                    ));
                } else if (event.type === 'portuguese_chunk') {
                    if (!isAiMessageAdded) {
                        // First chunk arrived, add the new AI message bubble
                        const newAiMessage: ChatMessage = {
                            id: aiMessageId,
                            sender: 'ai',
                            portuguese: event.chunk,
                            english: '(Translating...)',
                        };
                        setMessages(prev => [...prev, newAiMessage]);
                        isAiMessageAdded = true;
                    } else {
                        // Subsequent chunks, append to the existing AI message
                        setMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId 
                                ? { ...msg, portuguese: msg.portuguese + event.chunk } 
                                : msg
                        ));
                    }
                } else if (event.type === 'english_translation') {
                    // Final translation arrived, update the AI message
                    setMessages(prev => prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { ...msg, english: event.english } 
                            : msg
                    ));
                }
            }
        } catch (err) {
            console.error("Error in chat stream:", err);
            setError("An error occurred during the conversation. Please try sending your message again.");
            // Optional: remove the user's message on error to allow retry
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        } finally {
            setIsLoadingResponse(false);
        }
    };

    const handleGetSuggestion = async () => {
        setIsLoadingSuggestion(true);
        setError(null);
        try {
            const suggestion = await getSuggestedResponse(messages);
            setUserInput(suggestion.portuguese);
        } catch (err) {
            console.error("Error getting suggestion:", err);
            setError("Sorry, I couldn't get a suggestion right now.");
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    const handleRestart = () => {
        setChatState('selecting_topic');
        setSelectedTopic(null);
        setMessages([]);
        setError(null);
    }

    const renderTopicSelection = () => {
        const filteredTopics = customTopicInput
            ? CHAT_TOPICS.filter(topic =>
                topic.name.toLowerCase().startsWith(customTopicInput.toLowerCase())
              )
            : [];
    
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="w-full max-w-2xl text-center">
                    <h2 className="text-3xl font-bold text-slate-800">Start a Conversation</h2>
                    <p className="mt-2 text-slate-500 max-w-md mx-auto">
                        Describe a scenario or choose from the suggestions to start practicing.
                    </p>
    
                    <div className="relative mt-8">
                        <form onSubmit={handleStartCustomChat} className="w-full">
                            <div className="flex items-center space-x-2">
                                 <input
                                    id="custom-topic-input"
                                    type="text"
                                    value={customTopicInput}
                                    onChange={(e) => setCustomTopicInput(e.target.value)}
                                    placeholder="e.g., Ordering coffee, talking about a movie..."
                                    className="block w-full px-4 py-3 bg-white border border-slate-300 rounded-md text-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    aria-label="Create or search for a chat topic"
                                    autoComplete="off"
                                />
                                 <button
                                    type="submit"
                                    className="px-5 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                                    disabled={!customTopicInput.trim()}
                                >
                                    Start
                                </button>
                            </div>
                        </form>
    
                        {filteredTopics.length > 0 && customTopicInput && (
                            <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto text-left">
                                {filteredTopics.map(topic => (
                                    <li key={topic.id}>
                                        <button
                                            onClick={() => handleSelectTopic(topic)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100"
                                        >
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-4">{topic.emoji}</span>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{topic.name}</h4>
                                                    <p className="text-sm text-slate-500">{topic.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderChat = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex-shrink-0 flex justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800 truncate">
                    Chat: <span className="text-indigo-600">{selectedTopic?.name}</span>
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowTranslations(prev => !prev)}
                        className="p-2 bg-white border border-slate-300 text-slate-600 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        title={showTranslations ? "Hide translations" : "Show translations"}
                    >
                        {showTranslations ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a7.002 7.002 0 006.29-4.325l-1.226-1.226A5.002 5.002 0 0110 15a5.002 5.002 0 01-3.064-1.025l-1.226 1.226A7.002 7.002 0 0010 17z" /></svg>
                        )}
                    </button>
                    <button
                        onClick={handleRestart}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        New Topic
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white border border-slate-300 text-slate-600 rounded-md shadow-sm hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        title="Close Chat"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            <div className="flex-grow p-4 space-y-6 overflow-y-auto bg-slate-100/50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>}
                        <div className={`max-w-lg p-3 rounded-xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                            <p className="text-lg whitespace-pre-wrap">{msg.portuguese}</p>
                            {msg.sender === 'ai' && showTranslations && (
                                <p className="text-sm mt-1 text-slate-500">{msg.english}</p>
                            )}
                            {msg.sender === 'user' && msg.correction && (
                                <div className="mt-3 pt-3 border-t border-indigo-500/50">
                                    <p className="text-green-200 flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        <span>{msg.correction.portuguese}</span>
                                    </p>
                                    {showTranslations && <p className="text-sm text-green-300/80 mt-0.5 pl-5">{msg.correction.english}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
{/* FIX: Replaced messages.at(-1) with messages[messages.length - 1] for broader JS/TS compatibility. */}
                 {isLoadingResponse && messages[messages.length - 1]?.sender === 'user' && (
                    <div className="flex items-end gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
                        <div className="max-w-lg p-3 rounded-xl bg-white text-slate-800 border border-slate-200">
                           <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce"></span>
                           </div>
                        </div>
                    </div>
                 )}
                <div ref={chatEndRef} />
            </div>
            {error && <div className="p-2 text-sm text-center text-red-600 bg-red-50">{error}</div>}
            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            placeholder="Type your message in Portuguese..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isLoadingResponse}
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!userInput.trim() || isLoadingResponse}
                        >
                            Send
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleGetSuggestion}
                        disabled={isLoadingResponse || isLoadingSuggestion}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoadingSuggestion ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Getting idea...</span>
                            </>
                        ) : (
                             <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 14.95a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM12 15a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zM8.343 5.757a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" />
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM5.93 12.07a1 1 0 01-1.414 1.414l-1-1a1 1 0 111.414-1.414l1 1zm9.486-1.414a1 1 0 11-1.414-1.414l1-1a1 1 0 111.414 1.414l-1 1z" />
                                </svg>
                                <span>Suggest a reply</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (chatState) {
            case 'selecting_topic':
                return renderTopicSelection();
            case 'starting_chat':
                return <Loader message={`Starting your chat on "${selectedTopic?.name}"...`} size="lg" />;
            case 'chatting':
                return renderChat();
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <p className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</p>
                        <button onClick={handleRestart} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md">
                            Try Again
                        </button>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <Card className="max-w-4xl mx-auto w-full">
            <CardContent className="p-0 min-h-[80vh]">
                <div className="h-[80vh]">
                    {renderContent()}
                </div>
            </CardContent>
        </Card>
    );
};