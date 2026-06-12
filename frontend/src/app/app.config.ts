import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

// Registra os dados da localidade pt-BR (formatação de moeda, número e data).
// Sem isso, pipes como currency:...:'pt-BR' lançam NG0701 em runtime e quebram a tela.
registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // withInterceptors: registra interceptors funcionais que processam toda requisição HTTP
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // Define pt-BR como localidade padrão da aplicação
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
