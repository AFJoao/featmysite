import type { Feedback, DayOfWeek } from "@/types";

const VALID_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function getCurrentWeekIdentifier(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear =
    (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil(
    (pastDaysOfYear + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-${weekNumber}`;
}

export function getFeedbackKey(
  studentId: string,
  workoutId: string,
  weekIdentifier: string,
  dayOfWeek: string
): string {
  return `${studentId}_${workoutId}_${weekIdentifier}_${dayOfWeek}`;
}

export function validateFeedbackData(data: Partial<Feedback>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.studentId || typeof data.studentId !== "string") {
    errors.push("studentId e obrigatorio");
  }
  if (!data.workoutId || typeof data.workoutId !== "string") {
    errors.push("workoutId e obrigatorio");
  }
  if (!data.weekIdentifier || typeof data.weekIdentifier !== "string") {
    errors.push("weekIdentifier e obrigatorio");
  }
  if (
    !data.dayOfWeek ||
    !VALID_DAYS.includes(data.dayOfWeek as DayOfWeek)
  ) {
    errors.push("dayOfWeek invalido");
  }
  if (
    typeof data.effortLevel !== "number" ||
    data.effortLevel < 1 ||
    data.effortLevel > 10
  ) {
    errors.push("effortLevel deve ser um numero entre 1 e 10");
  }
  if (!["leve", "ideal", "pesado"].includes(data.sensation || "")) {
    errors.push('sensation deve ser "leve", "ideal" ou "pesado"');
  }
  if (typeof data.hasPain !== "boolean") {
    errors.push("hasPain deve ser boolean");
  }
  if (
    data.hasPain &&
    (!data.painLocation || data.painLocation.trim() === "")
  ) {
    errors.push("painLocation e obrigatorio quando hasPain e true");
  }

  return { isValid: errors.length === 0, errors };
}
