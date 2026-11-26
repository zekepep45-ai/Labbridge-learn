"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import MarkdownContent from "@/components/MarkdownContent";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type TutorMode = "tutor" | "quiz" | "case";

const prompts: Record<TutorMode, string[]> = {
  tutor: [
    "Explain the principle of spectrophotometry.",
    "What is the difference between serum and plasma?",
    "Teach me the stages of laboratory quality control."
  ],
  quiz: [
    "Create a quiz on haematology.",
    "Test me on clinical biochemistry.",
    "Give me five microbiology questions."
  ],
  case: [
    "Give me a case about a poor-quality blood specimen.",
    "Let's practise interpreting a full blood count.",
    "Create a microbiology specimen-reception case."
  ]
};

export default function AITutorPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<TutorMode>("tutor");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setCheckingAuth(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendMessage(preset?: string) {
    const content = (preset ?? input).trim();
    if (!content || sending) return;
    if (!session?.access_token) {
      setError("Please sign in again to use the AI Tutor.");
      return;
    }

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", content };
    const assistantMessage: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: "" };
    const history = [...messages, userMessage].slice(-10);
    setMessages([...history, assistantMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ mode, messages: history.map(({ role, content: text }) => ({ role, content: text })) })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string; remaining?: number; limit?: number };
        if (typeof payload.remaining === "number") setRemaining(payload.remaining);
        if (typeof payload.limit === "number") setDailyLimit(payload.limit);
        throw new Error(payload.error || "The tutor could not answer. Please try again.");
      }

      const quota = response.headers.get("X-LabBridge-Quota-Remaining");
      const limit = response.headers.get("X-LabBridge-Quota-Limit");
      if (quota !== null) setRemaining(Number(quota));
      if (limit !== null) setDailyLimit(Number(limit));
      if (!response.body) throw new Error("The tutor returned an empty response. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages(current => current.map(message => message.id === assistantMessage.id ? { ...message, content: answer } : message));
      }
      answer += decoder.decode();
      setMessages(current => current.map(message => message.id === assistantMessage.id ? { ...message, content: answer || "I couldn't produce a response. Please try again." } : message));
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Something went wrong. Please try again.";
      setError(message);
      setMessages(current => current.map(item => item.id === assistantMessage.id ? { ...item, content: "I couldn't complete that response. Please check your connection and try again." } : item));
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  if (checkingAuth) return <main className="tutor-loading">Opening LabBridge AI Tutor…</main>;

  if (!session) return (
    <main className="tutor-page">
      <section className="tutor-auth-card">
        <div className="tutor-brand-mark">L<span>+</span></div>
        <h1>Sign in to LabBridge AI Tutor</h1>
        <p>Your MLS learning assistant is available to registered learners.</p>
        <Link className="tutor-primary-link" href="/">Go to sign in</Link>
      </section>
    </main>
  );

  return (
    <main className="tutor-page">
      <header className="tutor-topbar">
        <Link href="/" className="tutor-brand"><span className="tutor-brand-mark">L<span>+</span></span><span><strong>LabBridge</strong><small>LEARN</small></span></Link>
        <Link href="/" className="tutor-back-link">← Dashboard</Link>
      </header>

      <section className="tutor-workspace">
        <div className="tutor-heading">
          <div>
            <span className="tutor-eyebrow">YOUR MLS LEARNING COMPANION</span>
            <h1>LabBridge <span>AI Tutor</span></h1>
            <p>Understand concepts, practise questions, and build laboratory reasoning step by step.</p>
          </div>
          <div className="tutor-allowance">
            <span>DAILY MESSAGES</span>
            <strong>{remaining === null ? "Ready" : `${remaining} left`}</strong>
            {dailyLimit !== null && <small>of {dailyLimit} today</small>}
          </div>
        </div>

        <div className="tutor-mode-tabs" role="tablist" aria-label="Tutor mode">
          <button type="button" className={mode === "tutor" ? "active" : ""} onClick={() => setMode("tutor")} disabled={sending}><span>✦</span> Explain a topic</button>
          <button type="button" className={mode === "quiz" ? "active" : ""} onClick={() => setMode("quiz")} disabled={sending}><span>▤</span> Build a quiz</button>
          <button type="button" className={mode === "case" ? "active" : ""} onClick={() => setMode("case")} disabled={sending}><span>⚗</span> Clinical case coach</button>
        </div>

        <section className="tutor-chat-card">
          <div className="tutor-chat-header">
            <div className="tutor-avatar">L+</div>
            <div><strong>{mode === "quiz" ? "Quiz Builder" : mode === "case" ? "Clinical Case Coach" : "Your AI Tutor"}</strong><small>Medical Laboratory Science · Educational support</small></div>
            <button type="button" onClick={() => { setMessages([]); setError(""); }} disabled={sending || messages.length === 0}>New chat</button>
          </div>

          <div className="tutor-conversation">
            {messages.length === 0 ? (
              <div className="tutor-welcome">
                <div className="tutor-welcome-icon">✦</div>
                <h2>{mode === "quiz" ? "What would you like to practise?" : mode === "case" ? "Ready for a laboratory case?" : "What are you studying today?"}</h2>
                <p>{mode === "quiz" ? "Choose a subject and I will prepare five questions. I'll keep the answers hidden until you respond." : mode === "case" ? "Work through fictional laboratory scenarios one decision at a time." : "Ask a question. I'll explain the science and connect it to real laboratory learning."}</p>
                <div className="tutor-suggestions">{prompts[mode].map(prompt => <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={sending}>{prompt} <span>↗</span></button>)}</div>
              </div>
            ) : messages.map(message => (
              <article key={message.id} className={`tutor-message ${message.role}`}>
                <div className="tutor-message-label">{message.role === "user" ? "YOU" : "LABBRIDGE AI TUTOR"}</div>
                <div className="tutor-message-content">
                  {message.content ? <MarkdownContent content={message.content} /> : <span className="tutor-typing">Thinking through your question…</span>}
                </div>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>

          {error && <div className="tutor-error" role="alert">{error}</div>}
          <div className="tutor-composer">
            <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={mode === "quiz" ? "Which MLS subject should I test you on?" : mode === "case" ? "Choose a laboratory topic for your case…" : "Ask your MLS question here…"} rows={2} maxLength={4000} disabled={sending} />
            <div className="tutor-composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button type="button" onClick={() => void sendMessage()} disabled={sending || !input.trim()}>{sending ? "Thinking…" : "Send question"} <span>↑</span></button></div>
          </div>
          <p className="tutor-safety-note">For education only. Do not enter patient-identifiable information. Always follow validated laboratory SOPs and qualified supervision.</p>
        </section>
      </section>
    </main>
  );
}
