"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { InterviewTranscriptMessage } from "@/lib/api-client";

interface Props {
  messages: InterviewTranscriptMessage[];
  onSend: (text: string) => Promise<void> | void;
  disabled: boolean;
  isAiThinking: boolean;
  isComplete: boolean;
}

export function CandidateResponsePanel({
  messages,
  onSend,
  disabled,
  isAiThinking,
  isComplete,
}: Props) {
  const [value, setValue] = useState("");
  const interimRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isListening, isSupported, start, stop } = useSpeechInput({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        interimRef.current = "";
        setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else {
        interimRef.current = transcript;
        setValue((prev) => {
          // Reflect the interim stream live without stacking.
          const base = prev.replace(/ · listening: .*$/, "");
          return `${base}${base ? " · listening: " : "listening: "}${transcript}`;
        });
      }
    },
  });

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isAiThinking]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const cleanedValue = value.replace(/ · listening: .*$/, "").replace(/^listening: /, "");

  const canSubmit =
    !disabled && cleanedValue.trim().length > 0 && !isAiThinking && !isComplete;

  async function handleSubmit() {
    if (!canSubmit) return;
    const text = cleanedValue.trim();
    setValue("");
    interimRef.current = "";
    if (isListening) stop();
    await onSend(text);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex",
                  message.role === "interviewer" ? "justify-start" : "justify-end",
                )}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1 ring-inset",
                    message.role === "interviewer"
                      ? "bg-card text-foreground ring-border"
                      : "bg-primary text-primary-foreground ring-primary/30",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      message.role === "interviewer"
                        ? "text-muted-foreground"
                        : "text-primary-foreground/70",
                    )}
                  >
                    {message.role === "interviewer" ? "Alex" : "You"}
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isAiThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-inset ring-border">
                <ThinkingIndicator />
              </div>
            </motion.div>
          )}

          {isComplete && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
              The interview is complete. We&apos;re generating your feedback report now.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card/50 px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              disabled={disabled || isComplete}
              placeholder={
                isComplete
                  ? "Interview complete"
                  : "Type your answer here, or press the mic to speak. Cmd+Enter to send."
              }
              className="min-h-[68px] resize-none rounded-2xl border-border bg-background pr-24 text-sm leading-relaxed"
            />
            {isSupported && (
              <button
                type="button"
                onClick={isListening ? stop : start}
                aria-label={isListening ? "Stop dictation" : "Start dictation"}
                disabled={disabled || isComplete}
                className={cn(
                  "absolute bottom-2 right-2 inline-flex size-9 items-center justify-center rounded-xl transition-all focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-40",
                  isListening
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}
          </div>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-[68px] rounded-2xl px-5"
          >
            <Send className="size-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
