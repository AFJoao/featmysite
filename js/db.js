/**
 * Módulo de Banco de Dados
 * Operações com Firestore para usuários, exercícios e treinos
 */

class DatabaseManager {
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
   * Obter alunos vinculados ao Personal atual (CORRIGIDO E SIMPLIFICADO)
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

      // Buscar TODOS os alunos que têm este Personal no campo personalId
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

      // Atualizar a lista de students no documento do Personal
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
   * Criar novo exercício
   */
  async createExercise(name, description, videoUrl) {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const exerciseRef = db.collection('exercises').doc();
      await exerciseRef.set({
        id: exerciseRef.id,
        name: name,
        description: description,
        videoUrl: videoUrl || '',
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        id: exerciseRef.id
      };
    } catch (error) {
      console.error('Erro ao criar exercício:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter exercícios do Personal Trainer atual
   */
  async getPersonalExercises() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const snapshot = await db.collection('exercises')
        .where('createdBy', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Erro ao obter exercícios:', error);
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

      // Se treino foi associado a um aluno, adicionar ID do treino ao aluno
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
   * Obter treinos do Personal Trainer atual
   */
  async getPersonalWorkouts() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const snapshot = await db.collection('workouts')
        .where('personalId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Erro ao obter treinos:', error);
      return [];
    }
  }

  /**
   * Obter treinos do Aluno atual
   */
  async getStudentWorkouts() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const snapshot = await db.collection('workouts')
        .where('studentId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data());
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
      
      // Se treino estava associado a um aluno, remover do aluno
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
   * Obter todos os alunos vinculados (simplificado)
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
   * Obter treino por ID do Firestore (para visualização do aluno)
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