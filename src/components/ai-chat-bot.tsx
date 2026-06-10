"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const starter: ChatMessage = {
  role: "assistant",
  content:
    "Tôi là AI Chat Bot của WC 2026 Portal. Bạn có thể hỏi luật chơi, lịch trận, bảng xếp hạng hoặc nhờ tôi dự đoán vui một trận.",
};

export function AiChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([starter]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as { reply?: string };
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply ?? "Tôi chưa trả lời được câu này. Hỏi lại ngắn hơn giúp tôi nhé." },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Tôi đang không kết nối được. Bạn thử gửi lại sau vài giây nhé." },
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open && (
        <section className="mb-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-2xl shadow-emerald-950/20">
          <header className="flex items-center justify-between bg-emerald-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-white/20">
                <Bot size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-extrabold">AI Chat Bot</h2>
                <p className="text-xs font-semibold text-emerald-200">Hỏi nhanh về World Cup</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-2 text-emerald-50 hover:bg-white/10"
              aria-label="Đóng AI Chat Bot"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="max-h-80 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "bg-white text-slate-700 shadow-sm"
                    : "ml-8 bg-emerald-800 text-white"
                }`}
              >
                {message.content.split("\n").map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm">
                <Sparkles size={16} aria-hidden="true" />
                Đang nghĩ...
              </div>
            )}
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Hỏi lịch trận, luật chơi, dự đoán..."
              maxLength={800}
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              disabled={loading || !input.trim()}
              className="flex min-h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Gửi câu hỏi"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          window.setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-800 text-white shadow-2xl shadow-emerald-950/25 ring-4 ring-emerald-100 hover:-translate-y-0.5 hover:bg-emerald-900"
        aria-label="Mở AI Chat Bot"
      >
        <MessageCircle size={25} aria-hidden="true" />
      </button>
    </div>
  );
}
