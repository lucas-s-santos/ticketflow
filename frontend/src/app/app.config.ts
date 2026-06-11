import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// provideRouter: configura o roteador com as rotas definidas em app.routes.ts
// provideHttpClient: habilita o HttpClient para requisições HTTP (obrigatório para usar inject(HttpClient))
// provideZoneChangeDetection: otimiza a detecção de mudanças agrupando eventos
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
