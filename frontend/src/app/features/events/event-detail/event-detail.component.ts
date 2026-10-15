import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RevelarDirective } from '../../../shared/directives/revelar.directive';
import { ParalaxeDirective } from '../../../shared/directives/paralaxe.directive';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { EventService } from '../event.service';
import { EventResponse, TicketSectorResponse } from '../event.model';
import { AuthService } from '../../auth/auth.service';
import { ReservationService } from '../../reservations/reservation.service';

// Teto por reserva. O backend aplica o mesmo limite (ReservationService.MAX_TICKET_QUANTITY);
// aqui ele so evita que a pessoa chegue ate o erro.
const MAX_INGRESSOS = 10;

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, RouterLink, RevelarDirective, ParalaxeDirective],
  template: `
    <!--
      ================= BANNER =================
      A capa de ponta a ponta, com o nome por cima. Vem desenhada já no primeiro
      quadro, com a capa e o nome que a lista mandou na navegação: é isso que
      deixa a foto "voar" do cartão até aqui (view-transition-name igual nos
      dois lados) antes mesmo de a API responder.
    -->
    @if (capa(); as url) {
      <header class="relative isolate overflow-hidden bg-tinta-900 h-[44vh] min-h-[20rem] md:h-[58vh]">
        <div class="absolute inset-0 overflow-hidden" style="view-transition-name: capa-evento">
          <div appParalaxe [deslocamento]="-60" class="absolute inset-x-0 -top-[10%] h-[120%]">
            <img [src]="url" [alt]="'Imagem de ' + (evento()?.name ?? nomeInicial())" decoding="async"
                 class="w-full h-full object-cover" />
          </div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-tinta-900 via-tinta-900/45 to-tinta-900/20"
             aria-hidden="true"></div>

        <div class="relative h-full max-w-4xl mx-auto px-6 py-8 md:py-10 flex flex-col justify-between">
          <div class="flex items-center justify-between gap-4">
            <a routerLink="/events" class="etiqueta text-papel-50/80 hover:text-acento-500 transition-colors">
              ← Voltar aos eventos
            </a>
            @if (evento() && auth.isOrganizador()) {
              <a [routerLink]="['/events', evento()!.id, 'edit']"
                 class="btn btn-pequeno border border-papel-50/40 text-papel-50 hover:bg-papel-50 hover:text-tinta-900">
                Editar
              </a>
            }
          </div>

          <div>
            @if (evento(); as ev) {
              <div class="flex items-baseline gap-3 mb-3 animate-entrar-baixo">
                <span class="numero text-titulo-md font-bold text-papel-50 leading-none">
                  {{ ev.date | date:'dd' }}
                </span>
                <span class="etiqueta text-acento-500">
                  {{ ev.date | date:'MMM':undefined:'pt-BR' | uppercase }}
                </span>
                <span class="etiqueta text-papel-300">
                  {{ ev.date | date:'EEEE, HH:mm':undefined:'pt-BR' }}
                </span>
              </div>
            }
            <h1 class="text-titulo-lg font-semibold text-papel-50 mb-2">{{ evento()?.name ?? nomeInicial() }}</h1>
            @if (evento(); as ev) {
              <p class="text-papel-300 animate-entrar-baixo">{{ ev.location }}</p>
            }
          </div>
        </div>
      </header>
    }

    <div class="max-w-4xl mx-auto px-6 py-12 md:py-16">

      @if (carregando()) {
        <div class="animate-pulse" aria-hidden="true">
          <div class="h-3 w-24 bg-papel-200 mb-6"></div>
          <div class="h-12 w-3/4 bg-papel-200 mb-4"></div>
          <div class="h-4 w-1/2 bg-papel-200 mb-12"></div>
          <div class="h-48 w-full bg-papel-200"></div>
        </div>
        <p class="sr-only">Carregando evento</p>

      } @else if (erro() || !evento()) {
        <div class="aviso-erro">
          <span>Evento não encontrado. <a routerLink="/events" class="underline font-semibold">Ver todos os eventos</a></span>
        </div>

      } @else {
        <!-- O "as" so e permitido no @if primario, por isso este bloco e aninhado -->
        @if (evento(); as ev) {

        <!-- ================= CABECALHO (evento sem capa) ================= -->
        @if (!capa()) {
        <a routerLink="/events" class="etiqueta text-tinta-500 hover:text-acento-texto transition-colors inline-block mb-8">
          ← Voltar aos eventos
        </a>

        <div class="flex items-start justify-between gap-6 mb-3">
          <div class="flex items-baseline gap-3">
            <span class="numero text-titulo-md font-bold text-tinta-900 leading-none">
              {{ ev.date | date:'dd' }}
            </span>
            <span class="etiqueta text-acento-texto">
              {{ ev.date | date:'MMM':undefined:'pt-BR' | uppercase }}
            </span>
            <span class="etiqueta text-tinta-400">
              {{ ev.date | date:'EEEE, HH:mm':undefined:'pt-BR' }}
            </span>
          </div>

          @if (auth.isOrganizador()) {
            <a [routerLink]="['/events', ev.id, 'edit']" class="btn-contorno btn-pequeno shrink-0">Editar</a>
          }
        </div>

        <h1 class="text-titulo-lg font-semibold text-tinta-900 mb-3">{{ ev.name }}</h1>
        <p class="text-tinta-500 mb-8">{{ ev.location }}</p>
        }

        @if (ev.description) {
          <p class="text-lg leading-relaxed text-tinta-600 max-w-2xl mb-12">{{ ev.description }}</p>
        }

        <div class="regua mb-10"></div>

        <!-- ================= SETORES ================= -->
        <h2 class="text-titulo-sm font-semibold text-tinta-900 mb-1">Escolha seu setor</h2>
        <p class="text-sm text-tinta-500 mb-6">Clique para selecionar. Os valores já são finais.</p>

        @if (ev.sectors.length === 0) {
          <p class="text-sm text-tinta-500">Nenhum setor cadastrado para este evento.</p>
        } @else {
          <div class="space-y-3 mb-10" role="radiogroup" aria-label="Setores disponíveis">
            @for (setor of ev.sectors; track setor.id; let i = $index) {
              <button appRevelar [atraso]="i * 60" [distancia]="8"
                type="button"
                role="radio"
                [attr.aria-checked]="setorId() === setor.id"
                [disabled]="setor.availableSeats === 0"
                (click)="selecionar(setor)"
                class="w-full text-left border px-5 py-4 transition-all duration-150 flex items-center gap-5
                       disabled:opacity-45 disabled:cursor-not-allowed"
                [class]="setorId() === setor.id
                  ? 'border-acento-500 bg-acento-100/50 ring-1 ring-acento-escuro'
                  : 'border-papel-300 bg-papel-50 hover:border-tinta-400'"
              >
                <!-- Marcador de selecao -->
                <span class="shrink-0 w-4 h-4 rounded-full border-2 grid place-items-center"
                      [class]="setorId() === setor.id ? 'border-acento-500' : 'border-papel-400'"
                      aria-hidden="true">
                  @if (setorId() === setor.id) {
                    <span class="w-2 h-2 rounded-full bg-acento-500"></span>
                  }
                </span>

                <span class="flex-1 min-w-0">
                  <span class="block font-semibold text-tinta-900 mb-1.5">{{ setor.name }}</span>

                  @if (setor.availableSeats === 0) {
                    <span class="etiqueta text-tinta-400">Esgotado</span>
                  } @else {
                    <!-- Barra de lotacao: quanto do setor ja foi vendido -->
                    <span class="block w-full max-w-[13rem] h-1 bg-papel-300 overflow-hidden" aria-hidden="true">
                      <span class="block h-full bg-acento-500"
                            [style.width.%]="percentualVendido(setor)"></span>
                    </span>
                    <span class="etiqueta mt-1.5 block"
                          [class]="setor.availableSeats <= 20 ? 'text-erro-600' : 'text-tinta-400'">
                      {{ setor.availableSeats <= 20 ? 'Últimas ' + setor.availableSeats + ' vagas' : setor.availableSeats + ' vagas' }}
                    </span>
                  }
                </span>

                <span class="numero text-lg font-bold shrink-0"
                      [class]="setor.availableSeats === 0 ? 'text-tinta-400 line-through' : 'text-tinta-900'">
                  {{ setor.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </span>
              </button>
            }
          </div>

          <!-- ================= RESERVA ================= -->
          @if (!auth.isLoggedIn()) {
            <div class="aviso-informacao">
              <span>
                <a routerLink="/login" class="underline font-semibold">Entre na sua conta</a>
                para reservar ingressos.
              </span>
            </div>

          } @else if (sucesso()) {
            <div class="bilhete p-7" style="--recorte-y: 50%">
              <p class="etiqueta text-acento-texto mb-3">Reserva criada</p>
              <p class="font-display text-titulo-sm font-semibold text-tinta-900 mb-2">
                O lugar é seu pelos próximos 15 minutos.
              </p>
              <p class="text-sm text-tinta-600 mb-6">
                Conclua o pagamento antes disso ou a vaga volta para o estoque.
              </p>
              <a routerLink="/reservations" class="btn-principal">Ir para o pagamento</a>
            </div>

          } @else if (setorSelecionado()) {
            <!-- "as" so vale no @if primario; o bloco interno recupera o setor -->
            @if (setorSelecionado(); as sel) {
            <div class="bilhete p-7" style="--recorte-y: 50%">
              @if (mensagemErro()) {
                <div class="aviso-erro mb-6">{{ mensagemErro() }}</div>
              }

              <div class="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p class="campo-rotulo">Quantidade</p>
                  <div class="flex items-center border border-papel-300 bg-papel-50 w-fit">
                    <button type="button" (click)="mudarQuantidade(-1)" [disabled]="quantidade() <= 1"
                            class="w-11 h-11 text-xl text-tinta-700 hover:bg-papel-200 disabled:opacity-30 transition-colors"
                            aria-label="Diminuir quantidade">−</button>
                    <span class="numero w-12 text-center text-lg font-bold text-tinta-900"
                          aria-live="polite">{{ quantidade() }}</span>
                    <button type="button" (click)="mudarQuantidade(1)" [disabled]="quantidade() >= maximo()"
                            class="w-11 h-11 text-xl text-tinta-700 hover:bg-papel-200 disabled:opacity-30 transition-colors"
                            aria-label="Aumentar quantidade">+</button>
                  </div>
                  <p class="etiqueta text-tinta-400 mt-2">Máximo de {{ maximo() }} por reserva</p>
                </div>

                <div class="text-right">
                  <p class="etiqueta text-tinta-400 mb-1.5">Total</p>
                  <p class="numero text-titulo-md font-bold text-acento-texto leading-none">
                    {{ total() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </p>
                  <p class="text-xs text-tinta-500 mt-1.5">{{ sel.name }} · {{ quantidade() }}x</p>
                </div>
              </div>

              <div class="perfuracao my-7 -mx-7 w-auto"></div>

              <button type="button" (click)="reservar()" [disabled]="reservando()"
                      class="btn-principal w-full py-3.5">
                {{ reservando() ? 'Reservando…' : 'Reservar e pagar depois' }}
              </button>
              <p class="text-xs text-tinta-500 text-center mt-3">
                Nada é cobrado agora. Você tem 15 minutos para concluir.
              </p>
            </div>
            }

          } @else {
            <p class="text-sm text-tinta-500">Selecione um setor acima para continuar.</p>
          }
        }
        }
      }
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly reservationService = inject(ReservationService);
  readonly auth = inject(AuthService);

  readonly evento = signal<EventResponse | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  // A lista manda capa e nome na navegação (RouterLink [state]). Só existe
  // durante a navegação, por isso é lido aqui, na construção do componente.
  // Entrando por link direto ou recarregando a página, não há estado: o banner
  // espera a API.
  private readonly estadoDaLista = inject(Router).getCurrentNavigation()?.extras.state as
    { capa?: string | null; nome?: string } | undefined;
  readonly nomeInicial = signal(this.estadoDaLista?.nome ?? '');

  readonly capa = computed(() => {
    if (this.erro()) return null;
    return this.evento()?.coverImageUrl ?? (this.carregando() ? this.estadoDaLista?.capa ?? null : null);
  });

  readonly setorId = signal<string>('');
  readonly quantidade = signal(1);
  readonly reservando = signal(false);
  readonly sucesso = signal(false);
  readonly mensagemErro = signal('');

  readonly setorSelecionado = computed<TicketSectorResponse | undefined>(() =>
    this.evento()?.sectors.find((s) => s.id === this.setorId()),
  );

  // Nao adianta oferecer mais ingressos do que restam no setor.
  readonly maximo = computed(() =>
    Math.min(MAX_INGRESSOS, this.setorSelecionado()?.availableSeats ?? MAX_INGRESSOS),
  );

  readonly total = computed(() => (this.setorSelecionado()?.price ?? 0) * this.quantidade());

  ngOnInit(): void {
    this.buscar();
  }

  selecionar(setor: TicketSectorResponse): void {
    this.setorId.set(setor.id);
    this.quantidade.set(1);
    this.sucesso.set(false);
    this.mensagemErro.set('');
  }

  mudarQuantidade(delta: number): void {
    const novo = this.quantidade() + delta;
    if (novo >= 1 && novo <= this.maximo()) {
      this.quantidade.set(novo);
    }
  }

  percentualVendido(setor: TicketSectorResponse): number {
    if (!setor.capacity) {
      return 0;
    }
    return Math.round(((setor.capacity - setor.availableSeats) / setor.capacity) * 100);
  }

  reservar(): void {
    const setor = this.setorSelecionado();
    if (!setor) {
      return;
    }

    this.reservando.set(true);
    this.mensagemErro.set('');

    this.reservationService
      .create({ ticketSectorId: setor.id, quantity: this.quantidade() })
      .subscribe({
        next: () => {
          this.sucesso.set(true);
          this.reservando.set(false);
          this.buscar(); // recarrega para refletir as vagas ja decrementadas
        },
        error: (err) => {
          this.mensagemErro.set(err.error?.message ?? 'Não foi possível criar a reserva. Tente de novo.');
          this.reservando.set(false);
        },
      });
  }

  private buscar(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEventById(id).subscribe({
      next: (dados) => {
        this.evento.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }
}
