'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getAgents, Agent } from '@/lib/api';
import { useFamilyStore } from '@/stores/familyStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: { name: string; label: string; icon?: string };
  pdfUrl?: string;
}

const AGENT_ICONS: Record<string, string> = {
  coach_nutrition: '🥗',
  aide_devoirs: '📚',
  assistant_general: '🤖',
  culture_du_jour: '🌍',
  conseiller_lecture: '📕',
  assistant_jeux_video: '🎮',
  coach_langues: '💬',
  cine_conseils: '🎬',
  createur_images: '🎨',
  createur_coloriages: '🖍️',
  gestionnaire_agenda: '📆',
  chercheur_web: '🔍',
  planificateur_vacances: '✈️',
  famille_organisateur: '📅',
  coach_sport: '💪',
};

const EXAMPLE_COMMANDS: Record<string, string[]> = {
  default: [
    "Planifie sport demain matin",
    "Qu'est-ce qu'on mange cette semaine ?",
    "Ajoute un rdv dentiste mardi à 14h",
    "Quelles activités ce week-end ?",
  ],
  coach_nutrition: ["Une recette rapide pour ce soir", "Menu de la semaine", "Idée de petit-déjeuner sain"],
  coach_sport: ["Mon WOD aujourd'hui ?", "Planifie ma semaine d'entraînement", "J'ai fait ma séance"],
  gestionnaire_agenda: ["Qu'ai-je de prévu demain ?", "Ajoute un rdv dentiste mardi 14h", "Mes événements cette semaine"],
  aide_devoirs: ["Aide-moi en maths", "Explique-moi la photosynthèse", "Comment réviser efficacement ?"],
  chercheur_web: ["Recherche les meilleurs smartphones 2025", "Actualités tech du jour"],
  planificateur_vacances: ["Idées vacances famille en août", "Où partir pour 1500€ ?"],
  createur_images: ["Un chat astronaute style cartoon", "Un château médiéval dans la brume"],
};

export default function AgentScreen() {
  const family = useFamilyStore((s) => s.family);
  const fetchFamily = useFamilyStore((s) => s.fetchFamily);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
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
    getAgents()
      .then((data) => setAgents(data.filter((a) => a.is_active)))
      .catch(() => {});
    if (!family) fetchFamily().catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectAgent = (agent: Agent | null) => {
    setSelectedAgent(agent);
    setShowAgentPicker(false);
    const name = agent ? agent.label : 'Assistant Familial';
    const icon = agent ? (AGENT_ICONS[agent.name] ?? '🤖') : '💬';
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `${icon} Bonjour ! Je suis ${name}. Comment puis-je vous aider ?`,
    }]);
    setInputText('');
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await sendChatMessage({
        message: userMessage.content,
        agent_id: selectedAgent?.id,
        session_id: 'family-hub-web-session',
        family_id: family?.id,
        conversation_history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response || "Désolé, je n'ai pas pu traiter votre demande.",
          agent: response.agent,
          pdfUrl: response.pdfUrl,
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

  const currentIcon = selectedAgent ? (AGENT_ICONS[selectedAgent.name] ?? '🤖') : '💬';
  const currentLabel = selectedAgent ? selectedAgent.label : 'Assistant Familial';
  const currentDesc = selectedAgent ? selectedAgent.description : 'Routage automatique vers le bon agent';
  const exampleCmds = EXAMPLE_COMMANDS[selectedAgent?.name ?? 'default'] ?? EXAMPLE_COMMANDS.default;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* En-tête avec sélecteur */}
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
        <button
          onClick={() => setShowAgentPicker(!showAgentPicker)}
          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity text-left"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: '#EFF4FD' }}
          >
            {currentIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg truncate" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
                {currentLabel}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#EFF4FD', color: '#4784EC' }}>
                ▾ changer
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: '#999' }}>{currentDesc}</p>
          </div>
        </button>

        {selectedAgent && (
          <button
            onClick={() => handleSelectAgent(null)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-red-300 hover:text-red-400 transition-colors flex-shrink-0"
            style={{ color: '#999' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Sélecteur d'agents (dropdown) */}
      {showAgentPicker && (
        <div className="mb-4 rounded-2xl border border-gray-100 overflow-hidden shadow-lg" style={{ backgroundColor: '#fff' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold" style={{ color: '#999' }}>CHOISIR UN AGENT</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {/* Option auto-routage */}
            <button
              onClick={() => handleSelectAgent(null)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
            >
              <span className="text-xl w-8 text-center">💬</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#11253E' }}>Auto (recommandé)</p>
                <p className="text-xs" style={{ color: '#999' }}>Routage automatique vers le meilleur agent</p>
              </div>
              {!selectedAgent && <span className="ml-auto text-blue-500">✓</span>}
            </button>
            {/* Liste des agents */}
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-xl w-8 text-center">{AGENT_ICONS[agent.name] ?? '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#11253E' }}>{agent.label}</p>
                  <p className="text-xs truncate" style={{ color: '#999' }}>{agent.description}</p>
                </div>
                {selectedAgent?.id === agent.id && <span className="ml-auto text-blue-500 flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
                style={{ backgroundColor: '#EFF4FD' }}
              >
                {message.agent ? (AGENT_ICONS[message.agent.name] ?? '🤖') : currentIcon}
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
              {message.agent && !selectedAgent && (
                <p className="text-xs mb-1 opacity-60">
                  {AGENT_ICONS[message.agent.name] ?? '🤖'} {message.agent.label}
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.pdfUrl && (
                <a
                  href={message.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-fit transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#FFBB72', color: '#fff' }}
                >
                  <span>📄</span> Télécharger la liste de courses (PDF)
                </a>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start items-end gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: '#EFF4FD' }}
            >
              {currentIcon}
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: '#F7F8FA', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: '#4784EC', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Commandes rapides */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {exampleCmds.map((cmd, i) => (
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
          placeholder={`Message ${currentLabel}...`}
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
