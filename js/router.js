/**
 * Módulo de Roteamento
 * Gerencia navegação entre páginas e proteção de rotas
 */

class Router {
  constructor() {
    this.routes = {
      '/': 'pages/login.html',
      '/login': 'pages/login.html',
      '/signup': 'pages/signup.html',
      '/personal/dashboard': 'pages/personal/dashboard.html',
      '/personal/exercises': 'pages/personal/exercises.html',
      '/personal/create-workout': 'pages/personal/create-workout.html',
      '/student/dashboard': 'pages/student/dashboard.html',
      '/student/view-workout': 'pages/student/view-workout.html'
    };

    this.protectedRoutes = {
      '/personal/dashboard': 'personal',
      '/personal/exercises': 'personal',
      '/personal/create-workout': 'personal',
      '/student/dashboard': 'student',
      '/student/view-workout': 'student'
    };

    this.publicRoutes = ['/login', '/signup', '/'];

    // Monitorar mudanças de hash
    window.addEventListener('hashchange', () => this.navigate(window.location.hash.slice(1)));
    
    // Aguardar autenticação estar pronta antes de navegar
    this.isReady = false;
  }

  /**
   * Navegar para uma rota
   */
  navigate(path = '/') {
    // Garantir que o caminho comece com /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Verificar se é uma rota protegida
    if (this.protectedRoutes[path]) {
      const requiredType = this.protectedRoutes[path];
      
      if (!authManager.isAuthenticated()) {
        // Usuário não autenticado, redirecionar para login
        window.location.hash = '#/login';
        return;
      }

      if (authManager.getCurrentUserType() !== requiredType) {
        // Usuário autenticado mas tipo incorreto
        const redirectPath = authManager.isPersonal() 
          ? '/personal/dashboard' 
          : '/student/dashboard';
        window.location.hash = '#' + redirectPath;
        return;
      }
    }

    // Rota pública - se usuário está autenticado, redirecionar para dashboard
    if (this.publicRoutes.includes(path) && authManager.isAuthenticated()) {
      const redirectPath = authManager.isPersonal() 
        ? '/personal/dashboard' 
        : '/student/dashboard';
      window.location.hash = '#' + redirectPath;
      return;
    }

    // Carregar página
    this.loadPage(path);
  }

  /**
   * Carregar página via AJAX
   */
  async loadPage(path) {
    const pagePath = this.routes[path];
    
    if (!pagePath) {
      // Rota não encontrada
      this.loadPage('/login');
      return;
    }

    try {
      const response = await fetch(pagePath);
      if (!response.ok) {
        throw new Error('Página não encontrada');
      }

      const html = await response.text();
      const container = document.getElementById('app');
      
      if (container) {
        container.innerHTML = html;
        
        // Executar scripts da página se existirem
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
          // Remover script após execução para evitar duplicação
          setTimeout(() => document.body.removeChild(newScript), 100);
        });
      }

      // Atualizar URL
      if (window.location.hash !== '#' + path) {
        window.location.hash = '#' + path;
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
      document.getElementById('app').innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Erro ao carregar página</h2>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">Recarregar</button>
        </div>
      `;
    }
  }

  /**
   * Ir para página de login
   */
  goToLogin() {
    this.navigate('/login');
  }

  /**
   * Ir para página de cadastro
   */
  goToSignup() {
    this.navigate('/signup');
  }

  /**
   * Ir para dashboard do Personal
   */
  goToPersonalDashboard() {
    this.navigate('/personal/dashboard');
  }

  /**
   * Ir para dashboard do Aluno
   */
  goToStudentDashboard() {
    this.navigate('/student/dashboard');
  }

  /**
   * Ir para página de criar treino
   */
  goToCreateWorkout() {
    this.navigate('/personal/create-workout');
  }

  /**
   * Ir para página de gerenciar exercícios
   */
  goToExercises() {
    this.navigate('/personal/exercises');
  }

  /**
   * Ir para página de visualizar treino
   */
  goToViewWorkout() {
    this.navigate('/student/view-workout');
  }

  /**
   * Inicializar router
   */
  init() {
    // Aguardar um momento para autenticação estar pronta
    setTimeout(() => {
      this.isReady = true;
      const initialPath = window.location.hash.slice(1) || '/';
      this.navigate(initialPath);
    }, 500);
  }
}

// Instância global do Router
const router = new Router();

// Exportar para uso global
window.router = router;

// Inicializar roteamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  router.init();
});