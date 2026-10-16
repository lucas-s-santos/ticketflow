import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
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
    // View Transitions nativas: troca de página com crossfade curto, e a capa do
    // evento "voando" da lista até o banner do detalhe (ver styles.css).
    // Navegador sem suporte só troca de página, como antes.
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    // withInterceptors: registra interceptors funcionais que processam toda requisição HTTP
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // Define pt-BR como localidade padrão da aplicação
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
