import { firebase, auth, db } from "./firebase";
import type { AuthResult, ReferralCodeCheck } from "@/types";

type AuthListener = (
  user: firebase.User | null,
  userType: string | null
) => void;

class AuthManager {
  currentUser: firebase.User | null = null;
  currentUserType: string | null = null;
  listeners: AuthListener[] = [];
  anonymousUser: firebase.User | null = null;
  isInitialized = false;
  private authStateUnsubscribe: (() => void) | null = null;
  private initializationPromise: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;
    if (this.isInitialized) return Promise.resolve();

    this.initializationPromise = new Promise((resolve) => {
      if (this.authStateUnsubscribe) this.authStateUnsubscribe();

      let resolved = false;

      this.authStateUnsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user && user.isAnonymous) {
          this.currentUser = null;
          this.currentUserType = null;
          this.notifyListeners();
          if (!resolved) {
            resolved = true;
            this.isInitialized = true;
            resolve();
          }
          return;
        }

        if (user) {
          this.currentUser = user;
          try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
              this.currentUserType = userDoc.data()?.userType || null;
            } else {
              this.currentUserType = null;
            }
          } catch {
            this.currentUserType = null;
          }
        } else {
          this.currentUser = null;
          this.currentUserType = null;
        }

        this.notifyListeners();

        if (!resolved) {
          resolved = true;
          this.isInitialized = true;
          resolve();
        }
      });
    });

    return this.initializationPromise;
  }

  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    this.initializationPromise = null;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.initialize();
  }

  notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentUser, this.currentUserType);
      } catch (error) {
        console.error("Erro no listener:", error);
      }
    });
  }

  generateReferralCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async ensureAnonymousAuth(): Promise<firebase.User> {
    if (auth.currentUser) return auth.currentUser;

    const credential = await auth.signInAnonymously();
    this.anonymousUser = credential.user;
    return this.anonymousUser!;
  }

  async clearAnonymousAuth(): Promise<void> {
    try {
      if (
        this.anonymousUser &&
        auth.currentUser &&
        auth.currentUser.isAnonymous
      ) {
        await auth.currentUser.delete();
        this.anonymousUser = null;
      }
    } catch {
      // Not critical
    }
  }

  async checkReferralCode(code: string): Promise<ReferralCodeCheck> {
    try {
      await this.ensureAnonymousAuth();

      const normalizedCode = code.toUpperCase().trim();

      const snapshot = await db
        .collection("users")
        .where("referralCode", "==", normalizedCode)
        .where("userType", "==", "personal")
        .get();

      if (snapshot.empty) {
        return { exists: false, error: "Codigo nao encontrado" };
      }

      const personalDoc = snapshot.docs[0];
      const personalData = personalDoc.data();

      return {
        exists: true,
        personalId: personalDoc.id,
        personalName: personalData.name,
      };
    } catch (error) {
      return {
        exists: false,
        error:
          error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  onAuthStateChanged(callback: AuthListener): void {
    this.listeners.push(callback);
    if (this.isInitialized) {
      callback(this.currentUser, this.currentUserType);
    }
  }

  async signup(
    email: string,
    password: string,
    name: string,
    userType: "personal" | "student",
    referralCode: string | null = null
  ): Promise<AuthResult> {
    try {
      if (!email || !password || !name || !userType) {
        throw new Error("Todos os campos sao obrigatorios");
      }
      if (password.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres");
      }
      if (!["personal", "student"].includes(userType)) {
        throw new Error("Tipo de usuario invalido");
      }

      let personalId: string | null = null;
      if (userType === "student") {
        if (!referralCode) {
          throw new Error(
            "Codigo de referencia do Personal e obrigatorio para alunos"
          );
        }
        const codeCheck = await this.checkReferralCode(referralCode);
        if (!codeCheck.exists) {
          throw new Error(
            `Codigo de referencia invalido: ${codeCheck.error || "Codigo invalido"}`
          );
        }
        personalId = codeCheck.personalId!;
        await this.clearAnonymousAuth();
      }

      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user!;

      const newReferralCode =
        userType === "personal" ? this.generateReferralCode() : null;

      const userData: Record<string, unknown> = {
        uid: user.uid,
        name,
        email,
        userType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (userType === "personal") {
        userData.referralCode = newReferralCode;
        userData.students = [];
      } else {
        userData.personalId = personalId;
        userData.assignedWorkouts = [];
      }

      await db.collection("users").doc(user.uid).set(userData);

      if (userType === "student" && personalId) {
        try {
          await db
            .collection("users")
            .doc(personalId)
            .update({
              students: firebase.firestore.FieldValue.arrayUnion(user.uid),
            });
        } catch {
          // Don't fail signup for this
        }
      }

      this.currentUser = user;
      this.currentUserType = userType;

      return {
        success: true,
        user,
        userType,
        referralCode: newReferralCode || undefined,
      };
    } catch (error) {
      await this.clearAnonymousAuth();

      let errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const firebaseError = error as { code?: string };

      if (firebaseError.code === "auth/email-already-in-use") {
        errorMessage = "Este email ja esta cadastrado";
      } else if (firebaseError.code === "auth/invalid-email") {
        errorMessage = "Email invalido";
      } else if (firebaseError.code === "auth/weak-password") {
        errorMessage = "Senha muito fraca";
      }

      return { success: false, error: errorMessage };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      await this.clearAnonymousAuth();

      if (!email || !password) {
        throw new Error("Email e senha sao obrigatorios");
      }

      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user!;

      const userDoc = await db.collection("users").doc(user.uid).get();
      if (!userDoc.exists) {
        throw new Error("Dados do usuario nao encontrados");
      }

      const userData = userDoc.data()!;
      this.currentUser = user;
      this.currentUserType = userData.userType;

      return { success: true, user, userType: userData.userType };
    } catch (error) {
      let errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const firebaseError = error as { code?: string };

      if (firebaseError.code === "auth/user-not-found") {
        errorMessage = "Usuario nao encontrado";
      } else if (firebaseError.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta";
      } else if (firebaseError.code === "auth/invalid-email") {
        errorMessage = "Email invalido";
      } else if (firebaseError.code === "auth/user-disabled") {
        errorMessage = "Usuario desabilitado";
      } else if (firebaseError.code === "auth/invalid-credential") {
        errorMessage = "Email ou senha incorretos";
      } else if (firebaseError.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde";
      }

      return { success: false, error: errorMessage };
    }
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      this.currentUser = null;
      this.currentUserType = null;
      this.anonymousUser = null;
      await auth.signOut();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await this.reinitialize();
      return { success: true };
    } catch (error) {
      this.currentUser = null;
      this.currentUserType = null;
      this.anonymousUser = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  getCurrentUser(): firebase.User | null {
    return this.currentUser;
  }

  getCurrentUserType(): string | null {
    return this.currentUserType;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && !this.currentUser?.isAnonymous;
  }

  isPersonal(): boolean {
    return this.currentUserType === "personal";
  }

  isStudent(): boolean {
    return this.currentUserType === "student";
  }

  cleanup(): void {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
      this.authStateUnsubscribe = null;
    }
    this.listeners = [];
  }
}

export const authManager = new AuthManager();
