/**
 * Módulo de Autenticação
 * Gerencia cadastro, login, logout e persistência de sessão
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.currentUserType = null;
    this.listeners = [];
    this.anonymousUser = null;
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
   * Garantir autenticação anônima temporária para verificar código
   */
  async ensureAnonymousAuth() {
    try {
      // Se já está autenticado (anônimo ou não), retornar
      if (auth.currentUser) {
        console.log('Usuário já autenticado:', auth.currentUser.uid);
        return auth.currentUser;
      }

      console.log('Criando autenticação anônima temporária...');
      const credential = await auth.signInAnonymously();
      this.anonymousUser = credential.user;
      console.log('✓ Autenticação anônima criada:', this.anonymousUser.uid);
      return this.anonymousUser;
    } catch (error) {
      console.error('Erro ao criar autenticação anônima:', error);
      throw error;
    }
  }

  /**
   * Limpar autenticação anônima
   */
  async clearAnonymousAuth() {
    try {
      if (this.anonymousUser && auth.currentUser && auth.currentUser.isAnonymous) {
        console.log('Removendo autenticação anônima...');
        await auth.currentUser.delete();
        this.anonymousUser = null;
        console.log('✓ Autenticação anônima removida');
      }
    } catch (error) {
      console.error('Erro ao remover autenticação anônima:', error);
    }
  }

  /**
   * Verificar se código de referência existe
   */
  async checkReferralCode(code) {
    try {
      console.log('=== VERIFICANDO CÓDIGO ===');
      console.log('Código recebido:', code);
      
      // Garantir autenticação anônima antes de consultar
      await this.ensureAnonymousAuth();
      console.log('Autenticação garantida');
      
      const normalizedCode = code.toUpperCase().trim();
      console.log('Código normalizado:', normalizedCode);
      
      // Tentar buscar o Personal pelo código
      const snapshot = await db.collection('users')
        .where('referralCode', '==', normalizedCode)
        .where('userType', '==', 'personal')
        .get();
      
      console.log('Query executada');
      console.log('Snapshot vazio?', snapshot.empty);
      console.log('Número de docs encontrados:', snapshot.docs.length);
      
      if (snapshot.empty) {
        console.log('Nenhum Personal encontrado com este código');
        return { 
          exists: false,
          error: 'Código não encontrado'
        };
      }
      
      const personalDoc = snapshot.docs[0];
      const personalData = personalDoc.data();
      
      console.log('✓ Personal encontrado!');
      console.log('ID:', personalDoc.id);
      console.log('Nome:', personalData.name);
      console.log('Código:', personalData.referralCode);
      
      return {
        exists: true,
        personalId: personalDoc.id,
        personalName: personalData.name
      };
    } catch (error) {
      console.error('=== ERRO AO VERIFICAR CÓDIGO ===');
      console.error('Tipo do erro:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Erro completo:', error);
      
      return { 
        exists: false, 
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  /**
   * Registra um listener para mudanças de autenticação
   */
  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    
    // Verificar estado atual
    auth.onAuthStateChanged(async (user) => {
      // Ignorar usuários anônimos
      if (user && user.isAnonymous) {
        console.log('Usuário anônimo detectado, ignorando...');
        return;
      }

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
      console.log('=== INICIANDO CADASTRO ===');
      console.log('Email:', email);
      console.log('Nome:', name);
      console.log('Tipo:', userType);
      console.log('Código:', referralCode);

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
        
        console.log('Verificando código do Personal...');
        const codeCheck = await this.checkReferralCode(referralCode);
        console.log('Resultado da verificação:', codeCheck);
        
        if (!codeCheck.exists) {
          const errorMsg = codeCheck.error || 'Código inválido';
          throw new Error(`Código de referência inválido: ${errorMsg}`);
        }
        
        personalId = codeCheck.personalId;
        console.log('✓ Personal ID encontrado:', personalId);

        // Limpar autenticação anônima antes de criar conta real
        await this.clearAnonymousAuth();
      }

      // Criar usuário no Firebase Auth
      console.log('Criando usuário no Firebase Auth...');
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log('✓ Usuário criado no Auth:', user.uid);

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
        console.log('Código gerado para Personal:', newReferralCode);
      } else {
        userData.personalId = personalId;
        userData.assignedWorkouts = [];
        console.log('Aluno vinculado ao Personal ID:', personalId);
      }

      console.log('Salvando dados no Firestore...');
      console.log('Dados a serem salvos:', userData);
      await db.collection('users').doc(user.uid).set(userData);
      console.log('✓ Dados salvos com sucesso!');

      // Se é aluno, adicionar à lista de alunos do Personal
      if (userType === 'student' && personalId) {
        console.log('Adicionando aluno à lista do Personal...');
        
        try {
          // Atualizar array de students do Personal
          await db.collection('users').doc(personalId).update({
            students: firebase.firestore.FieldValue.arrayUnion(user.uid)
          });
          
          console.log('✓ Aluno adicionado à lista do Personal!');
        } catch (updateError) {
          console.error('Erro ao atualizar lista do Personal:', updateError);
          // Não falhar o cadastro por isso, pois o vínculo foi criado pelo personalId
        }
      }

      this.currentUser = user;
      this.currentUserType = userType;

      console.log('=== CADASTRO CONCLUÍDO COM SUCESSO ===');
      return {
        success: true,
        user: user,
        userType: userType,
        referralCode: newReferralCode
      };
    } catch (error) {
      console.error('=== ERRO NO CADASTRO ===');
      console.error('Erro completo:', error);
      
      // Limpar autenticação anônima em caso de erro
      await this.clearAnonymousAuth();
      
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
      // Limpar qualquer autenticação anônima antes do login
      await this.clearAnonymousAuth();

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
      this.anonymousUser = null;
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