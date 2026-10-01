
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  Send,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

const fallbackSkills = [
  'Python',
  'Web Development',
  'English Speaking',
];

export function AssistantPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const userSkills = Array.isArray(user?.learn_skills)
    ? user.learn_skills
    : [];

  const availableSkills =
    userSkills.length > 0
      ? userSkills
      : fallbackSkills.map((name, index) => ({
          id: `fallback-${index}`,
          name,
        }));

  const initialSkill =
    userSkills.length > 0
      ? userSkills[0]?.name || 'Python'
      : 'Python';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: `Hello ${
        user?.full_name?.split(' ')[0] || 'there'
      }! I am your LearnX AI Learning Mentor.\n\nI can help you prepare for your peer sessions, explain concepts in Python, Java, Web Development or Communication, and generate custom practice exercises.\n\nWhat topic are you working on?`,
      time: 'Now',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] =
    useState<string>(initialSkill);

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleSend = async (messageText?: string) => {
    const textToSend =
      messageText !== undefined
        ? messageText
        : input;

    const trimmedMessage = textToSend.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      text: trimmedMessage,
      time: getCurrentTime(),
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    if (messageText === undefined) {
      setInput('');
    }

    setLoading(true);

    try {
      const data = await apiRequest<{
        reply?: string;
        response?: string;
        message?: string;
      }>('/ai/assistant', {
        method: 'POST',
        body: {
          message: trimmedMessage,
          skill: selectedSkill,
          topic: selectedSkill,
        },
      });

      const assistantReply =
        data?.reply ||
        data?.response ||
        data?.message ||
        'Here is the requested explanation.';

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: assistantReply,
          time: getCurrentTime(),
        },
      ]);
    } catch (err: any) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text:
            err?.message ||
            'I ran into an issue connecting to the LearnX AI mentor service. Please try again.',
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    `Explain the top 3 foundational concepts of ${selectedSkill}`,
    `Generate a beginner-friendly code example in ${selectedSkill}`,
    `Create 2 practice quiz questions for ${selectedSkill}`,
    `What are the most common beginner pitfalls in ${selectedSkill}?`,
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Bot className="h-6 w-6 text-cyan-400" />
            AI Learning Mentor
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Server-side AI assistant designed to
            prepare you for peer sessions and clarify
            concepts.
          </p>
        </div>

        {/* Skill Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Focus:
          </span>

          <select
            value={selectedSkill}
            onChange={(event) =>
              setSelectedSkill(event.target.value)
            }
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
          >
            {availableSkills.map((skill) => (
              <option
                key={skill.id}
                value={skill.name}
              >
                {skill.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, index) => (
          <button
            key={`${prompt}-${index}`}
            type="button"
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col h-[520px] shadow-xl overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-3 ${
                message.role === 'user'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 whitespace-pre-wrap'
                }`}
              >
                {message.text}

                <div
                  className={`text-[10px] mt-2 ${
                    message.role === 'user'
                      ? 'text-cyan-200'
                      : 'text-slate-500'
                  }`}
                >
                  {message.time}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Bot className="h-4 w-4" />
              </div>

              <div className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 animate-pulse">
                LearnX AI Mentor is preparing your
                answer...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder={`Ask anything about ${selectedSkill}...`}
              disabled={loading}
              autoComplete="off"
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                loading || !input.trim()
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs disabled:opacity-40 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>

      {/* Navigation helper */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors"
        >
          Find a peer to continue learning →
        </button>
      </div>
    </div>
  );
}