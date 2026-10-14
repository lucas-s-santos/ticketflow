import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RevelarDirective } from '../../../shared/directives/revelar.directive';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { EventService } from '../event.service';
import { EventFilters, EventResponse } from '../event.model';
import { AuthService } from '../../auth/auth.service';

type Periodo = 'todos' | 'semana' | 'mes';

// Tempo ate assumir que o backend esta hibernando e avisar quem esta esperando.
// O plano free do Render desliga o servico apos inatividade e o primeiro acesso
// leva ~50s. Sem o aviso, a tela parece travada e a pessoa fecha a aba.
const AVISO_HIBERNACAO_MS = 3000;

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, RouterLink, FormsModule, RevelarDirective],
  template: `
    <div class="max-w-6xl mx-auto px-6 py-12 md:py-16">

      <!-- ================= CABECALHO ================= -->
      <div class="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p class="etiqueta text-acento-texto mb-3">Em cartaz</p>
          <h1 class="text-titulo-lg font-semibold text-tinta-900">Próximos eventos</h1>
        </div>

        @if (auth.isOrganizador()) {
          <a routerLink="/events/new" class="btn-contorno">+ Criar evento</a>
        }
      </div>

      <!-- ================= BUSCA E FILTROS ================= -->
      <div class="mb-10">
        <label for="busca" class="sr-only">Buscar eventos</label>
        <div class="relative mb-4">
          <input
            id="busca"
            type="search"
            [ngModel]="termo()"
            (ngModelChange)="aoDigitar($event)"
            placeholder="Buscar por nome, cidade ou local"
            autocomplete="off"
            class="campo pl-10"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-400"
               fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path stroke-linecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          @for (opcao of periodos; track opcao.valor) {
            <button type="button" (click)="mudarPeriodo(opcao.valor)"
                    class="etiqueta border px-3 py-1.5 transition-colors"
                    [class]="periodo() === opcao.valor
                      ? 'border-tinta-900 bg-tinta-900 text-papel-50'
                      : 'border-papel-400 text-tinta-600 hover:border-tinta-900'">
              {{ opcao.rotulo }}
            </button>
          }

          <span class="w-px h-5 bg-papel-300 mx-1" aria-hidden="true"></span>

          <button type="button" (click)="alternarVagas()"
                  [attr.aria-pressed]="comVagas()"
                  class="etiqueta border px-3 py-1.5 transition-colors"
                  [class]="comVagas()
                    ? 'border-acento-600 bg-acento-500 text-tinta-900'
                    : 'border-papel-400 text-tinta-600 hover:border-tinta-900'">
            Com ingressos
          </button>

          @if (temFiltro()) {
            <button type="button" (click)="limparFiltros()"
                    class="etiqueta text-tinta-400 hover:text-erro-600 px-2 py-1.5 transition-colors">
              Limpar
            </button>
          }
        </div>
      </div>

      @if (carregando()) {
        @if (hibernando()) {
          <div class="aviso-informacao mb-8">
            <span class="inline-block w-4 h-4 mt-0.5 shrink-0 border-2 border-ocre-500 border-t-transparent rounded-full animate-spin"></span>
            <span>
              <strong class="font-semibold">Acordando o servidor.</strong>
              A API roda em plano gratuito e hiberna quando fica ociosa. O primeiro
              acesso leva cerca de 50 segundos; os próximos são imediatos.
            </span>
          </div>
        }

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          @for (vazio of esqueletos; track vazio) {
            <div class="bilhete animate-pulse" style="--recorte-y: calc(100% - 5.5rem)">
              <div class="h-44 bg-papel-200"></div>
              <div class="p-6">
                <div class="h-3 w-28 bg-papel-200 mb-5"></div>
                <div class="h-6 w-4/5 bg-papel-200 mb-3"></div>
                <div class="h-4 w-3/5 bg-papel-200"></div>
              </div>
              <div class="perfuracao"></div>
              <div class="h-[5.5rem] px-6 flex items-center">
                <div class="h-7 w-32 bg-papel-200"></div>
              </div>
            </div>
          }
        </div>
        <p class="sr-only">Carregando eventos</p>

      } @else if (erro()) {
        <div class="aviso-erro">
          <span>
            Não foi possível carregar os eventos.
            <button type="button" (click)="carregar()" class="underline font-semibold ml-1">
              Tentar de novo
            </button>
          </span>
        </div>

      } @else if (eventos().length === 0) {
        <div class="bilhete p-12 text-center" style="--recorte-y: 50%">
          @if (temFiltro()) {
            <p class="font-display text-titulo-sm text-tinta-900 mb-2">Nada encontrado</p>
            <p class="text-sm text-tinta-500 mb-6">
              Nenhum evento corresponde a essa busca. Tente outro termo ou amplie o período.
            </p>
            <button type="button" (click)="limparFiltros()" class="btn-contorno btn-pequeno">
              Limpar filtros
            </button>
          } @else {
            <p class="font-display text-titulo-sm text-tinta-900 mb-2">Nenhum evento em cartaz</p>
            <p class="text-sm text-tinta-500">
              Assim que um organizador publicar algo, ele aparece aqui.
            </p>
          }
        </div>

      } @else {

        <!-- ================= DESTAQUE ================= -->
        @if (destaque(); as ev) {
          <!-- 4 colunas no desktop: capa | corpo | perfuracao | canhoto.
               A perfuracao horizontal e a vertical se alternam por breakpoint,
               e so uma delas conta como item da grade em cada tamanho. -->
          <a [routerLink]="['/events', ev.id]"
             class="bilhete bilhete-deitado group block mb-8 overflow-hidden hover:shadow-papel-alta
                    transition-shadow animate-entrar-baixo
                    lg:grid lg:grid-cols-[19rem_1fr_3px_13rem] lg:items-stretch"
             style="--recorte-x: calc(100% - 13rem)">

            <!-- Capa -->
            <div class="relative h-56 lg:h-full bg-papel-200 overflow-hidden">
              @if (ev.coverImageUrl) {
                <img [src]="ev.coverImageUrl" [alt]="'Imagem de ' + ev.name"
                     loading="lazy" decoding="async"
                     class="w-full h-full object-cover saturate-[0.92] group-hover:saturate-100
                            group-hover:scale-[1.03] transition-all duration-500" />
              } @else {
                <div class="w-full h-full grid place-items-center bg-tinta-900">
                  <span class="numero text-titulo-xl font-bold text-acento-500 leading-none">
                    {{ ev.date | date:'dd' }}
                  </span>
                </div>
              }
              <span class="absolute top-4 left-4 etiqueta bg-acento-500 text-tinta-900 px-2 py-1">
                Destaque
              </span>
            </div>

            <!-- Corpo -->
            <div class="px-7 py-6 lg:py-8">
              <div class="flex items-baseline gap-2.5 mb-3">
                <span class="numero text-3xl font-bold leading-none text-tinta-900">
                  {{ ev.date | date:'dd' }}
                </span>
                <span class="etiqueta text-acento-texto">
                  {{ ev.date | date:'MMM':undefined:'pt-BR' | uppercase }}
                </span>
                <span class="etiqueta text-tinta-400">
                  {{ ev.date | date:'EEE, HH:mm':undefined:'pt-BR' }}
                </span>
              </div>

              <h2 class="font-display text-titulo-md font-semibold text-tinta-900 mb-2 leading-tight">
                {{ ev.name }}
              </h2>
              <p class="text-sm text-tinta-500 mb-4">{{ ev.location }}</p>
              @if (ev.description) {
                <p class="text-sm leading-relaxed text-tinta-600 linhas-2 max-w-xl">{{ ev.description }}</p>
              }
            </div>

            <!-- Separador -->
            <div class="perfuracao lg:hidden"></div>
            <div class="hidden lg:block perfuracao-vertical"></div>

            <!-- Canhoto: preco -->
            <div class="px-7 py-6 lg:py-8 flex lg:flex-col lg:justify-center items-center lg:items-start justify-between gap-2">
              @if (esgotado(ev)) {
                <span class="selo-neutro">Esgotado</span>
              } @else {
                <div>
                  <p class="etiqueta text-tinta-400 mb-1.5">A partir de</p>
                  <p class="numero text-2xl font-bold text-acento-texto">
                    {{ menorPreco(ev) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </p>
                </div>
              }
              <span class="etiqueta text-tinta-400 lg:mt-4">{{ vagasTexto(ev) }}</span>
            </div>
          </a>
        }

        <!-- ================= DEMAIS ================= -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (ev of restantes(); track ev.id; let i = $index) {
            <!-- O atraso e limitado a 6 posicoes: escalonar 30 cartoes faria o
                 ultimo aparecer quase dois segundos depois do primeiro. -->
            <a appRevelar [atraso]="(i % 6) * 70" [routerLink]="['/events', ev.id]"
               class="bilhete group flex flex-col overflow-hidden hover:shadow-papel-alta
                      hover:-translate-y-0.5 transition-all duration-200"
               style="--recorte-y: calc(100% - 5.5rem)">

              <!-- Capa -->
              <div class="relative h-44 bg-papel-200 overflow-hidden shrink-0">
                @if (ev.coverImageUrl) {
                  <img [src]="ev.coverImageUrl" [alt]="'Imagem de ' + ev.name"
                       loading="lazy" decoding="async"
                       class="w-full h-full object-cover saturate-[0.92] group-hover:saturate-100
                              group-hover:scale-[1.04] transition-all duration-500" />
                } @else {
                  <div class="w-full h-full grid place-items-center bg-tinta-900">
                    <span class="numero text-titulo-md font-bold text-acento-500 leading-none">
                      {{ ev.date | date:'dd' }}
                    </span>
                  </div>
                }
                @if (esgotado(ev)) {
                  <span class="absolute top-3 left-3 etiqueta bg-tinta-900 text-papel-50 px-2 py-1">
                    Esgotado
                  </span>
                }
              </div>

              <div class="p-6 flex-1">
                <div class="flex items-baseline gap-2.5 mb-3">
                  <span class="numero text-2xl font-bold leading-none text-tinta-900">
                    {{ ev.date | date:'dd' }}
                  </span>
                  <span class="etiqueta text-acento-texto">
                    {{ ev.date | date:'MMM':undefined:'pt-BR' | uppercase }}
                  </span>
                  <span class="etiqueta text-tinta-400">{{ ev.date | date:'HH:mm':undefined:'pt-BR' }}</span>
                </div>

                <h2 class="font-display text-titulo-sm font-semibold text-tinta-900 mb-2 leading-snug linhas-2">
                  {{ ev.name }}
                </h2>
                <p class="text-sm text-tinta-500 mb-3">{{ ev.location }}</p>
                @if (ev.description) {
                  <p class="text-sm leading-relaxed text-tinta-600 linhas-2">{{ ev.description }}</p>
                }
              </div>

              <div class="perfuracao"></div>

              <div class="px-6 h-[5.5rem] flex items-center justify-between gap-3">
                @if (esgotado(ev)) {
                  <span class="etiqueta text-tinta-400">Sem ingressos</span>
                } @else {
                  <div>
                    <p class="etiqueta text-tinta-400 mb-1">A partir de</p>
                    <p class="numero text-lg font-bold text-acento-texto">
                      {{ menorPreco(ev) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </p>
                  </div>
                }
                <span class="etiqueta text-tinta-400 text-right">{{ vagasTexto(ev) }}</span>
              </div>
            </a>
          }
        </div>

        @if (!ultimaPagina()) {
          <div class="flex flex-col items-center gap-3 mt-12">
            <button type="button" (click)="carregarMais()" [disabled]="carregandoMais()"
                    class="btn-contorno">
              {{ carregandoMais() ? 'Carregando...' : 'Carregar mais eventos' }}
            </button>
            <p class="etiqueta text-tinta-400">
              {{ eventos().length }} de {{ total() }}
            </p>
          </div>
        }
      }
    </div>
  `,
})
export class EventsListComponent implements OnInit, OnDestroy {
  private readonly service = inject(EventService);
  readonly auth = inject(AuthService);

  readonly eventos = signal<EventResponse[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly hibernando = signal(false);

  // O primeiro evento vira manchete; os demais entram na grade.
  // Isso quebra a uniformidade de cartoes identicos, que e o que faz uma
  // listagem parecer resultado de query em vez de curadoria.
  readonly destaque = computed(() => this.eventos()[0]);
  readonly restantes = computed(() => this.eventos().slice(1));

  readonly termo = signal('');
  readonly periodo = signal<Periodo>('todos');
  readonly comVagas = signal(false);

  readonly periodos: { valor: Periodo; rotulo: string }[] = [
    { valor: 'todos', rotulo: 'Qualquer data' },
    { valor: 'semana', rotulo: 'Próximos 7 dias' },
    { valor: 'mes', rotulo: 'Próximos 30 dias' },
  ];

  /** Usado para escolher entre "nada encontrado" e "nenhum evento em cartaz". */
  readonly temFiltro = computed(
    () => this.termo().trim() !== '' || this.periodo() !== 'todos' || this.comVagas(),
  );

  // Digitar dispara uma requisicao por tecla se nao houver represa. O debounce
  // espera a pessoa parar de escrever antes de consultar a API.
  private readonly digitacao = new Subject<void>();
  private inscricaoDigitacao?: Subscription;

  readonly carregandoMais = signal(false);
  readonly ultimaPagina = signal(true);
  readonly total = signal(0);
  private paginaAtual = 0;

  readonly esqueletos = [1, 2, 3, 4, 5, 6];

  private temporizador?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregar();
    this.inscricaoDigitacao = this.digitacao
      .pipe(debounceTime(350))
      .subscribe(() => this.carregar());
  }

  ngOnDestroy(): void {
    this.limparTemporizador();
    this.inscricaoDigitacao?.unsubscribe();
  }

  aoDigitar(valor: string): void {
    this.termo.set(valor);
    this.digitacao.next();
  }

  mudarPeriodo(valor: Periodo): void {
    this.periodo.set(valor);
    this.carregar();
  }

  alternarVagas(): void {
    this.comVagas.update((v) => !v);
    this.carregar();
  }

  limparFiltros(): void {
    this.termo.set('');
    this.periodo.set('todos');
    this.comVagas.set(false);
    this.carregar();
  }

  /**
   * Traduz o periodo escolhido em limites de data. O inicio e sempre agora:
   * evento que ja comecou nao interessa a quem esta comprando ingresso.
   */
  private filtrosAtuais(): EventFilters {
    const agora = new Date();
    let ate: string | undefined;

    if (this.periodo() === 'semana') {
      ate = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (this.periodo() === 'mes') {
      ate = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    return {
      q: this.termo(),
      de: this.periodo() === 'todos' ? undefined : agora.toISOString(),
      ate,
      comVagas: this.comVagas(),
    };
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.hibernando.set(false);

    this.limparTemporizador();
    this.temporizador = setTimeout(() => this.hibernando.set(true), AVISO_HIBERNACAO_MS);

    this.paginaAtual = 0;
    this.service.getEvents(this.filtrosAtuais(), 0).subscribe({
      next: (pagina) => {
        this.eventos.set(pagina.content);
        this.ultimaPagina.set(pagina.last);
        this.total.set(pagina.totalElements);
        this.finalizar();
      },
      error: () => {
        this.erro.set(true);
        this.finalizar();
      },
    });
  }

  /**
   * Acrescenta a proxima pagina no fim da lista, sem remontar a tela.
   * Trocar por paginas numeradas faria a pessoa perder o lugar a cada clique.
   */
  carregarMais(): void {
    if (this.carregandoMais() || this.ultimaPagina()) {
      return;
    }
    this.carregandoMais.set(true);

    this.service.getEvents(this.filtrosAtuais(), this.paginaAtual + 1).subscribe({
      next: (pagina) => {
        this.paginaAtual = pagina.page;
        this.eventos.update((atuais) => [...atuais, ...pagina.content]);
        this.ultimaPagina.set(pagina.last);
        this.total.set(pagina.totalElements);
        this.carregandoMais.set(false);
      },
      error: () => this.carregandoMais.set(false),
    });
  }

  menorPreco(ev: EventResponse): number {
    const disponiveis = ev.sectors.filter((s) => s.availableSeats > 0);
    const considerados = disponiveis.length > 0 ? disponiveis : ev.sectors;
    return considerados.reduce((min, s) => Math.min(min, s.price), Infinity);
  }

  esgotado(ev: EventResponse): boolean {
    return ev.sectors.length > 0 && ev.sectors.every((s) => s.availableSeats === 0);
  }

  vagasTexto(ev: EventResponse): string {
    if (ev.sectors.length === 0) {
      return 'Sem setores';
    }
    const vagas = ev.sectors.reduce((total, s) => total + s.availableSeats, 0);
    if (vagas === 0) {
      return 'Sem vagas';
    }
    if (vagas <= 20) {
      return `Últimas ${vagas}`;
    }
    return `${ev.sectors.length} setores`;
  }

  private finalizar(): void {
    this.limparTemporizador();
    this.hibernando.set(false);
    this.carregando.set(false);
  }

  private limparTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }
  }
}
