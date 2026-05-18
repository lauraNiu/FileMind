import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  FileItem,
  Project,
  DashboardStats,
  SearchResult,
  RelatedFile,
  GraphData,
  ScanResult,
  ScanProgressEvent,
  StreamChunk,
  EnrichResult,
} from "./types";

export const api = {
  dashboardStats: () => invoke<DashboardStats>("dashboard_stats"),

  listFiles: (limit = 50, offset = 0) =>
    invoke<FileItem[]>("list_files", { limit, offset }),

  searchFiles: (query: string, limit = 30) =>
    invoke<SearchResult[]>("search_files", { query, limit }),

  getFileDetail: (id: string) => invoke<FileItem>("get_file_detail", { id }),

  getRelatedFiles: (id: string) =>
    invoke<RelatedFile[]>("get_related_files", { id }),

  listProjects: () => invoke<Project[]>("list_projects"),

  getProject: (id: string) => invoke<Project>("get_project", { id }),

  getProjectFiles: (id: string) =>
    invoke<FileItem[]>("get_project_files", { id }),

  getGraphData: (focusId?: string, limit = 80) =>
    invoke<GraphData>("get_graph_data", {
      focusId: focusId ?? null,
      limit,
    }),

  chatMessage: (
    message: string,
    history: { role: string; content: string }[]
  ) =>
    invoke<{ content: string; reasoning?: string; file_ids?: string[] }>(
      "chat_message",
      { message, history }
    ),

  chatMessageStream: async (
    message: string,
    history: { role: string; content: string }[],
    onChunk: (chunk: StreamChunk) => void
  ) => {
    const streamId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const eventName = `chat-stream-${streamId}`;
    const unlisten = await listen<StreamChunk>(eventName, (event) => {
      onChunk(event.payload);
    });
    try {
      const final = await invoke<{
        content: string;
        reasoning?: string;
        file_ids?: string[];
      }>("chat_message_stream", { streamId, message, history });
      return final;
    } finally {
      unlisten();
    }
  },

  regenerateSummary: (id: string) =>
    invoke<string>("regenerate_summary", { id }),

  scanDirectory: (path: string, maxFiles?: number) =>
    invoke<ScanResult>("scan_directory", {
      path,
      maxFiles: maxFiles ?? null,
    }),

  onScanProgress: (cb: (e: ScanProgressEvent) => void) =>
    listen<ScanProgressEvent>("scan-progress", (event) => cb(event.payload)),

  clearAllData: () => invoke<void>("clear_all_data"),

  enrichGraph: (useAi: boolean, maxFiles?: number) =>
    invoke<EnrichResult>("enrich_graph", {
      useAi,
      maxFiles: maxFiles ?? null,
    }),
};
