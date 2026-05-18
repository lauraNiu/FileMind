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
  TagCount,
  DayCount,
  AppConfig,
  OperationRecord,
} from "./types";

export const api = {
  // Read
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
  topTags: (limit = 15) => invoke<TagCount[]>("top_tags", { limit }),
  activityTimeline: (days = 30) =>
    invoke<DayCount[]>("activity_timeline", { days }),

  // AI
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
    onChunk: (chunk: StreamChunk) => void,
    model?: string
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
      }>("chat_message_stream", {
        streamId,
        message,
        history,
        model: model ?? null,
      });
      return final;
    } finally {
      unlisten();
    }
  },

  regenerateSummary: (id: string) =>
    invoke<string>("regenerate_summary", { id }),

  testAiConnection: (apiKey?: string, model?: string) =>
    invoke<string>("test_ai_connection", {
      apiKey: apiKey ?? null,
      model: model ?? null,
    }),

  // Scan
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

  // Tags
  updateFileTags: (id: string, tags: string[]) =>
    invoke<void>("update_file_tags", { id, tags }),

  // Config / Profile
  getConfig: () => invoke<AppConfig>("get_config"),
  saveProfile: (name: string, avatarInitial?: string) =>
    invoke<AppConfig>("save_profile", {
      name,
      avatarInitial: avatarInitial ?? null,
    }),
  saveAiConfig: (apiKey?: string, model?: string, budgetYuan?: number) =>
    invoke<AppConfig>("save_ai_config", {
      apiKey: apiKey ?? null,
      model: model ?? null,
      budgetYuan: budgetYuan ?? null,
    }),
  saveScanConfig: (
    excludedDirs?: string[],
    sensitiveDirs?: string[],
    maxFilesPerScan?: number
  ) =>
    invoke<AppConfig>("save_scan_config", {
      excludedDirs: excludedDirs ?? null,
      sensitiveDirs: sensitiveDirs ?? null,
      maxFilesPerScan: maxFilesPerScan ?? null,
    }),
  completeOnboarding: () => invoke<void>("complete_onboarding"),
  logout: () => invoke<void>("logout"),

  // File ops
  revealInFinder: (path: string) =>
    invoke<void>("reveal_in_finder", { path }),
  openWithDefault: (path: string) =>
    invoke<void>("open_with_default", { path }),
  moveFile: (fileId: string, newDir: string, reason?: string) =>
    invoke<OperationRecord>("move_file", {
      fileId,
      newDir,
      reason: reason ?? null,
    }),
  renameFile: (fileId: string, newName: string, reason?: string) =>
    invoke<OperationRecord>("rename_file", {
      fileId,
      newName,
      reason: reason ?? null,
    }),
  trashFile: (fileId: string, reason?: string) =>
    invoke<OperationRecord>("trash_file", {
      fileId,
      reason: reason ?? null,
    }),
  revertOperation: (opId: string) =>
    invoke<void>("revert_operation", { opId }),
  listOperations: (limit = 100) =>
    invoke<OperationRecord[]>("list_operations", { limit }),
};
