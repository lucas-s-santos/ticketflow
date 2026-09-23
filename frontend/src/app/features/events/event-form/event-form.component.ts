import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-6 py-12 md:py-16">

      <a routerLink="/events" class="etiqueta text-tinta-500 hover:text-acento-texto transition-colors inline-block mb-8">
        ← Voltar aos eventos
      </a>

      <p class="etiqueta text-acento-texto mb-3">{{ editando() ? 'Edição' : 'Publicação' }}</p>
      <h1 class="text-titulo-md font-semibold text-tinta-900 mb-10">
        {{ editando() ? 'Editar evento' : 'Novo evento' }}
      </h1>

      @if (mensagemErro()) {
        <div class="aviso-erro mb-8">{{ mensagemErro() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="enviar()">

        <!-- ================= DADOS DO EVENTO ================= -->
        <div class="bilhete p-7 mb-8" style="--recorte-y: 50%">
          <div class="space-y-5">
            <div>
              <label for="nome" class="campo-rotulo">Nome do evento</label>
              <input id="nome" type="text" formControlName="name" class="campo" />
              @if (form.controls.name.invalid && form.controls.name.touched) {
                <p class="campo-erro">Nome obrigatório</p>
              }
            </div>

            <div>
              <label for="descricao" class="campo-rotulo">Descrição</label>
              <textarea id="descricao" formControlName="description" rows="3" class="campo resize-y"
                        placeholder="Horário dos portões, classificação etária, o que está incluso…"></textarea>
            </div>

            <div>
              <label for="capa" class="campo-rotulo">Imagem de capa</label>
              <input id="capa" type="url" formControlName="coverImageUrl" class="campo"
                     placeholder="https://..." />
              @if (form.controls.coverImageUrl.invalid && form.controls.coverImageUrl.touched) {
                <p class="campo-erro">Informe um endereço começando com http:// ou https://</p>
              }
              <p class="etiqueta text-tinta-400 mt-2">
                Cole o endereço de uma imagem. Deixe vazio para usar a data como capa.
              </p>

              @if (previa(); as url) {
                <div class="bilhete overflow-hidden mt-4" style="--recorte-y: 100%">
                  <img [src]="url" alt="Pré-visualização da capa" decoding="async"
                       (error)="falhouImagem.set(true)" (load)="falhouImagem.set(false)"
                       class="w-full h-44 object-cover" />
                </div>
              }
              @if (falhouImagem()) {
                <p class="campo-erro">Não consegui carregar essa imagem. Confira o endereço.</p>
              }
            </div>

            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label for="data" class="campo-rotulo">Data e hora</label>
                <input id="data" type="datetime-local" formControlName="date" class="campo" />
                @if (form.controls.date.invalid && form.controls.date.touched) {
                  <p class="campo-erro">Data obrigatória</p>
                }
                <p class="etiqueta text-tinta-400 mt-2">Precisa ser no futuro</p>
              </div>

              <div>
                <label for="local" class="campo-rotulo">Local</label>
                <input id="local" type="text" formControlName="location" class="campo"
                       placeholder="Casa de Cultura — Tiradentes, MG" />
                @if (form.controls.location.invalid && form.controls.location.touched) {
                  <p class="campo-erro">Local obrigatório</p>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- ================= SETORES ================= -->
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-titulo-sm font-semibold text-tinta-900">Setores</h2>
          <button type="button" (click)="adicionarSetor()" class="btn-contorno btn-pequeno">
            + Adicionar setor
          </button>
        </div>

        @if (setores.length === 0) {
          <div class="border border-dashed border-papel-400 p-8 text-center mb-8">
            <p class="text-sm text-tinta-500">
              Nenhum setor ainda. Sem setores, o evento aparece na lista mas não vende ingressos.
            </p>
          </div>
        }

        <div class="space-y-4 mb-8">
          @for (setor of setores.controls; track $index) {
            <div [formGroup]="grupo($index)" class="border border-papel-300 bg-papel-50 p-5">
              <div class="flex items-center justify-between mb-4">
                <span class="etiqueta text-tinta-500">
                  Setor {{ $index + 1 }}
                  @if (vendidos($index) > 0) {
                    <span class="text-acento-texto ml-2">· {{ vendidos($index) }} já reservados</span>
                  }
                </span>
                <button type="button" (click)="removerSetor($index)"
                        class="etiqueta text-tinta-400 hover:text-acento-texto transition-colors">
                  Remover
                </button>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="col-span-2">
                  <label class="campo-rotulo">Nome</label>
                  <input type="text" formControlName="name" class="campo" placeholder="Pista, VIP, Camarote" />
                </div>
                <div>
                  <label class="campo-rotulo">Capacidade</label>
                  <input type="number" formControlName="capacity" min="1" class="campo numero" />
                  @if (vendidos($index) > 0) {
                    <p class="etiqueta text-tinta-400 mt-1.5">Mín. {{ vendidos($index) }}</p>
                  }
                </div>
                <div>
                  <label class="campo-rotulo">Preço (R$)</label>
                  <input type="number" formControlName="price" min="0.01" step="0.01" class="campo numero" />
                </div>
              </div>
            </div>
          }
        </div>

        @if (editando()) {
          <p class="text-xs leading-relaxed text-tinta-500 mb-8">
            Setores que já têm reservas não podem ser removidos, e a capacidade não pode ficar
            abaixo do que já foi vendido. O sistema recusa a alteração e explica o motivo.
          </p>
        }

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" [disabled]="salvando()" class="btn-principal">
            {{ salvando() ? 'Salvando…' : (editando() ? 'Salvar alterações' : 'Publicar evento') }}
          </button>
          <a routerLink="/events" class="btn-fantasma">Cancelar</a>
        </div>
      </form>
    </div>
  `,
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly salvando = signal(false);
  readonly falhouImagem = signal(false);
  readonly mensagemErro = signal('');
  readonly editando = signal(false);
  private eventoId: string | null = null;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    location: ['', Validators.required],
    // Espelha a validacao do backend: vazio e permitido, mas se vier algo
    // precisa ser http(s). Barra javascript:, que viraria XSS num atributo src.
    coverImageUrl: ['', Validators.pattern(/^$|^https?:\/\/.+/)],
    sectors: this.fb.array([]),
  });

  // URL da previa: so devolve quando o campo esta valido e preenchido, para nao
  // disparar requisicao a cada tecla digitada num endereco ainda incompleto.
  previa(): string | null {
    const valor = (this.form.controls.coverImageUrl.value ?? '').trim();
    return valor && this.form.controls.coverImageUrl.valid ? valor : null;
  }

  get setores(): FormArray {
    return this.form.get('sectors') as FormArray;
  }

  grupo(indice: number) {
    return this.setores.at(indice) as ReturnType<typeof this.fb.group>;
  }

  // Ingressos ja tomados no setor (capacity - availableSeats). Só exibicao:
  // o backend recalcula a partir do proprio banco ao salvar.
  vendidos(indice: number): number {
    return Number(this.grupo(indice).get('taken')?.value ?? 0);
  }

  ngOnInit(): void {
    this.eventoId = this.route.snapshot.paramMap.get('id');
    if (!this.eventoId) {
      return;
    }

    this.editando.set(true);
    this.service.getEventById(this.eventoId).subscribe({
      next: (evento) => {
        this.form.patchValue({
          name: evento.name,
          description: evento.description ?? '',
          date: this.paraCampoLocal(evento.date),
          location: evento.location,
          coverImageUrl: evento.coverImageUrl ?? '',
        });
        evento.sectors.forEach((s) =>
          this.adicionarSetor(s.id, s.name, s.capacity, s.price, s.capacity - s.availableSeats),
        );
      },
      error: () => this.router.navigate(['/events']),
    });
  }

  // datetime-local espera "YYYY-MM-DDTHH:mm" no fuso LOCAL do navegador.
  // Usar toISOString() aqui converteria para UTC e a hora exibida sairia deslocada
  // (3h a mais no Brasil), fazendo o evento "andar" a cada vez que fosse salvo.
  private paraCampoLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  adicionarSetor(id: string | null = null, nome = '', capacidade: number | null = null, preco: number | null = null, tomados = 0): void {
    this.setores.push(
      this.fb.group({
        id: [id],
        taken: [tomados],
        name: [nome, Validators.required],
        capacity: [capacidade, [Validators.required, Validators.min(1)]],
        price: [preco, [Validators.required, Validators.min(0.01)]],
      }),
    );
  }

  removerSetor(indice: number): void {
    this.setores.removeAt(indice);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    this.mensagemErro.set('');

    const bruto = this.form.getRawValue();
    const corpo = {
      name: bruto.name!,
      description: bruto.description ?? undefined,
      // datetime-local nao tem fuso; new Date() o interpreta como hora local,
      // e toISOString() converte para UTC — que e o que a API espera.
      date: new Date(bruto.date!).toISOString(),
      location: bruto.location!,
      coverImageUrl: bruto.coverImageUrl?.trim() || undefined,
      sectors: bruto.sectors.map((s: any) => ({
        // id nulo = setor novo; id preenchido = o backend atualiza o existente
        id: s.id ?? undefined,
        name: s.name,
        capacity: Number(s.capacity),
        price: Number(s.price),
      })),
    };

    const requisicao$ = this.editando()
      ? this.service.updateEvent(this.eventoId!, corpo)
      : this.service.createEvent(corpo);

    requisicao$.subscribe({
      next: () => this.router.navigate(['/events']),
      error: (err) => {
        this.mensagemErro.set(err.error?.message ?? 'Não foi possível salvar o evento.');
        this.salvando.set(false);
      },
    });
  }
}
