"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ApiModel {
  id: string;
  owned_by?: string;
}

const STORAGE_KEY = "llm-chat-hub:v1";
const PREFERRED_DEFAULT = "meta/llama-4-maverick-17b-128e-instruct";

export default function Home() {
  const [models, setModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelQuery, setModelQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync theme state with the class the inline layout script already applied,
  // so the toggle button reflects the actual (pre-hydration) theme.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }

  // Load persisted conversation + model on mount.
  // localStorage is only available client-side, so this must run in an effect
  // rather than a lazy useState initializer (which would run during SSR too).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
        if (typeof saved.selectedModel === "string") setSelectedModel(saved.selectedModel);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Fetch model list
  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setModelsError(data.error);
          return;
        }
        setModels(data.models);
        setSelectedModel((prev) => {
          if (prev) return prev;
          const preferred = data.models.find((m: ApiModel) => m.id === PREFERRED_DEFAULT);
          return preferred ? preferred.id : data.models[0]?.id ?? "";
        });
      })
      .catch((err) => setModelsError(String(err)));
  }, []);

  // Persist conversation + model
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, selectedModel }));
  }, [messages, selectedModel]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q));
  }, [models, modelQuery]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || !selectedModel) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            // Some upstreams keep the connection open after the final chunk,
            // so we must stop on this marker rather than wait for the reader
            // to report done — otherwise the stream read hangs forever.
            streamDone = true;
            break;
          }

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      if (streamDone) {
        reader.cancel().catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  function newChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="relative w-full max-w-md" ref={dropdownRef}>
          <input
            type="text"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Search model..."
            value={dropdownOpen ? modelQuery : selectedModel}
            onFocus={() => {
              setDropdownOpen(true);
              setModelQuery("");
            }}
            onChange={(e) => setModelQuery(e.target.value)}
          />
          {dropdownOpen && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {filteredModels.length === 0 && (
                <div className="px-3 py-2 text-sm text-neutral-500">No models found</div>
              )}
              {filteredModels.map((m) => (
                <button
                  key={m.id}
                  className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    m.id === selectedModel ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setDropdownOpen(false);
                  }}
                >
                  {m.id}
                  {m.owned_by && (
                    <span className="ml-2 text-xs text-neutral-400">{m.owned_by}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {modelsError && <span className="text-sm text-red-500">{modelsError}</span>}
        <button
          onClick={toggleTheme}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={newChat}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          New chat
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap rounded-lg px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto max-w-[80%] bg-blue-600 text-white"
                  : "mr-auto max-w-[80%] bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
              }`}
            >
              {m.content || (isStreaming && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
          {error && (
            <div className="mx-auto rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mx-auto flex max-w-3xl gap-2">
          <textarea
            className="flex-1 resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            rows={2}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !selectedModel || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
