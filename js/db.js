/**
 * Módulo de Banco de Dados
 * Operações com Firestore para usuários, exercícios e treinos
 */

class DatabaseManager {
  /**
   * Converter URL do YouTube para formato embed
   */
  convertYouTubeUrl(url) {
    if (!url || url.trim() === '') return '';
    
    // Se já está no formato embed, retornar como está
    if (url.includes('/embed/')) {
      return url;
    }
    
    // Extrair ID do vídeo de diferentes formatos de URL
    let videoId = null;
    
    // Formato: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
    
    // Formato: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
    
    // Formato: youtube.com/embed/VIDEO_ID (já tratado acima, mas por segurança)
    const embedMatch = url.match(/\/embed\/([^?]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
    
    // Se encontrou o ID, retornar URL embed
    if (videoId) {
      // Remover qualquer parâmetro extra do ID
      videoId = videoId.split('&')[0].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Se não conseguiu converter, retornar URL original
    console.warn('Não foi possível converter URL do YouTube:', url);
    return url;
  }

  /**
   * Obter dados do usuário atual
   */
  async getCurrentUserData() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) return null;

      const userDoc = await db.collection('users').doc(user.uid).get();
      return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }
  }

  /**
   * Obter dados de um usuário específico
   */
  async getUserData(uid) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }
  }

  /**
   * Obter alunos vinculados ao Personal atual
   */
  async getMyStudents() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) {
        console.log('Usuário não autenticado');
        return [];
      }

      console.log('=== BUSCANDO ALUNOS ===');
      console.log('Personal UID:', user.uid);

      const snapshot = await db.collection('users')
        .where('personalId', '==', user.uid)
        .where('userType', '==', 'student')
        .get();

      console.log('Documentos encontrados:', snapshot.docs.length);

      const students = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Aluno encontrado:', doc.id, data.name);
        students.push({
          uid: doc.id,
          ...data
        });
      });

      console.log('Total de alunos:', students.length);

      if (students.length > 0) {
        const studentIds = students.map(s => s.uid);
        try {
          await db.collection('users').doc(user.uid).update({
            students: studentIds
          });
          console.log('Lista de alunos atualizada no Personal');
        } catch (updateError) {
          console.error('Erro ao atualizar lista:', updateError);
        }
      }

      return students;
    } catch (error) {
      console.error('=== ERRO AO BUSCAR ALUNOS ===');
      console.error('Erro completo:', error);
      return [];
    }
  }

  /**
   * Criar novo exercício (com conversão automática de URL)
   */
  async createExercise(name, description, videoUrl) {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('=== CRIANDO EXERCÍCIO ===');
      console.log('Nome:', name);
      console.log('URL original:', videoUrl);

      // Converter URL do YouTube automaticamente
      const embedUrl = this.convertYouTubeUrl(videoUrl);
      console.log('URL convertida:', embedUrl);

      const exerciseRef = db.collection('exercises').doc();
      const exerciseData = {
        id: exerciseRef.id,
        name: name,
        description: description || '',
        videoUrl: embedUrl,
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('Dados a salvar:', exerciseData);

      await exerciseRef.set(exerciseData);
      console.log('✓ Exercício criado com sucesso!');

      return {
        success: true,
        id: exerciseRef.id
      };
    } catch (error) {
      console.error('=== ERRO AO CRIAR EXERCÍCIO ===');
      console.error('Erro completo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter exercícios do Personal Trainer atual (CORRIGIDO - sem orderBy)
   */
  async getPersonalExercises() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('=== BUSCANDO EXERCÍCIOS ===');
      console.log('Personal UID:', user.uid);

      // REMOVIDO orderBy para evitar erro de índice
      const snapshot = await db.collection('exercises')
        .where('createdBy', '==', user.uid)
        .get();

      console.log('Exercícios encontrados:', snapshot.docs.length);

      // Ordenar manualmente por data de criação (mais recentes primeiro)
      const exercises = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Exercício:', data.name, '- ID:', data.id);
        return data;
      }).sort((a, b) => {
        // Se não tem createdAt, colocar no final
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        // Ordenar do mais recente para o mais antigo
        return b.createdAt.seconds - a.createdAt.seconds;
      });

      console.log('Total após ordenação:', exercises.length);

      return exercises;
    } catch (error) {
      console.error('=== ERRO AO OBTER EXERCÍCIOS ===');
      console.error('Erro completo:', error);
      return [];
    }
  }

  /**
   * Obter exercício específico
   */
  async getExercise(exerciseId) {
    try {
      const doc = await db.collection('exercises').doc(exerciseId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Erro ao obter exercício:', error);
      return null;
    }
  }

  /**
   * Deletar exercício
   */
  async deleteExercise(exerciseId) {
    try {
      await db.collection('exercises').doc(exerciseId).delete();
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar exercício:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar novo treino
   */
  async createWorkout(name, description, days, studentId = null) {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const workoutRef = db.collection('workouts').doc();
      await workoutRef.set({
        id: workoutRef.id,
        name: name,
        description: description,
        personalId: user.uid,
        studentId: studentId || null,
        days: days,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      if (studentId) {
        await db.collection('users').doc(studentId).update({
          assignedWorkouts: firebase.firestore.FieldValue.arrayUnion(workoutRef.id)
        });
      }

      return {
        success: true,
        id: workoutRef.id
      };
    } catch (error) {
      console.error('Erro ao criar treino:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter treinos do Personal Trainer atual (CORRIGIDO - sem orderBy)
   */
  async getPersonalWorkouts() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // REMOVIDO orderBy para evitar erro de índice
      const snapshot = await db.collection('workouts')
        .where('personalId', '==', user.uid)
        .get();

      // Ordenar manualmente
      return snapshot.docs.map(doc => doc.data()).sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
    } catch (error) {
      console.error('Erro ao obter treinos:', error);
      return [];
    }
  }

  /**
   * Obter treinos do Aluno atual (CORRIGIDO - sem orderBy)
   */
  async getStudentWorkouts() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // REMOVIDO orderBy para evitar erro de índice
      const snapshot = await db.collection('workouts')
        .where('studentId', '==', user.uid)
        .get();

      // Ordenar manualmente
      return snapshot.docs.map(doc => doc.data()).sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
    } catch (error) {
      console.error('Erro ao obter treinos:', error);
      return [];
    }
  }

  /**
   * Obter treino específico
   */
  async getWorkout(workoutId) {
    try {
      const doc = await db.collection('workouts').doc(workoutId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Erro ao obter treino:', error);
      return null;
    }
  }

  /**
   * Deletar treino
   */
  async deleteWorkout(workoutId) {
    try {
      const workout = await this.getWorkout(workoutId);
      
      if (workout && workout.studentId) {
        await db.collection('users').doc(workout.studentId).update({
          assignedWorkouts: firebase.firestore.FieldValue.arrayRemove(workoutId)
        });
      }

      await db.collection('workouts').doc(workoutId).delete();
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar treino:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter todos os alunos vinculados
   */
  async getAllStudents() {
    return await this.getMyStudents();
  }

  /**
   * Atualizar treino
   */
  async updateWorkout(workoutId, updates) {
    try {
      await db.collection('workouts').doc(workoutId).update(updates);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar treino:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter treino por ID do Firestore
   */
  async getWorkoutById(workoutId) {
    try {
      const doc = await db.collection('workouts').doc(workoutId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter treino:', error);
      return null;
    }
  }
}

// Instância global do DatabaseManager
const dbManager = new DatabaseManager();

// Exportar para uso global
window.dbManager = dbManager;