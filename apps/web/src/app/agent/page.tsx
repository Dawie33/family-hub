'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: { name: string; label: string; icon?: string };
}

const EXAMPLE_COMMANDS = [
  "Planifie sport demain matin",
  "Qu'est-ce qu'on mange cette semaine ?",
  "Ajoute l'anniversaire de Lucas le 15 mars",
  "Quelles activités ce week-end ?",
];

export default function AgentScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant familial. Comment puis-je vous aider ?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await sendChatMessage({
        message: userMessage.content,
        session_id: 'family-hub-web-session',
        conversation_history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response || "Désolé, je n'ai pas pu traiter votre demande.",
          agent: response.agent,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Désolé, une erreur est survenue. Le serveur est peut-être indisponible.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: '#EFF4FD' }}>
          💬
        </div>
        <div>
          <h1 className="font-bold text-lg" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Assistant Familial
          </h1>
          <p className="text-xs" style={{ color: '#999' }}>Planifiez, organisez, coordonnez</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
                style={{ backgroundColor: '#EFF4FD' }}>
                💬
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                message.role === 'user'
                  ? { backgroundColor: '#4784EC', color: '#fff', borderBottomRightRadius: '4px' }
                  : { backgroundColor: '#F7F8FA', color: '#32325D', borderBottomLeftRadius: '4px' }
              }
            >
              {message.agent && (
                <p className="text-xs mb-1 opacity-60">
                  {message.agent.icon} {message.agent.label}
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: '#EFF4FD' }}>
              💬
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: '#F7F8FA', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: '#4784EC', animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Commandes rapides */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {EXAMPLE_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            onClick={() => setInputText(cmd)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-300 transition-colors"
            style={{ color: '#585858' }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tapez votre message..."
          rows={2}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl resize-none text-sm focus:outline-none focus:border-blue-400 transition-colors"
          style={{ color: '#32325D' }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isProcessing}
          className="px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#4784EC' }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
