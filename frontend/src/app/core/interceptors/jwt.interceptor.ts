import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

// Interceptor funcional (Angular 15+): uma função pura, sem classe, sem @Injectable.
// O Angular injeta automaticamente em toda requisição HTTP quando registrado via withInterceptors().
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Se há token, clona a requisição adicionando o header Authorization.
  // Clonar é necessário porque HttpRequest é imutável por design.
  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      // 401 = token expirado ou inválido → faz logout automático
      if (err.status === 401) {
        authService.logout();
      }
      return throwError(() => err);
    }),
  );
};
