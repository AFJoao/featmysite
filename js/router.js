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
    this.isReady = false;
    this.authReady = false;

    // Monitorar mudanças de hash
    window.addEventListener('hashchange', () => {
      if (this.authReady) {
        this.navigate(window.location.hash.slice(1));
      }
    });
  }

  /**
   * Aguardar autenticação estar pronta
   */
  async waitForAuth() {
    return new Promise((resolve) => {
      // Se já está pronto, resolver imediatamente
      if (authManager.isAuthenticated() !== undefined) {
        this.authReady = true;
        resolve();
        return;
      }

      // Aguardar até 3 segundos pela autenticação
      let attempts = 0;
      const checkAuth = setInterval(() => {
        attempts++;
        if (authManager.isAuthenticated() !== undefined || attempts > 30) {
          clearInterval(checkAuth);
          this.authReady = true;
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Navegar para uma rota
   */
  async navigate(path = '/') {
    console.log('=== NAVEGANDO PARA:', path, '===');

    // Garantir que o caminho comece com /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Aguardar autenticação estar pronta
    if (!this.authReady) {
      await this.waitForAuth();
    }

    // Verificar se é uma rota protegida
    if (this.protectedRoutes[path]) {
      const requiredType = this.protectedRoutes[path];
      
      if (!authManager.isAuthenticated()) {
        console.log('Usuário não autenticado, redirecionando para login');
        window.location.hash = '#/login';
        return;
      }

      if (authManager.getCurrentUserType() !== requiredType) {
        console.log('Tipo incorreto, redirecionando');
        const redirectPath = authManager.isPersonal() 
          ? '/personal/dashboard' 
          : '/student/dashboard';
        window.location.hash = '#' + redirectPath;
        return;
      }
    }

    // Rota pública - se usuário está autenticado, redirecionar para dashboard
    if (this.publicRoutes.includes(path) && authManager.isAuthenticated()) {
      console.log('Usuário já autenticado, redirecionando para dashboard');
      const redirectPath = authManager.isPersonal() 
        ? '/personal/dashboard' 
        : '/student/dashboard';
      window.location.hash = '#' + redirectPath;
      return;
    }

    // Carregar página
    await this.loadPage(path);
  }

  /**
   * Carregar página via AJAX
   */
  async loadPage(path) {
    const pagePath = this.routes[path];
    
    if (!pagePath) {
      console.log('Rota não encontrada:', path);
      this.loadPage('/login');
      return;
    }

    try {
      console.log('Carregando página:', pagePath);
      const response = await fetch(pagePath);
      if (!response.ok) {
        throw new Error('Página não encontrada');
      }

      const html = await response.text();
      const container = document.getElementById('app');
      
      if (container) {
        container.innerHTML = html;
        console.log('✓ HTML carregado');
        
        // Aguardar um momento para o DOM atualizar
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Executar scripts da página se existirem
        const scripts = container.querySelectorAll('script');
        console.log('Scripts encontrados:', scripts.length);
        
        for (const script of scripts) {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
          console.log('✓ Script executado');
          
          // Remover script após execução
          await new Promise(resolve => setTimeout(resolve, 10));
          document.body.removeChild(newScript);
        }

        console.log('✓ Página totalmente carregada');
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
  async init() {
    console.log('=== INICIALIZANDO ROUTER ===');
    
    // Aguardar autenticação estar pronta
    await this.waitForAuth();
    
    this.isReady = true;
    const initialPath = window.location.hash.slice(1) || '/';
    console.log('Caminho inicial:', initialPath);
    
    await this.navigate(initialPath);
  }
}

// Instância global do Router
const router = new Router();

// Exportar para uso global
window.router = router;

// Inicializar roteamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM pronto, inicializando router...');
  router.init();
});