import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import type { ChatMessage, FileItem } from "@/lib/types";
import { toast } from "sonner";

const SUGGESTIONS = [
  "我上周改的所有 PPT 在哪",
  "客户A 项目的所有文件",
  "这个月我下载了多少 PDF？",
  "哪些项目最近一周没动过？",
];

export function Chat() {
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQ) {
      setInput(initialQ);
      setTimeout(() => send(initialQ), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: message,
      timestamp: Date.now() / 1000,
    };
    const aiId = `a_${Date.now()}`;
    const aiPlaceholder: ChatMessage = {
      id: aiId,
      role: "assistant",
      content: "",
      timestamp: Date.now() / 1000,
    };
    setMessages((m) => [...m, userMsg, aiPlaceholder]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      let acc = "";
      const final = await api.chatMessageStream(message, history, (chunk) => {
        if (chunk.done) return;
        acc += chunk.delta;
        setMessages((m) =>
          m.map((msg) => (msg.id === aiId ? { ...msg, content: acc } : msg))
        );
      });

      const files: FileItem[] = [];
      if (final.file_ids && final.file_ids.length > 0) {
        for (const id of final.file_ids.slice(0, 5)) {
          try {
            const f = await api.getFileDetail(id);
            files.push(f);
          } catch {
            // ignore
          }
        }
      }

      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiId
            ? {
                ...msg,
                content: final.content || acc,
                files: files.length > 0 ? files : undefined,
                reasoning: final.reasoning,
              }
            : msg
        )
      );
    } catch (e) {
      toast.error("AI 调用失败：" + String(e));
      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiId
            ? {
                ...msg,
                content: `抱歉，我遇到了问题：${String(e)}\n\n请检查 .env 中的 ZHIPU_API_KEY 是否正确。`,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-8 pb-4 max-w-[860px] mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[var(--color-ai)]" />
          <h1 className="text-[24px] font-display font-semibold tracking-tight">Chat</h1>
          <span className="text-[11px] font-mono text-[var(--color-text-tertiary)] ml-2 px-2 py-0.5 rounded-full border border-[var(--color-ai)]/30 bg-[var(--color-ai)]/5 text-[var(--color-ai)]">
            GLM-4
          </span>
        </div>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          用大白话问任何关于你文件的问题
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-4">
        <div className="max-w-[860px] mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="mt-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 mb-4 glow-ai">
                <Sparkles className="w-7 h-7 text-[var(--color-ai)]" />
              </div>
              <h2 className="text-[18px] font-display font-semibold mb-2">
                问我任何关于你文件的事
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
                我可以搜索、统计、关联，帮你找到答案
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-[600px] mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              const streaming = isLast && loading && msg.role === "assistant";
              const emptyStreaming = streaming && !msg.content;
              return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={msg.role === "user" ? "flex justify-end" : ""}
              >
                {msg.role === "user" ? (
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="px-4 py-2.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[13.5px] leading-relaxed">
                      {msg.content}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
                      <UserIcon className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 flex items-center justify-center shrink-0 mt-0.5">
                      {streaming ? (
                        <RotateCw className="w-3.5 h-3.5 text-[var(--color-ai)] animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[var(--color-ai)]" />
                      )}
                    </div>
                    <div className="flex-1 space-y-3 min-w-0">
                      <GlassCard className="p-4">
                        {emptyStreaming ? (
                          <div className="flex items-center gap-1.5 py-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-[var(--color-ai)]"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                            <span className="text-[12px] text-[var(--color-text-tertiary)] ml-2">
                              正在思考...
                            </span>
                          </div>
                        ) : (
                          <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)]">
                            {msg.content}
                            {streaming && (
                              <span className="inline-block w-[6px] h-[14px] bg-[var(--color-ai)] ml-0.5 align-text-bottom animate-pulse" />
                            )}
                          </div>
                        )}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-3 space-y-1 -mx-1">
                            {msg.files.map((f) => (
                              <FileRow key={f.id} file={f} onClick={() => setOpenFile(f)} />
                            ))}
                          </div>
                        )}
                        {msg.reasoning && (
                          <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                            <button
                              onClick={() =>
                                setExpandedReasoning((r) => ({ ...r, [msg.id]: !r[msg.id] }))
                              }
                              className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] flex items-center gap-1"
                            >
                              {expandedReasoning[msg.id] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              我是怎么找到的
                            </button>
                            <AnimatePresence>
                              {expandedReasoning[msg.id] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)] font-mono whitespace-pre-wrap pl-3 border-l border-[var(--color-border-subtle)]">
                                    {msg.reasoning}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </GlassCard>
                      {!streaming && (
                        <div className="flex items-center gap-1 px-1">
                          <button className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-card)]">
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-card)]">
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="p-4 px-8">
        <div className="max-w-[860px] mx-auto">
          <GlassCard variant="strong" className="p-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="问任何问题..."
              rows={1}
              className="flex-1 bg-transparent outline-none text-[14px] px-3 py-2 resize-none placeholder:text-[var(--color-text-tertiary)] max-h-32"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-md flex items-center justify-center bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </GlassCard>
          <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)] text-center font-mono">
            Enter 发送 · Shift+Enter 换行 · ↑ 历史
          </div>
        </div>
      </div>

      <FileDetailDrawer file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
