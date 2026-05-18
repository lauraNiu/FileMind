export interface ModelOption {
  value: string;
  label: string;
  hint: string;
  tier: "free" | "fast" | "smart" | "experimental";
}

export const MODELS: ModelOption[] = [
  { value: "glm-4-flash", label: "GLM-4 Flash", hint: "免费 · 快", tier: "free" },
  { value: "glm-4-air", label: "GLM-4 Air", hint: "推荐 · 便宜稳", tier: "fast" },
  { value: "glm-4-airx", label: "GLM-4 AirX", hint: "更聪明", tier: "fast" },
  { value: "glm-4-plus", label: "GLM-4 Plus", hint: "顶级 · 贵", tier: "smart" },
  { value: "glm-4", label: "GLM-4", hint: "经典版本", tier: "smart" },
  { value: "glm-5", label: "GLM-5", hint: "实验 · 可能 404", tier: "experimental" },
  { value: "glm-5.1", label: "GLM-5.1", hint: "实验 · 可能 404", tier: "experimental" },
];

export function findModel(value: string): ModelOption | undefined {
  return MODELS.find((m) => m.value === value);
}
