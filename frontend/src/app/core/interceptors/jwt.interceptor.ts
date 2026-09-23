import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

// Anexa o token e centraliza a reacao ao 401. Nenhum service precisa saber que
// existe autenticacao: quem chama a API so lida com dado, nunca com header.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // HttpRequest e imutavel, entao a unica forma de acrescentar o header e clonar.
  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      // Token expirado ou adulterado: derruba a sessao em vez de deixar a tela
      // falhando silenciosamente a cada requisicao.
      if (err.status === 401) {
        authService.logout();
      }
      return throwError(() => err);
    }),
  );
};
