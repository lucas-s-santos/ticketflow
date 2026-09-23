import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

type Papel = 'CLIENTE' | 'ORGANIZADOR';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto px-6 py-16 md:py-24">

      <p class="etiqueta text-acento-texto mb-3">Nova conta</p>
      <h1 class="text-titulo-md font-semibold text-tinta-900 mb-10">Criar conta</h1>

      <div class="bilhete p-7" style="--recorte-y: 50%">
        @if (mensagemErro()) {
          <div class="aviso-erro mb-6">{{ mensagemErro() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()" class="space-y-5">
          <div>
            <label for="nome" class="campo-rotulo">Nome</label>
            <input id="nome" type="text" formControlName="name" autocomplete="name" class="campo" />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <p class="campo-erro">Informe seu nome</p>
            }
          </div>

          <div>
            <label for="email" class="campo-rotulo">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="email" class="campo" />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <p class="campo-erro">Informe um e-mail válido</p>
            }
          </div>

          <div>
            <label for="senha" class="campo-rotulo">Senha</label>
            <input id="senha" type="password" formControlName="password" autocomplete="new-password" class="campo" />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="campo-erro">A senha precisa de ao menos 6 caracteres</p>
            }
          </div>

          <!-- Papel como dois cartoes clicaveis: a escolha muda o que a pessoa
               vai ver no sistema, entao merece mais do que uma linha de select. -->
          <fieldset>
            <legend class="campo-rotulo">Você vai usar o Canhoto para</legend>
            <div class="grid grid-cols-2 gap-3 mt-1">
              @for (opcao of papeis; track opcao.valor) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="papelAtual() === opcao.valor"
                  (click)="escolherPapel(opcao.valor)"
                  class="text-left border p-4 transition-all duration-150"
                  [class]="papelAtual() === opcao.valor
                    ? 'border-acento-500 bg-acento-100/50 ring-1 ring-acento-escuro'
                    : 'border-papel-300 bg-papel-50 hover:border-tinta-400'"
                >
                  <span class="block font-semibold text-sm text-tinta-900 mb-1">{{ opcao.titulo }}</span>
                  <span class="block text-xs leading-relaxed text-tinta-500">{{ opcao.descricao }}</span>
                </button>
              }
            </div>
          </fieldset>

          <button type="submit" [disabled]="carregando()" class="btn-principal w-full py-3">
            {{ carregando() ? 'Criando conta…' : 'Criar conta' }}
          </button>
        </form>
      </div>

      <p class="mt-8 text-center text-sm text-tinta-500">
        Já tem conta?
        <a routerLink="/login" class="link font-medium">Entrar</a>
      </p>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(false);
  readonly mensagemErro = signal('');
  readonly papelAtual = signal<Papel>('CLIENTE');

  readonly papeis: { valor: Papel; titulo: string; descricao: string }[] = [
    { valor: 'CLIENTE', titulo: 'Comprar', descricao: 'Reservar e guardar meus ingressos.' },
    { valor: 'ORGANIZADOR', titulo: 'Organizar', descricao: 'Publicar eventos e validar na portaria.' },
  ];

  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENTE' as Papel, Validators.required],
  });

  escolherPapel(papel: Papel): void {
    this.papelAtual.set(papel);
    this.form.patchValue({ role: papel });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.carregando.set(true);
    this.mensagemErro.set('');

    const { name, email, password, role } = this.form.getRawValue();
    this.auth
      .register({ name: name!, email: email!, password: password!, role: role! })
      .subscribe({
        next: () => this.router.navigate(['/events']),
        error: (err) => {
          this.mensagemErro.set(err.error?.message ?? 'Não foi possível criar a conta. Tente de novo.');
          this.carregando.set(false);
        },
      });
  }
}
