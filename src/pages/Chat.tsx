import { useEffect, useMemo, useRef, useState } from "react";
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
  Paperclip,
  Folder,
  Plus,
  Check,
  X,
  History as HistoryIcon,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
  Zap,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import { MODELS } from "@/lib/models";
import type { ChatMessage, ChatSession, FileItem } from "@/lib/types";
import { toast } from "sonner";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { formatRelativeTime } from "@/lib/utils";

const SUGGESTIONS = [
  "我上周改的所有 PPT 在哪",
  "客户A 项目的所有文件",
  "这个月我下载了多少 PDF？",
  "哪些项目最近一周没动过？",
];

const QUICK_PROMPTS = [
  { icon: "🔍", label: "本周改过的", template: "我本周修改过的所有文件" },
  { icon: "📑", label: "找重复", template: "帮我找出可能重复的文件" },
  { icon: "🧹", label: "清理建议", template: "给我一份清理建议" },
  { icon: "📊", label: "项目梳理", template: "梳理一下我所有的项目" },
  { icon: "🎯", label: "重要文件", template: "最近一周访问最多的文件" },
];

const SLASH_COMMANDS: { cmd: string; desc: string; template: string }[] = [
  { cmd: "/find", desc: "找最近的文件", template: "我上周修改的所有 " },
  { cmd: "/dup", desc: "找出重复", template: "找出所有重复的文件" },
  { cmd: "/proj", desc: "梳理项目", template: "梳理一下 " },
  { cmd: "/recent", desc: "最近新增", template: "最近 7 天新增的文件" },
  { cmd: "/count", desc: "统计某类", template: "统计一下我有多少 " },
  { cmd: "/help", desc: "如何使用", template: "你能帮我做什么？" },
];

const STORAGE_MODEL = "filemind:chat:model";
const STORAGE_SIDEBAR = "filemind:chat:sidebar";

export function Chat() {
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const [model, setModel] = useState<string>(
    () => localStorage.getItem(STORAGE_MODEL) || "glm-4-air"
  );
  const [modelOpen, setModelOpen] = useState(false);

  const [contextFiles, setContextFiles] = useState<FileItem[]>([]);
  const [contextFolders, setContextFolders] = useState<string[]>([]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(
    () => localStorage.getItem(STORAGE_SIDEBAR) !== "0"
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODEL, model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SIDEBAR, showSidebar ? "1" : "0");
  }, [showSidebar]);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_MODEL)) {
      api.getConfig().then((c) => {
        if (c.ai.model) setModel(c.ai.model);
      }).catch(() => {});
    }
    refreshSessions();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQ) {
      newSession().then(() => {
        setInput(initialQ);
        setTimeout(() => send(initialQ), 100);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const refreshSessions = async () => {
    try {
      const list = await api.listChatSessions(100);
      setSessions(list);
    } catch {
      // ignore
    }
  };

  const ensureSession = async (firstUserMessage?: string): Promise<string> => {
    if (currentSessionId) return currentSessionId;
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const title = firstUserMessage
      ? firstUserMessage.split("\n")[0].slice(0, 40)
      : "新对话";
    try {
      await api.createChatSession(id, title);
      setCurrentSessionId(id);
      refreshSessions();
    } catch (e) {
      console.error(e);
    }
    return id;
  };

  const newSession = async () => {
    setMessages([]);
    setContextFiles([]);
    setContextFolders([]);
    setCurrentSessionId(null);
    return null;
  };

  const loadSession = async (id: string) => {
    try {
      const msgs = await api.listChatMessages(id);
      const loaded: ChatMessage[] = await Promise.all(
        msgs.map(async (m) => {
          const files: FileItem[] = [];
          if (m.file_ids && m.file_ids.length > 0) {
            for (const fid of m.file_ids.slice(0, 5)) {
              try {
                files.push(await api.getFileDetail(fid));
              } catch {
                // ignore
              }
            }
          }
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
            files: files.length > 0 ? files : undefined,
            reasoning: m.reasoning ?? undefined,
          };
        })
      );
      setMessages(loaded);
      setCurrentSessionId(id);
    } catch (e) {
      toast.error("加载会话失败：" + String(e));
    }
  };

  const deleteSession = async (id: string) => {
    if (!window.confirm("删除这个会话？")) return;
    try {
      await api.deleteChatSession(id);
      if (currentSessionId === id) {
        setMessages([]);
        setCurrentSessionId(null);
      }
      refreshSessions();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const persistMessage = async (sessionId: string, msg: ChatMessage) => {
    try {
      await api.saveChatMessage({
        id: msg.id,
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        file_ids: msg.files ? msg.files.map((f) => f.id) : null,
        reasoning: msg.reasoning ?? null,
        created_at: Math.floor(msg.timestamp),
      });
    } catch (e) {
      console.warn("persist failed", e);
    }
  };

  const showSlash = input.startsWith("/");
  const filteredSlash = useMemo(() => {
    if (!showSlash) return [];
    const q = input.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter(
      (c) =>
        c.cmd.slice(1).toLowerCase().startsWith(q) ||
        c.desc.toLowerCase().includes(q)
    );
  }, [input, showSlash]);

  const currentModel = MODELS.find((m) => m.value === model) ?? MODELS[1];

  const pickAttachFile = async () => {
    try {
      const picked = window.prompt(`输入文件名关键词来附加：`);
      if (!picked) return;
      const list = await api.searchFiles(picked, 5);
      if (list.length === 0) {
        toast.error(`没找到包含 "${picked}" 的文件`);
        return;
      }
      const match = list[0].file;
      if (contextFiles.some((f) => f.id === match.id)) {
        toast.info("已添加过");
        return;
      }
      setContextFiles((prev) => [...prev, match]);
      toast.success(`已附加：${match.name}`);
    } catch (e) {
      toast.error("加附件失败：" + String(e));
    }
  };

  const pickAttachFolder = async () => {
    try {
      const selected = await dialogOpen({
        directory: true,
        multiple: false,
        title: "选择目录作为上下文",
      });
      if (!selected || typeof selected !== "string") return;
      if (contextFolders.includes(selected)) return;
      setContextFolders((prev) => [...prev, selected]);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const send = async (text?: string) => {
    let message = (text ?? input).trim();
    if (!message || loading) return;

    if (contextFiles.length > 0) {
      const ctx = contextFiles.map((f) => `[文件:${f.name}] (id=${f.id})`).join(" ");
      message = `${message}\n\n[上下文文件]: ${ctx}`;
    }
    if (contextFolders.length > 0) {
      message += `\n\n[上下文目录]: ${contextFolders.join(", ")}`;
    }

    const sessionId = await ensureSession(message);

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
    setContextFiles([]);
    setContextFolders([]);
    setLoading(true);

    persistMessage(sessionId, userMsg);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      let acc = "";
      const final = await api.chatMessageStream(
        message,
        history,
        (chunk) => {
          if (chunk.done) return;
          acc += chunk.delta;
          setMessages((m) =>
            m.map((msg) => (msg.id === aiId ? { ...msg, content: acc } : msg))
          );
        },
        model
      );

      const files: FileItem[] = [];
      if (final.file_ids && final.file_ids.length > 0) {
        for (const id of final.file_ids.slice(0, 5)) {
          try {
            files.push(await api.getFileDetail(id));
          } catch {
            // ignore
          }
        }
      }

      const finalMsg: ChatMessage = {
        id: aiId,
        role: "assistant",
        content: final.content || acc,
        timestamp: Date.now() / 1000,
        files: files.length > 0 ? files : undefined,
        reasoning: final.reasoning,
      };
      setMessages((m) => m.map((msg) => (msg.id === aiId ? finalMsg : msg)));
      persistMessage(sessionId, finalMsg);
      refreshSessions();
    } catch (e) {
      toast.error("AI 调用失败：" + String(e));
      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiId
            ? {
                ...msg,
                content: `抱歉，我遇到了问题：${String(e)}`,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex">
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/40 overflow-hidden flex flex-col shrink-0"
          >
            <div className="p-3 border-b border-[var(--color-border-subtle)]">
              <button
                onClick={newSession}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-[12.5px] hover:bg-[var(--color-accent)]/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                新对话
              </button>
            </div>
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
              历史 · {sessions.length}
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {sessions.length === 0 && (
                <div className="px-3 py-4 text-[11px] text-[var(--color-text-tertiary)] italic">
                  还没有会话
                </div>
              )}
              {sessions.map((s) => {
                const active = currentSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`group relative px-3 py-2 rounded-md cursor-pointer ${
                      active
                        ? "bg-[var(--color-bg-card)] border border-[var(--color-border-default)]"
                        : "hover:bg-[var(--color-bg-card)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3 h-3 text-[var(--color-text-tertiary)] shrink-0" />
                      <span className="text-[12px] truncate flex-1">{s.title}</span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono mt-0.5 flex items-center gap-2">
                      <span>{s.message_count} 条</span>
                      <span>·</span>
                      <span>{formatRelativeTime(s.updated_at)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="absolute right-1 top-1 w-5 h-5 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 pt-8 pb-3 max-w-[860px] mx-auto w-full">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
                title={showSidebar ? "隐藏历史" : "显示历史"}
              >
                {showSidebar ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>
              <Sparkles className="w-5 h-5 text-[var(--color-ai)]" />
              <h1 className="text-[22px] font-display font-semibold tracking-tight">Chat</h1>
              {currentSessionId && (
                <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                  · 会话已保存
                </span>
              )}
            </div>
            <div className="relative">
              <button
                ref={modelBtnRef}
                onClick={() => setModelOpen((v) => !v)}
                className="px-2.5 py-1 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[11px] font-mono flex items-center gap-1.5 hover:bg-[var(--color-ai)]/20"
              >
                <span>{currentModel.label}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {modelOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[240px] glass-strong rounded-xl p-2 z-50 shadow-2xl"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono px-2 py-1.5">
                        切换模型
                      </div>
                      {MODELS.map((m) => {
                        const active = m.value === model;
                        return (
                          <button
                            key={m.value}
                            onClick={() => {
                              setModel(m.value);
                              setModelOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                              active ? "bg-[var(--color-bg-card)]" : "hover:bg-[var(--color-bg-card)]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[12.5px] text-[var(--color-text-primary)] font-medium">
                                {m.label}
                              </div>
                              <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                                {m.hint}
                              </div>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            用大白话问任何关于你文件的问题 · 输入{" "}
            <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] font-mono text-[10px]">
              /
            </kbd>{" "}
            看快捷命令 · ⌘N 新对话
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-4">
          <div className="max-w-[860px] mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 mb-4 glow-ai">
                  <Sparkles className="w-7 h-7 text-[var(--color-ai)]" />
                </div>
                <h2 className="text-[18px] font-display font-semibold mb-2">
                  问我任何关于你文件的事
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-5">
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
                        <div className="px-4 py-2.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[13.5px] leading-relaxed whitespace-pre-wrap">
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
                                    setExpandedReasoning((r) => ({
                                      ...r,
                                      [msg.id]: !r[msg.id],
                                    }))
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
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mr-1 self-center">
                <Zap className="inline w-3 h-3 -mt-0.5" /> 快捷
              </span>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.template)}
                  disabled={loading}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-ai)]/40 hover:bg-[var(--color-ai)]/10 hover:text-[var(--color-ai)] transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <span>{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>

            {(contextFiles.length > 0 || contextFolders.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {contextFiles.map((f) => (
                  <span
                    key={f.id}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] flex items-center gap-1.5"
                  >
                    <Paperclip className="w-3 h-3" />
                    {f.name}
                    <button
                      onClick={() => setContextFiles((prev) => prev.filter((x) => x.id !== f.id))}
                      className="hover:bg-[var(--color-ai)]/20 rounded w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {contextFolders.map((p) => (
                  <span
                    key={p}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] flex items-center gap-1.5"
                  >
                    <Folder className="w-3 h-3" />
                    <span className="max-w-[200px] truncate" title={p}>
                      {p.split("/").pop() || p}
                    </span>
                    <button
                      onClick={() => setContextFolders((prev) => prev.filter((x) => x !== p))}
                      className="hover:bg-[var(--color-accent)]/20 rounded w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <AnimatePresence>
                {showSlash && filteredSlash.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 right-0 mb-2 glass-strong rounded-xl p-1.5 shadow-2xl z-30"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono px-2 py-1">
                      快捷命令 · 6 个可用
                    </div>
                    {filteredSlash.map((c) => (
                      <button
                        key={c.cmd}
                        onClick={() => {
                          setInput(c.template);
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[var(--color-bg-card)] text-left"
                      >
                        <span className="text-[12px] font-mono text-[var(--color-ai)] shrink-0">
                          {c.cmd}
                        </span>
                        <span className="text-[12px] text-[var(--color-text-secondary)] shrink-0">
                          {c.desc}
                        </span>
                        <span className="ml-auto text-[10px] text-[var(--color-text-tertiary)] font-mono truncate">
                          {c.template}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <GlassCard variant="strong" className="p-2">
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-0.5 pl-1 pb-1">
                    <button
                      onClick={pickAttachFile}
                      className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-ai)] hover:bg-[var(--color-bg-card)] transition-colors"
                      title="附加文件作为上下文"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={pickAttachFolder}
                      className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-card)] transition-colors"
                      title="附加目录作为上下文"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                    placeholder="问任何问题... 或输入 / 看快捷命令"
                    rows={1}
                    className="flex-1 bg-transparent outline-none text-[14px] px-2 py-2 resize-none placeholder:text-[var(--color-text-tertiary)] max-h-32"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="w-9 h-9 rounded-md flex items-center justify-center bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </GlassCard>
            </div>

            <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)] text-center font-mono flex items-center justify-center gap-3">
              <span>Enter 发送</span>
              <span>·</span>
              <span>Shift+Enter 换行</span>
              <span>·</span>
              <span>/ 命令</span>
              <span>·</span>
              <span>⌘N 新对话</span>
              <span>·</span>
              <button
                onClick={newSession}
                className="hover:text-[var(--color-text-primary)] flex items-center gap-1"
              >
                <HistoryIcon className="w-3 h-3" />
                新对话
              </button>
            </div>
          </div>
        </div>
      </div>

      <FileDetailDrawer file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
