import type { DayOfWeek, DayInfo } from "@/types";

export const DAYS_MAP: Record<DayOfWeek, DayInfo> = {
  monday: { name: "Segunda", short: "SEG" },
  tuesday: { name: "Terca", short: "TER" },
  wednesday: { name: "Quarta", short: "QUA" },
  thursday: { name: "Quinta", short: "QUI" },
  friday: { name: "Sexta", short: "SEX" },
  saturday: { name: "Sabado", short: "SAB" },
  sunday: { name: "Domingo", short: "DOM" },
};

export const DAYS_MAP_FULL: Record<DayOfWeek, string> = {
  monday: "Segunda-feira",
  tuesday: "Terca-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sabado",
  sunday: "Domingo",
};

export const DAYS_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const SENSATION_MAP: Record<string, string> = {
  leve: "Leve",
  ideal: "Ideal",
  pesado: "Pesado",
};

export function escapeHtml(unsafe: unknown): string {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateId(): string {
  return "id_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
}

export function convertYouTubeUrl(url: string): string {
  if (!url || url.trim() === "") return "";
  if (url.includes("/embed/")) return url;

  let videoId: string | null = null;

  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) videoId = watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) videoId = shortMatch[1];

  const embedMatch = url.match(/\/embed\/([^?]+)/);
  if (embedMatch) videoId = embedMatch[1];

  if (videoId) {
    videoId = videoId.split("&")[0].split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}

export function getTodayDay(): DayOfWeek {
  const today = new Date().getDay();
  const dayIndex = today === 0 ? 6 : today - 1;
  return DAYS_ORDER[dayIndex];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
