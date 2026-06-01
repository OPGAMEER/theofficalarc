import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useChatHistory, type ChatMessage } from "@/lib/arc-store";
import { localChatReply, chatReplyPreferGroq } from "@/lib/local-chat";



export default function Chat() {
  const navigate = useNavigate();
  const { messages, setMessages } = useChatHistory();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: ChatMessage = { id: `m_${Date.now()}`, role: "user", content: text, ts: Date.now() };
    const placeholder: ChatMessage = { id: `m_${Date.now()+1}`, role: "assistant", content: "", ts: Date.now()+1 };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const convo = next.filter(m => m.content).map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await chatReplyPreferGroq(convo as any);
      setMessages(prev => prev.map(m => m.id === placeholder.id ? { ...m, content: reply } : m));
    } catch {
      const reply = localChatReply(convo as any);
      setMessages(prev => prev.map(m => m.id === placeholder.id ? { ...m, content: reply } : m));
    } finally {
      setStreaming(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-background flex justify-center">
      <div className="relative w-full max-w-md min-h-screen flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 bg-[hsl(var(--accent))] animate-pulse-soft" />
            <span className="mono-label-strong">ARC · CHAT</span>
          </div>
          <button onClick={() => navigate(-1)}><X size={20} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-6 pb-32">
          {messages.length === 0 && (
            <div className="mt-12 animate-fade-up">
              <span className="mono-label">// ARC</span>
              <h1 className="hero-text text-text mt-2" style={{ fontSize: 48 }}>
                Ask me<br />
                <span className="text-text-muted">anything.</span>
              </h1>
              <p className="text-text-muted mt-6 max-w-xs">
                Workouts. Meals. Schedule. Mind. I keep my answers tight.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                {["Plan my upper-body workout", "What should I eat post-workout?", "Build me a morning routine"].map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left border border-border px-4 py-3 mono-label-strong text-text"
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={`py-5 border-b border-divider ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div className="mono-label mb-1">{m.role === "user" ? "YOU" : "ARC"}</div>
              <p className={`text-base leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "text-text" : "text-text"}`}>
                {m.content || (streaming && m.role === "assistant" ? "…" : "")}
              </p>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-background border-t border-border">
          <div className="flex items-center gap-2 border border-text">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message Arc"
              className="flex-1 bg-transparent outline-none px-4 py-3.5 text-text placeholder:text-text-muted"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="bg-inverse text-text-inverse h-12 w-12 flex items-center justify-center disabled:opacity-50"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
