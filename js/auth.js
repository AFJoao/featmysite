/**
 * Módulo de Autenticação
 * Gerencia cadastro, login, logout e persistência de sessão
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.currentUserType = null;
    this.listeners = [];
  }

  /**
   * Registra um listener para mudanças de autenticação
   */
  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    
    // Verificar estado atual
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        // Buscar tipo de usuário no Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          this.currentUserType = userDoc.data().userType;
        }
      } else {
        this.currentUser = null;
        this.currentUserType = null;
      }
      
      // Notificar todos os listeners
      this.listeners.forEach(cb => cb(user, this.currentUserType));
    });
  }

  /**
   * Cadastro de novo usuário
   * @param {string} email 
   * @param {string} password 
   * @param {string} name 
   * @param {string} userType - "personal" ou "student"
   */
  async signup(email, password, name, userType) {
    try {
      // Validar entrada
      if (!email || !password || !name || !userType) {
        throw new Error('Todos os campos são obrigatórios');
      }

      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      if (!['personal', 'student'].includes(userType)) {
        throw new Error('Tipo de usuário inválido');
      }

      // Criar usuário no Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Salvar dados do usuário no Firestore
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name: name,
        email: email,
        userType: userType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        students: userType === 'personal' ? [] : []
      });

      this.currentUser = user;
      this.currentUserType = userType;

      return {
        success: true,
        user: user,
        userType: userType
      };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login de usuário existente
   * @param {string} email 
   * @param {string} password 
   */
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios');
      }

      // Autenticar no Firebase Auth
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Buscar tipo de usuário no Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        throw new Error('Dados do usuário não encontrados');
      }

      const userData = userDoc.data();
      this.currentUser = user;
      this.currentUserType = userData.userType;

      return {
        success: true,
        user: user,
        userType: userData.userType
      };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout do usuário atual
   */
  async logout() {
    try {
      await auth.signOut();
      this.currentUser = null;
      this.currentUserType = null;
      return { success: true };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter usuário atual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Obter tipo de usuário atual
   */
  getCurrentUserType() {
    return this.currentUserType;
  }

  /**
   * Verificar se usuário está autenticado
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Verificar se usuário é Personal Trainer
   */
  isPersonal() {
    return this.currentUserType === 'personal';
  }

  /**
   * Verificar se usuário é Aluno
   */
  isStudent() {
    return this.currentUserType === 'student';
  }
}

// Instância global do AuthManager
const authManager = new AuthManager();

// Exportar para uso global
window.authManager = authManager;
