import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 30) return `${days} дн. назад`;
  return formatDate(d);
}

export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  pending_approval: "На утверждении",
  in_progress: "Выполняется",
  completed: "Выполнено",
  rejected: "Отклонено",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const CATEGORY_LABELS: Record<string, string> = {
  roads: "Дороги",
  utilities: "ЖКХ",
  housing: "Жильё",
  public_transport: "Транспорт",
  parks: "Парки",
  lighting: "Освещение",
  waste: "Мусор",
  safety: "Безопасность",
  noise: "Шум",
  water: "Водоснабжение",
  heating: "Отопление",
  other: "Другое",
};

export const CATEGORY_ICONS: Record<string, string> = {
  roads: "🛣️",
  utilities: "🔧",
  housing: "🏠",
  public_transport: "🚌",
  parks: "🌳",
  lighting: "💡",
  waste: "🗑️",
  safety: "🚨",
  noise: "🔊",
  water: "💧",
  heating: "🔥",
  other: "📋",
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  akimat: "Акимат",
  city_management: "Городское управление",
  gov_services: "Госуслуги",
};

export const DEPARTMENT_COLORS: Record<string, string> = {
  akimat: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  city_management: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  gov_services: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

export function getPriorityLevel(priority: number): { label: string; color: string } {
  if (priority >= 200) return { label: "Критический", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
  if (priority >= 80) return { label: "Высокий", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" };
  if (priority >= 30) return { label: "Средний", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" };
  return { label: "Низкий", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
}
