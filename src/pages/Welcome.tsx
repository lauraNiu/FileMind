import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { MODELS } from "@/lib/models";

type Step = "welcome" | "profile" | "ai" | "done";

export function Welcome() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("glm-4-air");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<null | "ok" | "fail">(null);
  const [testMsg, setTestMsg] = useState("");

  const STEPS: Step[] = ["welcome", "profile", "ai", "done"];
  const stepIdx = STEPS.indexOf(step);

  const next = () => {
    if (step === "welcome") setStep("profile");
    else if (step === "profile") {
      if (!name.trim()) {
        toast.error("先填一下名字吧");
        return;
      }
      setStep("ai");
    } else if (step === "ai") {
      if (!apiKey.trim()) {
        toast.error("请填 API Key");
        return;
      }
      setStep("done");
    }
  };

  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const test = async () => {
    setTesting(true);
    setTested(null);
    try {
      const reply = await api.testAiConnection(apiKey, model);
      setTested("ok");
      setTestMsg(reply.slice(0, 80));
      toast.success("连接成功");
    } catch (e) {
      setTested("fail");
      setTestMsg(String(e));
      toast.error("连接失败：" + String(e).slice(0, 100));
    } finally {
      setTesting(false);
    }
  };

  const finish = async () => {
    try {
      await api.saveProfile(name);
      await api.saveAiConfig(apiKey, model);
      await api.completeOnboarding();
      toast.success(`欢迎使用 FileMind，${name}`);
      setTimeout(() => nav("/"), 400);
    } catch (e) {
      toast.error("保存失败：" + String(e));
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg-base)] relative overflow-hidden">
      <div className="absolute inset-0 ring-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-[var(--color-ai)]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--color-accent)]/10 blur-3xl pointer-events-none" />

      <div className="relative w-[560px] max-w-[92vw]">
        <div className="flex items-center justify-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === stepIdx
                  ? "w-8 bg-[var(--color-ai)]"
                  : i < stepIdx
                  ? "w-4 bg-[var(--color-accent)]"
                  : "w-4 bg-[var(--color-bg-card)]"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="glass-strong rounded-2xl p-10 shadow-2xl"
          >
            {step === "welcome" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] mb-6 glow-ai"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h1 className="text-[36px] font-display font-bold tracking-tight mb-3">
                  欢迎使用 <span className="gradient-text">FileMind</span>
                </h1>
                <p className="text-[14px] text-[var(--color-text-secondary)] mb-8 leading-relaxed text-balance max-w-md mx-auto">
                  本地优先的 AI 文件管家 ——
                  帮你看清、整理、连接、回忆你电脑上的所有文件。
                </p>
                <div className="grid grid-cols-3 gap-2 mb-8 text-left">
                  {[
                    { icon: "🔍", title: "找得到", desc: "FTS5 + 语义搜索" },
                    { icon: "🧠", title: "看得清", desc: "AI 摘要 + 标签" },
                    { icon: "🕸️", title: "理得顺", desc: "关系图谱" },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                    >
                      <div className="text-[20px] mb-1">{f.icon}</div>
                      <div className="text-[12.5px] font-medium">{f.title}</div>
                      <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono mt-0.5">
                        {f.desc}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={next}
                  className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black text-[14px] font-semibold hover:bg-[var(--color-accent)]/90 transition-all hover:scale-[1.02] flex items-center gap-2 mx-auto"
                >
                  开始
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === "profile" && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                  第 1 步 · 共 3 步
                </div>
                <h2 className="text-[22px] font-display font-semibold mb-2">
                  先认识一下你 👋
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
                  告诉我怎么称呼你，会显示在右上角和报告里
                </p>
                <label className="block mb-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  你的名字
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="比如：劳拉"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[15px] outline-none focus:border-[var(--color-ai)] transition-colors"
                />
                <div className="text-[11px] text-[var(--color-text-tertiary)] mt-2 font-mono">
                  仅本地保存，不上传任何地方
                </div>
                <div className="flex justify-between mt-8">
                  <button
                    onClick={back}
                    className="px-4 py-2 rounded-md text-[12.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回
                  </button>
                  <button
                    onClick={next}
                    disabled={!name.trim()}
                    className="px-5 py-2 rounded-md bg-[var(--color-accent)] text-black text-[13px] font-medium flex items-center gap-1 disabled:opacity-30 hover:bg-[var(--color-accent)]/90"
                  >
                    下一步
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === "ai" && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                  第 2 步 · 共 3 步
                </div>
                <h2 className="text-[22px] font-display font-semibold mb-2">
                  接入 AI 大脑 ✨
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
                  填入智谱 GLM API Key，FileMind 将用它来理解你的文件 ·{" "}
                  <a
                    href="https://open.bigmodel.cn/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-ai)] hover:underline inline-flex items-center gap-0.5"
                  >
                    免费申请
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>

                <label className="block mb-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTested(null);
                    }}
                    placeholder="cdd67b27...xxx"
                    className="w-full px-4 py-3 pr-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[14px] font-mono outline-none focus:border-[var(--color-ai)] transition-colors"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <label className="block mt-4 mb-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  默认模型
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODELS.map((m) => {
                    const active = m.value === model;
                    return (
                      <button
                        key={m.value}
                        onClick={() => {
                          setModel(m.value);
                          setTested(null);
                        }}
                        className={`px-3 py-2 rounded-lg text-left border transition-colors ${
                          active
                            ? "bg-[var(--color-ai)]/15 border-[var(--color-ai)]/40 text-[var(--color-text-primary)]"
                            : "bg-[var(--color-bg-card)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                        }`}
                      >
                        <div className="text-[12.5px] font-medium flex items-center gap-1.5">
                          {m.label}
                          {active && <Check className="w-3 h-3 text-[var(--color-accent)]" />}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                          {m.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={test}
                    disabled={!apiKey.trim() || testing}
                    className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {testing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : tested === "ok" ? (
                      <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {testing ? "测试中..." : "测试连接"}
                  </button>
                  {tested === "ok" && (
                    <span className="text-[11px] text-[var(--color-accent)] font-mono truncate">
                      ✓ 通: "{testMsg}"
                    </span>
                  )}
                  {tested === "fail" && (
                    <span className="text-[11px] text-[var(--color-danger)] font-mono truncate" title={testMsg}>
                      ✗ {testMsg.slice(0, 40)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={back}
                    className="px-4 py-2 rounded-md text-[12.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回
                  </button>
                  <button
                    onClick={next}
                    disabled={!apiKey.trim()}
                    className="px-5 py-2 rounded-md bg-[var(--color-accent)] text-black text-[13px] font-medium flex items-center gap-1 disabled:opacity-30 hover:bg-[var(--color-accent)]/90"
                  >
                    下一步
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 mb-5"
                >
                  <Check className="w-8 h-8 text-[var(--color-accent)]" strokeWidth={3} />
                </motion.div>
                <h2 className="text-[24px] font-display font-semibold mb-2">
                  全部就绪
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                  你好，<span className="text-[var(--color-text-primary)] font-medium">{name}</span>。
                  <br />
                  接下来去 Dashboard 选个目录开始扫描，让 AI 帮你看清这台电脑。
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={back}
                    className="px-4 py-2.5 rounded-md text-[12.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    再看看
                  </button>
                  <button
                    onClick={finish}
                    className="px-6 py-2.5 rounded-md bg-[var(--color-accent)] text-black text-[13px] font-semibold flex items-center gap-2 hover:bg-[var(--color-accent)]/90"
                  >
                    进入 FileMind
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="text-center mt-4 text-[10px] text-[var(--color-text-tertiary)] font-mono">
          v0.4 · 本地优先 · 所有数据存 ~/Library/Application Support/FileMind/
        </div>
      </div>
    </div>
  );
}
