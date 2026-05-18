import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Files } from "./pages/Files";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Chat } from "./pages/Chat";
import { Graph } from "./pages/Graph";
import { Welcome } from "./pages/Welcome";
import { Settings } from "./pages/Settings";
import { History } from "./pages/History";
import { Timeline } from "./pages/Timeline";
import { Duplicates } from "./pages/Duplicates";
import { TempFiles } from "./pages/TempFiles";
import { Usage } from "./pages/Usage";
import { api } from "./lib/api";
import { Sparkles } from "lucide-react";

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const location = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    api
      .getConfig()
      .then((c) => setOnboarded(c.onboarded))
      .catch(() => setOnboarded(false));
  }, [location.pathname]);

  useEffect(() => {
    if (onboarded === false && location.pathname !== "/welcome") {
      nav("/welcome", { replace: true });
    }
  }, [onboarded, location.pathname, nav]);

  if (onboarded === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Sparkles className="w-4 h-4 text-[var(--color-ai)] animate-pulse" />
          <span className="text-[13px]">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      {onboarded ? (
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="files" element={<Files />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="graph" element={<Graph />} />
          <Route path="chat" element={<Chat />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="temp" element={<TempFiles />} />
          <Route path="usage" element={<Usage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<History />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      )}
    </Routes>
  );
}
