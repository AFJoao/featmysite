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
   * Gerar código único para Personal Trainer
   */
  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verificar se código de referência existe
   */
  async checkReferralCode(code) {
    try {
      const snapshot = await db.collection('users')
        .where('referralCode', '==', code.toUpperCase())
        .where('userType', '==', 'personal')
        .get();
      
      if (snapshot.empty) {
        return { exists: false };
      }
      
      const personalData = snapshot.docs[0].data();
      return {
        exists: true,
        personalId: personalData.uid,
        personalName: personalData.name
      };
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      return { exists: false };
    }
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
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            this.currentUserType = userDoc.data().userType;
          }
        } catch (error) {
          console.error('Erro ao buscar tipo de usuário:', error);
        }
      } else {
        this.currentUser = null;
        this.currentUserType = null;
      }
      
      // Notificar todos os listeners
      this.listeners.forEach(cb => {
        try {
          cb(this.currentUser, this.currentUserType);
        } catch (error) {
          console.error('Erro no listener:', error);
        }
      });
    });
  }

  /**
   * Cadastro de novo usuário
   */
  async signup(email, password, name, userType, referralCode = null) {
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

      // Se é aluno, verificar código de referência
      let personalId = null;
      if (userType === 'student') {
        if (!referralCode) {
          throw new Error('Código de referência do Personal é obrigatório para alunos');
        }
        
        const codeCheck = await this.checkReferralCode(referralCode);
        if (!codeCheck.exists) {
          throw new Error('Código de referência inválido');
        }
        
        personalId = codeCheck.personalId;
        console.log('Personal ID encontrado:', personalId);
      }

      // Criar usuário no Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log('Usuário criado no Auth:', user.uid);

      // Gerar código de referência para Personal
      const newReferralCode = userType === 'personal' ? this.generateReferralCode() : null;

      // Salvar dados do usuário no Firestore
      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        userType: userType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (userType === 'personal') {
        userData.referralCode = newReferralCode;
        userData.students = [];
      } else {
        userData.personalId = personalId;
        userData.assignedWorkouts = [];
      }

      await db.collection('users').doc(user.uid).set(userData);
      console.log('Dados do usuário salvos no Firestore');

      // Se é aluno, adicionar à lista de alunos do Personal
      if (userType === 'student' && personalId) {
        console.log('Adicionando aluno ao Personal:', personalId);
        
        try {
          // Buscar documento do Personal
          const personalDoc = await db.collection('users').doc(personalId).get();
          
          if (personalDoc.exists) {
            const personalData = personalDoc.data();
            const currentStudents = personalData.students || [];
            
            // Adicionar novo aluno se ainda não estiver na lista
            if (!currentStudents.includes(user.uid)) {
              await db.collection('users').doc(personalId).update({
                students: firebase.firestore.FieldValue.arrayUnion(user.uid)
              });
              console.log('Aluno adicionado com sucesso ao Personal');
            }
          } else {
            console.error('Documento do Personal não encontrado');
          }
        } catch (error) {
          console.error('Erro ao adicionar aluno ao Personal:', error);
        }
      }

      this.currentUser = user;
      this.currentUserType = userType;

      return {
        success: true,
        user: user,
        userType: userType,
        referralCode: newReferralCode
      };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      let errorMessage = error.message;
      
      // Traduzir erros comuns do Firebase
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está cadastrado';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Login de usuário existente
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
      let errorMessage = error.message;
      
      // Traduzir erros comuns do Firebase
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Usuário desabilitado';
      }
      
      return {
        success: false,
        error: errorMessage
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