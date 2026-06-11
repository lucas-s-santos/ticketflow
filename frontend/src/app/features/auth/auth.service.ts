import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { LoginRequest, RegisterRequest, AuthResponse, StoredUser } from './auth.model';

const TOKEN_KEY = 'ticketflow_token';
const USER_KEY = 'ticketflow_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // signal(): valor reativo. Quando muda, componentes que o leem atualizam automaticamente.
  readonly currentUser = signal<StoredUser | null>(this.loadUserFromStorage());

  // computed(): derivado de outro signal. Recalculado automaticamente quando currentUser muda.
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isOrganizador = computed(() => this.currentUser()?.role === 'ORGANIZADOR');

  login(body: LoginRequest): Observable<void> {
    return this.api.post<AuthResponse>('/auth/login', body).pipe(
      tap(res => this.persistSession(res)),
      map(() => void 0),
    );
  }

  register(body: RegisterRequest): Observable<void> {
    return this.api.post<AuthResponse>('/auth/register', body).pipe(
      tap(res => this.persistSession(res)),
      map(() => void 0),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persistSession(res: AuthResponse): void {
    const user: StoredUser = { name: res.name, email: res.email, role: res.role };
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUserFromStorage(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
