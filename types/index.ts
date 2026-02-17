export interface UserData {
  id: string;
  uid: string;
  name: string;
  email: string;
  userType: "personal" | "student";
  referralCode?: string;
  personalId?: string;
  students?: string[];
  assignedWorkouts?: string[];
  createdAt?: FirebaseTimestamp;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  createdBy: string;
  createdAt?: FirebaseTimestamp;
}

export interface WorkoutExercise {
  id?: string;
  exerciseId?: string | null;
  exerciseName: string;
  videoUrl?: string;
  sets: number | string;
  reps: string;
  weight?: string;
  notes?: string;
  workoutId?: string;
  workoutName?: string;
  createdAt?: number;
}

export interface WorkoutDays {
  [day: string]: WorkoutExercise[];
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  personalId: string;
  studentId: string | null;
  days: WorkoutDays;
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

export interface Feedback {
  id: string;
  studentId: string;
  workoutId: string;
  weekIdentifier: string;
  dayOfWeek: DayOfWeek;
  effortLevel: number;
  sensation: "leve" | "ideal" | "pesado";
  hasPain: boolean;
  painLocation: string;
  comment: string;
  createdAt?: FirebaseTimestamp;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  personalId: string;
  days: WorkoutDays;
  createdAt?: FirebaseTimestamp;
}

export interface WorkoutCompletion {
  userId: string;
  workoutId: string;
  completed: Record<string, boolean>;
  lastUpdated?: FirebaseTimestamp;
}

export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DayInfo {
  name: string;
  short: string;
}

export type AuthResult = {
  success: boolean;
  user?: unknown;
  userType?: string;
  referralCode?: string;
  error?: string;
};

export type ReferralCodeCheck = {
  exists: boolean;
  personalId?: string;
  personalName?: string;
  error?: string;
};
