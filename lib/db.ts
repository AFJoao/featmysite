import { firebase, db } from "./firebase";
import { authManager } from "./auth";
import { convertYouTubeUrl } from "./utils";
import { getCurrentWeekIdentifier, getFeedbackKey, validateFeedbackData } from "./feedback-model";
import type { UserData, Exercise, Workout, Feedback } from "@/types";

class DatabaseManager {
  convertYouTubeUrl(url: string): string {
    return convertYouTubeUrl(url);
  }

  async getCurrentUserData(): Promise<UserData | null> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) return null;
      const userDoc = await db.collection("users").doc(user.uid).get();
      return userDoc.exists
        ? ({ id: userDoc.id, ...userDoc.data() } as UserData)
        : null;
    } catch (error) {
      console.error("Erro ao obter dados do usuario:", error);
      return null;
    }
  }

  async getUserData(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      return userDoc.exists
        ? ({ id: userDoc.id, ...userDoc.data() } as UserData)
        : null;
    } catch (error) {
      console.error("Erro ao obter dados do usuario:", error);
      return null;
    }
  }

  async getMyStudents(): Promise<UserData[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) return [];

      const snapshot = await db
        .collection("users")
        .where("personalId", "==", user.uid)
        .where("userType", "==", "student")
        .get();

      const students: UserData[] = [];
      snapshot.docs.forEach((doc) => {
        students.push({ uid: doc.id, ...doc.data() } as UserData);
      });

      if (students.length > 0) {
        const studentIds = students.map((s) => s.uid);
        try {
          await db.collection("users").doc(user.uid).update({
            students: studentIds,
          });
        } catch {
          // Non-critical
        }
      }

      return students;
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
      return [];
    }
  }

  async createExercise(
    name: string,
    description: string,
    videoUrl: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const embedUrl = convertYouTubeUrl(videoUrl);
      const exerciseRef = db.collection("exercises").doc();
      const exerciseData = {
        id: exerciseRef.id,
        name,
        description: description || "",
        videoUrl: embedUrl,
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await exerciseRef.set(exerciseData);
      return { success: true, id: exerciseRef.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async getPersonalExercises(): Promise<Exercise[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const snapshot = await db
        .collection("exercises")
        .where("createdBy", "==", user.uid)
        .get();

      return snapshot.docs
        .map((doc) => doc.data() as Exercise)
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.seconds - a.createdAt.seconds;
        });
    } catch (error) {
      console.error("Erro ao obter exercicios:", error);
      return [];
    }
  }

  async getExercise(exerciseId: string): Promise<Exercise | null> {
    try {
      const doc = await db.collection("exercises").doc(exerciseId).get();
      return doc.exists ? (doc.data() as Exercise) : null;
    } catch (error) {
      console.error("Erro ao obter exercicio:", error);
      return null;
    }
  }

  async deleteExercise(
    exerciseId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.collection("exercises").doc(exerciseId).delete();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async createWorkout(
    name: string,
    description: string,
    days: Record<string, unknown>,
    studentId: string | null = null
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const workoutRef = db.collection("workouts").doc();
      await workoutRef.set({
        id: workoutRef.id,
        name,
        description,
        personalId: user.uid,
        studentId: studentId || null,
        days,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      if (studentId) {
        await db
          .collection("users")
          .doc(studentId)
          .update({
            assignedWorkouts: firebase.firestore.FieldValue.arrayUnion(
              workoutRef.id
            ),
          });
      }

      return { success: true, id: workoutRef.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async getPersonalWorkouts(): Promise<Workout[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const snapshot = await db
        .collection("workouts")
        .where("personalId", "==", user.uid)
        .get();

      return snapshot.docs
        .map((doc) => doc.data() as Workout)
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.seconds - a.createdAt.seconds;
        });
    } catch (error) {
      console.error("Erro ao obter treinos:", error);
      return [];
    }
  }

  async getStudentWorkouts(): Promise<Workout[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const snapshot = await db
        .collection("workouts")
        .where("studentId", "==", user.uid)
        .get();

      return snapshot.docs
        .map((doc) => doc.data() as Workout)
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.seconds - a.createdAt.seconds;
        });
    } catch (error) {
      console.error("Erro ao obter treinos:", error);
      return [];
    }
  }

  async getWorkout(workoutId: string): Promise<Workout | null> {
    try {
      const doc = await db.collection("workouts").doc(workoutId).get();
      return doc.exists ? (doc.data() as Workout) : null;
    } catch (error) {
      console.error("Erro ao obter treino:", error);
      return null;
    }
  }

  async getWorkoutById(workoutId: string): Promise<Workout | null> {
    return this.getWorkout(workoutId);
  }

  async deleteWorkout(
    workoutId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workout = await this.getWorkout(workoutId);
      if (workout && workout.studentId) {
        await db
          .collection("users")
          .doc(workout.studentId)
          .update({
            assignedWorkouts:
              firebase.firestore.FieldValue.arrayRemove(workoutId),
          });
      }
      await db.collection("workouts").doc(workoutId).delete();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async updateWorkout(
    workoutId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.collection("workouts").doc(workoutId).update(updates);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async getAllStudents(): Promise<UserData[]> {
    return this.getMyStudents();
  }

  async createFeedback(
    feedbackData: Partial<Feedback>
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const feedbackDataWithStudent = {
        ...feedbackData,
        studentId: user.uid,
      };

      const validation = validateFeedbackData(
        feedbackDataWithStudent as Feedback
      );
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(", ") };
      }

      const weekIdentifier =
        feedbackData.weekIdentifier || getCurrentWeekIdentifier();
      const feedbackKeyStr = getFeedbackKey(
        user.uid,
        feedbackData.workoutId!,
        weekIdentifier,
        feedbackData.dayOfWeek!
      );

      const existingDoc = await db
        .collection("feedbacks")
        .doc(feedbackKeyStr)
        .get();
      if (existingDoc.exists) {
        return {
          success: false,
          error: "Voce ja enviou feedback para este dia nesta semana",
        };
      }

      await db
        .collection("feedbacks")
        .doc(feedbackKeyStr)
        .set({
          id: feedbackKeyStr,
          studentId: user.uid,
          workoutId: feedbackData.workoutId,
          weekIdentifier,
          dayOfWeek: feedbackData.dayOfWeek,
          effortLevel: feedbackData.effortLevel,
          sensation: feedbackData.sensation,
          hasPain: feedbackData.hasPain,
          painLocation: feedbackData.hasPain
            ? feedbackData.painLocation || ""
            : "",
          comment: feedbackData.comment || "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, id: feedbackKeyStr };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  async hasFeedbackForDay(
    workoutId: string,
    dayOfWeek: string,
    weekIdentifier?: string
  ): Promise<boolean> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) return false;

      const weekId = weekIdentifier || getCurrentWeekIdentifier();
      const feedbackKeyStr = getFeedbackKey(user.uid, workoutId, weekId, dayOfWeek);

      const doc = await db.collection("feedbacks").doc(feedbackKeyStr).get();
      return doc.exists;
    } catch {
      return false;
    }
  }

  async getStudentFeedbacks(studentId?: string): Promise<Feedback[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const targetStudentId = studentId || user.uid;

      if (targetStudentId === user.uid) {
        const snapshot = await db
          .collection("feedbacks")
          .where("studentId", "==", targetStudentId)
          .get();

        return snapshot.docs
          .map((doc) => doc.data() as Feedback)
          .sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
          });
      }

      return [];
    } catch (error) {
      console.error("Erro ao obter feedbacks:", error);
      return [];
    }
  }

  async getPersonalFeedbacks(): Promise<Feedback[]> {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const workoutsSnapshot = await db
        .collection("workouts")
        .where("personalId", "==", user.uid)
        .get();

      const workoutIds = workoutsSnapshot.docs.map((doc) => doc.id);
      if (workoutIds.length === 0) return [];

      const allFeedbacks: Feedback[] = [];

      for (const workoutId of workoutIds) {
        try {
          const feedbackSnapshot = await db
            .collection("feedbacks")
            .where("workoutId", "==", workoutId)
            .get();

          allFeedbacks.push(
            ...feedbackSnapshot.docs.map((doc) => doc.data() as Feedback)
          );
        } catch {
          // Continue with other workouts
        }
      }

      return allFeedbacks.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
    } catch (error) {
      console.error("Erro ao obter feedbacks do personal:", error);
      return [];
    }
  }

  async getFeedback(feedbackId: string): Promise<Feedback | null> {
    try {
      const doc = await db.collection("feedbacks").doc(feedbackId).get();
      return doc.exists ? (doc.data() as Feedback) : null;
    } catch {
      return null;
    }
  }
}

export const dbManager = new DatabaseManager();
