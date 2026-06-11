import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-1">Criar conta</h2>
        <p class="text-sm text-gray-500 mb-6">Junte-se ao TicketFlow</p>

        @if (errorMsg()) {
          <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {{ errorMsg() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              formControlName="name"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Seu nome completo"
            />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <p class="mt-1 text-xs text-red-600">Nome obrigatório</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              formControlName="email"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="voce@email.com"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <p class="mt-1 text-xs text-red-600">E-mail inválido</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              formControlName="password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Mínimo 6 caracteres"
            />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="mt-1 text-xs text-red-600">Mínimo 6 caracteres</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de conta</label>
            <select
              formControlName="role"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="CLIENTE">Cliente — comprar ingressos</option>
              <option value="ORGANIZADOR">Organizador — criar eventos</option>
            </select>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {{ loading() ? 'Cadastrando...' : 'Criar conta' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-500">
          Já tem conta?
          <a routerLink="/login" class="text-indigo-600 font-medium hover:underline">Entrar</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENTE' as 'CLIENTE' | 'ORGANIZADOR', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const { name, email, password, role } = this.form.getRawValue();
    this.authService.register({ name: name!, email: email!, password: password!, role: role! }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.errorMsg.set(err.error?.message ?? 'Erro ao criar conta. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
