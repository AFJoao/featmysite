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
      return userDoc.exists ? userDoc.data() : null;
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
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }
  }

  /**
   * Obter alunos vinculados ao Personal atual (CORRIGIDO)
   */
  async getMyStudents() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) {
        console.log('Usuário não autenticado');
        return [];
      }

      console.log('Buscando alunos para o Personal:', user.uid);

      // Método 1: Buscar pela lista de students no documento do Personal
      const userData = await this.getCurrentUserData();
      console.log('Dados do Personal:', userData);

      if (userData && userData.students && userData.students.length > 0) {
        console.log('IDs dos alunos na lista:', userData.students);
        
        const students = [];
        for (const studentId of userData.students) {
          const studentData = await this.getUserData(studentId);
          if (studentData) {
            students.push({
              uid: studentId,
              ...studentData
            });
          }
        }
        
        console.log('Alunos encontrados (método 1):', students.length);
        return students;
      }

      // Método 2 (fallback): Buscar alunos que tem este Personal no campo personalId
      console.log('Tentando método 2: buscar por personalId');
      const snapshot = await db.collection('users')
        .where('personalId', '==', user.uid)
        .where('userType', '==', 'student')
        .get();

      const students = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));

      console.log('Alunos encontrados (método 2):', students.length);

      // Se encontrou alunos pelo método 2, atualizar a lista no Personal
      if (students.length > 0) {
        const studentIds = students.map(s => s.uid);
        await db.collection('users').doc(user.uid).update({
          students: studentIds
        });
        console.log('Lista de alunos atualizada no Personal');
      }

      return students;
    } catch (error) {
      console.error('Erro ao obter alunos:', error);
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
   * Obter alunos do Personal Trainer atual
   */
  async getPersonalStudents() {
    try {
      const user = authManager.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar todos os treinos do personal
      const workouts = await this.getPersonalWorkouts();
      
      // Extrair IDs únicos de alunos
      const studentIds = [...new Set(workouts
        .filter(w => w.studentId)
        .map(w => w.studentId))];

      // Buscar dados dos alunos
      const students = [];
      for (const studentId of studentIds) {
        const studentData = await this.getUserData(studentId);
        if (studentData) {
          students.push({
            uid: studentId,
            ...studentData
          });
        }
      }

      return students;
    } catch (error) {
      console.error('Erro ao obter alunos:', error);
      return [];
    }
  }

  /**
   * Obter todos os usuários do tipo aluno (para seleção)
   * ATUALIZADO: Agora retorna apenas alunos vinculados ao Personal
   */
  async getAllStudents() {
    try {
      return await this.getMyStudents();
    } catch (error) {
      console.error('Erro ao obter alunos:', error);
      return [];
    }
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