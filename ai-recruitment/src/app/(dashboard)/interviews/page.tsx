"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  MessageCircle,
  Sparkles,
  Plus,
  Loader2,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInterviewSession } from "@/hooks";

export default function InterviewsPage() {
  const {
    sessions,
    currentSession,
    transcript,
    streaming,
    creating,
    startInterview,
    sendMessage,
    selectSession,
  } = useInterviewSession();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleStart = () => {
    startInterview("Software Engineer", "TECHNICAL");
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex h-full overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Mock Interviews
            </h2>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleStart}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </>
              )}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 && !creating ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p>No interviews yet.</p>
                <p className="mt-1">Start one to practice with AI.</p>
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSession(s)}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 text-left transition-colors",
                    currentSession?.id === s.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-white truncate">
                      {s.title ?? "Mock Interview"}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0",
                        currentSession?.id === s.id ? "text-primary" : "text-slate-400"
                      )}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {s.type?.replace("_", " ") ?? "Technical"}
                    </Badge>
                    <span>{new Date(s.startedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col bg-white dark:bg-slate-900">
          {!currentSession ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-10 w-10" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  AI Mock Interview Room
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Practice technical, behavioral, or system design interviews with
                  our AI interviewer. Get instant feedback and improve.
                </p>
                <Button
                  size="lg"
                  className="mt-8 rounded-2xl px-8 py-6 text-base font-bold shadow-xl"
                  onClick={handleStart}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Mic className="mr-2 h-5 w-5" />
                  )}
                  Start Mock Interview
                </Button>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {["Technical", "Behavioral", "System Design"].map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="rounded-full px-4 py-1.5 text-xs"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentSession.title ?? "Mock Interview"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {currentSession.type?.replace("_", " ")} • AI Interviewer
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Started{" "}
                  {new Date(currentSession.startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl space-y-6">
                  {transcript.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <p className="text-sm text-slate-500">
                        Say hello or answer the first question. The AI interviewer
                        will respond and ask follow-ups.
                      </p>
                    </motion.div>
                  )}
                  <AnimatePresence initial={false}>
                    {transcript.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3", m.role === "USER" && "flex-row-reverse")}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            m.role === "USER"
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {m.role === "USER" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <Card
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3",
                            m.role === "USER"
                              ? "bg-primary text-primary-foreground"
                              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {m.content}
                          </p>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {streaming && (
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      </div>
                      <Card className="rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <p className="text-sm text-slate-500">Thinking...</p>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
                <div className="mx-auto flex max-w-2xl gap-3">
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-primary"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const t = input.trim();
                        if (t) {
                          sendMessage(t);
                          setInput("");
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-2xl"
                    onClick={() => {
                      const t = input.trim();
                      if (t) {
                        sendMessage(t);
                        setInput("");
                      }
                    }}
                    disabled={!input.trim() || streaming}
                  >
                    {streaming ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
