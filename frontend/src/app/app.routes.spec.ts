import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';

// As guardas são a única barreira do front: se uma rota protegida abrir sem
// login, a tela aparece (o backend ainda recusa os dados, mas a tela não devia
// existir para essa pessoa). Navega só pelo Router, sem outlet: as rotas são
// resolvidas e as guardas rodam, mas nenhuma tela é montada.
describe('Rotas protegidas', () => {
  const USUARIO = 'canhoto_user';

  function entrarComo(role: 'CLIENTE' | 'ORGANIZADOR' | null): Router {
    localStorage.removeItem(USUARIO);
    if (role) {
      localStorage.setItem(USUARIO, JSON.stringify({ name: 'Teste', email: 't@t.com', role }));
    }
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(Router);
  }

  afterEach(() => localStorage.removeItem(USUARIO));

  for (const rota of ['/reservations', '/organizer', '/organizer/validate']) {
    it(`${rota} sem login manda para /login`, async () => {
      const router = entrarComo(null);
      await router.navigateByUrl(rota);
      expect(router.url).toBe('/login');
    });
  }

  it('cliente abre a carteira', async () => {
    const router = entrarComo('CLIENTE');
    await router.navigateByUrl('/reservations');
    expect(router.url).toBe('/reservations');
  });

  for (const rota of ['/organizer', '/organizer/validate']) {
    it(`cliente não abre ${rota}`, async () => {
      const router = entrarComo('CLIENTE');
      await router.navigateByUrl(rota);
      expect(router.url).not.toBe(rota);
    });
  }

  it('organizador abre o painel', async () => {
    const router = entrarComo('ORGANIZADOR');
    await router.navigateByUrl('/organizer');
    expect(router.url).toBe('/organizer');
  });
});
