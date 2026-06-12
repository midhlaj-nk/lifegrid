"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAiSettings } from "@/actions/ai-settings";

interface Props {
  hasGeminiKey: boolean;
  hasOpenrouterKey: boolean;
  hasUnsplashKey: boolean;
  chatModel: string;
  fastModel: string;
  chatProvider: string;
  fastProvider: string;
}

const input =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AiSettingsForm(props: Props) {
  const [geminiKey, setGeminiKey] = useState("");
  const [orKey, setOrKey] = useState("");
  const [unsplashKey, setUnsplashKey] = useState("");
  const [chatModel, setChatModel] = useState(props.chatModel);
  const [fastModel, setFastModel] = useState(props.fastModel);
  const [chatProvider, setChatProvider] = useState(props.chatProvider);
  const [fastProvider, setFastProvider] = useState(props.fastProvider);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await saveAiSettings({
        geminiApiKey: geminiKey || undefined,
        openrouterApiKey: orKey || undefined,
        unsplashAccessKey: unsplashKey || undefined,
        chatModel,
        fastModel,
        chatProvider: chatProvider as "gemini" | "openrouter",
        fastProvider: fastProvider as "gemini" | "openrouter",
      });
      setGeminiKey("");
      setOrKey("");
      setUnsplashKey("");
      toast.success("AI settings saved");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Gemini API key {props.hasGeminiKey && "· saved ✓"}
          </label>
          <input
            type="password"
            placeholder={props.hasGeminiKey ? "•••••• (keep)" : "AIza…"}
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className={input}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            OpenRouter API key {props.hasOpenrouterKey && "· saved ✓"}
          </label>
          <input
            type="password"
            placeholder={props.hasOpenrouterKey ? "•••••• (keep)" : "sk-or-…"}
            value={orKey}
            onChange={(e) => setOrKey(e.target.value)}
            className={input}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Unsplash Access Key {props.hasUnsplashKey && "· saved ✓"}{" "}
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Get free key ↗
          </a>
        </label>
        <input
          type="password"
          placeholder={props.hasUnsplashKey ? "•••••• (keep)" : "your-unsplash-access-key"}
          value={unsplashKey}
          onChange={(e) => setUnsplashKey(e.target.value)}
          className={input}
        />
        <p className="text-[11px] text-muted-foreground">Used for cover photo search in Notes. Free tier = 50 req/hr.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Chat (assistant, digests) — provider + model
          </label>
          <div className="flex gap-2">
            <select
              value={chatProvider}
              onChange={(e) => setChatProvider(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
            >
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <input
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className={input}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Fast (categorize, capture) — provider + model
          </label>
          <div className="flex gap-2">
            <select
              value={fastProvider}
              onChange={(e) => setFastProvider(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
            >
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <input
              value={fastModel}
              onChange={(e) => setFastModel(e.target.value)}
              className={input}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Keys are stored server-side and never sent to the browser. Vault
        contents are never sent to AI providers.
      </p>

      <button
        onClick={save}
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Save AI settings
      </button>
    </div>
  );
}
