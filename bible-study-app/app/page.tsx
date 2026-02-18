"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Welcome. I am a Reformed Bible study assistant drawing on the teachings of John MacArthur, R.C. Sproul, and the apologetic scholarship of Wes Huff. Ask me about any passage, doctrine, or biblical topic and I will provide a thorough hermeneutical analysis including historical context, literary genre, eschatological themes, and more."
};

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="animate-bounce [animation-delay:0ms] w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      <span className="animate-bounce [animation-delay:150ms] w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      <span className="animate-bounce [animation-delay:300ms] w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center mr-2 mt-1 text-sm font-bold text-amber-100 shadow">
          B
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl shadow text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-amber-700 text-amber-50 rounded-br-sm"
            : "bg-stone-800 text-stone-100 rounded-bl-sm border border-stone-700"
        }`}
      >
        {msg.content}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center ml-2 mt-1 text-sm font-bold text-stone-200 shadow">
          Y
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitQuestion();
    }
  };

  const submitQuestion = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { role: "user", content: question };
    const history = messages.filter((m) => m.role !== "assistant" || m !== WELCOME);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: [...history, userMsg].slice(0, -1)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Unknown error");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer }
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitQuestion();
  };

  const handleClear = () => {
    setMessages([WELCOME]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-xl">&#10016;</span>
          <div>
            <h1 className="text-sm font-semibold text-amber-100 leading-tight">
              Bible Study Assistant
            </h1>
            <p className="text-xs text-stone-400 leading-tight">
              MacArthur &bull; Sproul &bull; Wes Huff &bull; 5-Point Calvinist
            </p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-stone-400 hover:text-amber-400 transition-colors px-2 py-1 rounded border border-stone-700 hover:border-amber-600"
        >
          New Chat
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center mr-2 mt-1 text-sm font-bold text-amber-100 shadow">
              B
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-stone-800 border border-stone-700 shadow">
              <LoadingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 text-xs mb-3 px-4 py-2 bg-red-950/40 rounded-xl border border-red-900">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="px-4 py-3 border-t border-stone-800 bg-stone-950 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about a verse, passage, or doctrine..."
            disabled={loading}
            className="flex-1 resize-none bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 disabled:opacity-50 transition-colors"
            style={{ minHeight: "48px", maxHeight: "160px" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-amber-50 rounded-xl px-4 py-3 text-sm font-medium transition-colors h-12"
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
        <p className="text-center text-xs text-stone-600 mt-2">
          Press Enter to send &bull; Shift+Enter for new line
        </p>
      </footer>
    </div>
  );
}
