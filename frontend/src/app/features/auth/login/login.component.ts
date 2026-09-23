import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto px-6 py-16 md:py-24">

      <p class="etiqueta text-acento-texto mb-3">Sua conta</p>
      <h1 class="text-titulo-md font-semibold text-tinta-900 mb-10">Entrar no Canhoto</h1>

      <div class="bilhete p-7 mb-6" style="--recorte-y: 50%">
        @if (mensagemErro()) {
          <div class="aviso-erro mb-6">{{ mensagemErro() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()" class="space-y-5">
          <div>
            <label for="email" class="campo-rotulo">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="email" class="campo" />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <p class="campo-erro">Informe um e-mail válido</p>
            }
          </div>

          <div>
            <label for="senha" class="campo-rotulo">Senha</label>
            <input id="senha" type="password" formControlName="password" autocomplete="current-password" class="campo" />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="campo-erro">Informe sua senha</p>
            }
          </div>

          <button type="submit" [disabled]="carregando()" class="btn-principal w-full py-3">
            {{ carregando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>

      <!-- Acesso de demonstracao: sem isto, quem avalia o projeto precisa criar
           uma conta antes de ver qualquer coisa — e a maioria simplesmente sai. -->
      <div class="border border-dashed border-papel-400 p-5">
        <p class="etiqueta text-tinta-500 mb-1">Avaliando o projeto?</p>
        <p class="text-sm text-tinta-600 mb-4">
          Entre com uma conta pronta, sem cadastro.
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="entrarComoDemo('cliente@demo.com')"
                  [disabled]="carregando()" class="btn-contorno btn-pequeno">
            Entrar como cliente
          </button>
          <button type="button" (click)="entrarComoDemo('organizador@demo.com')"
                  [disabled]="carregando()" class="btn-contorno btn-pequeno">
            Entrar como organizador
          </button>
        </div>
      </div>

      <p class="mt-8 text-center text-sm text-tinta-500">
        Não tem conta?
        <a routerLink="/register" class="link font-medium">Criar uma agora</a>
      </p>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(false);
  readonly mensagemErro = signal('');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.autenticar(email!, password!);
  }

  entrarComoDemo(email: string): void {
    this.form.patchValue({ email, password: 'demo123' });
    this.autenticar(email, 'demo123');
  }

  private autenticar(email: string, senha: string): void {
    this.carregando.set(true);
    this.mensagemErro.set('');

    this.auth.login({ email, password: senha }).subscribe({
      next: () => this.router.navigate(['/events']),
      error: (err) => {
        this.mensagemErro.set(err.error?.message ?? 'E-mail ou senha inválidos.');
        this.carregando.set(false);
      },
    });
  }
}
