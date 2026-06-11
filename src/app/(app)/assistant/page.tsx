"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

const STORAGE_KEY = "assistant-chat-v1";

function loadStored(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
import { Bot, Loader2, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What's pending this week?",
  "How much did I spend on food this month?",
  "Add a task: review PR tomorrow morning",
  "What events are coming up?",
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, setMessages } = useChat();
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const stored = loadStored();
    if (stored.length) setMessages(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length && status === "ready") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    }
  }, [messages, status]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Asks your tasks, notes, and finance — vault excluded by design
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              localStorage.removeItem(STORAGE_KEY);
            }}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Clear chat
          </button>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="space-y-2 pt-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex gap-2.5",
              m.role === "user" && "flex-row-reverse"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-foreground"
              )}
            >
              {m.role === "user" ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </span>
            <div
              className={cn(
                "max-w-[85%] space-y-1 rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              )}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text")
                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                if (part.type.startsWith("tool-"))
                  return (
                    <p
                      key={i}
                      className="text-[11px] italic text-muted-foreground"
                    >
                      ⚙ {part.type.replace("tool-", "")}…
                    </p>
                  );
                return null;
              })}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {error.message || "Something went wrong — check AI settings."}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your life data…"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          disabled={busy || !input.trim()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
