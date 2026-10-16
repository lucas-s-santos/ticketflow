import { Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../features/auth/auth.service';

/** A partir de quantos pixels de rolagem a barra deixa de ser transparente. */
const LIMIAR_DE_ROLAGEM = 40;

/** Rotas cujo topo é uma imagem escura de largura total. */
const ROTAS_COM_HERO_ESCURO = ['/', ''];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  // display: contents tira a caixa do <app-navbar> do layout. Sem isso o header
  // sticky ficava preso dentro do host — que tem exatamente a altura dele — e
  // rolava embora com a página em vez de grudar no topo.
  host: { class: 'contents', '(document:keydown.escape)': 'fecharComEsc()' },
  template: `
    <header
      class="sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300"
      [class]="sobreHero()
        ? 'bg-transparent border-b border-transparent'
        : 'bg-papel-100/95 backdrop-blur-sm border-b border-papel-300'"
    >
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        <a routerLink="/" (click)="fechar()" class="flex items-center gap-2.5 group shrink-0">
          <!-- O corpo do ingresso troca de cor com o fundo: em tinta sobre papel,
               em papel sobre a foto escura. O QR segue verde nos dois casos. -->
          <svg viewBox="0 0 32 29" class="w-8 h-7" aria-hidden="true">
            <path [class]="sobreHero() ? 'fill-papel-50' : 'fill-tinta-900'"
                  d="M7 8 H24
                     a1.62 1.62 0 0 1 0 3.25
                     a1.62 1.62 0 0 0 0 3.25
                     a1.62 1.62 0 0 1 0 3.25
                     a1.62 1.62 0 0 0 0 3.25
                     H7 a2 2 0 0 1 -2-2 V10 a2 2 0 0 1 2-2 Z" />
            <g class="fill-acento-500">
              <rect x="8.2" y="10.6" width="3.6" height="3.6" />
              <rect x="15.4" y="10.6" width="3.6" height="3.6" />
              <rect x="8.2" y="15.4" width="3.6" height="3.6" />
            </g>
            <g [class]="sobreHero() ? 'fill-papel-50' : 'fill-tinta-900'">
              <rect x="9.3" y="11.7" width="1.4" height="1.4" />
              <rect x="16.5" y="11.7" width="1.4" height="1.4" />
              <rect x="9.3" y="16.5" width="1.4" height="1.4" />
            </g>
            <g [class]="sobreHero() ? 'fill-tinta-900' : 'fill-papel-50'">
              <rect x="13.2" y="15.4" width="1.5" height="1.5" />
              <rect x="15.4" y="17.5" width="1.5" height="1.5" />
              <rect x="17.6" y="15.4" width="1.5" height="1.5" />
            </g>
          </svg>
          <span class="font-display text-[1.375rem] font-semibold tracking-tight transition-colors"
                [class]="sobreHero()
                  ? 'text-papel-50 group-hover:text-acento-500'
                  : 'text-tinta-900 group-hover:text-acento-texto'">
            Canhoto
          </span>
        </a>

        <!-- Navegação em linha: md para cima -->
        <nav class="hidden md:flex items-center gap-7 text-sm">
          <a routerLink="/events" [routerLinkActive]="classeAtiva()"
             class="font-medium transition-colors" [class]="classeLink()">
            Eventos
          </a>

          @if (auth.isLoggedIn()) {
            @if (auth.isOrganizador()) {
              <a routerLink="/organizer" [routerLinkActive]="classeAtiva()"
                 class="font-medium transition-colors" [class]="classeLink()">
                Painel
              </a>
              <a routerLink="/organizer/validate" [routerLinkActive]="classeAtiva()"
                 class="font-medium transition-colors" [class]="classeLink()">
                Portaria
              </a>
            }
            <a routerLink="/reservations" [routerLinkActive]="classeAtiva()"
               class="font-medium transition-colors" [class]="classeLink()">
              Meus ingressos
            </a>

            <span class="w-px h-5" [class]="sobreHero() ? 'bg-papel-50/30' : 'bg-papel-300'"
                  aria-hidden="true"></span>

            <div class="flex items-center gap-3">
              <span class="etiqueta hidden lg:inline"
                    [class]="sobreHero() ? 'text-papel-50/60' : 'text-tinta-400'"
                    [title]="auth.currentUser()?.email ?? ''">
                {{ primeiroNome() }}
              </span>
              <button type="button" (click)="auth.logout()"
                      class="btn btn-pequeno transition-colors"
                      [class]="sobreHero()
                        ? 'text-papel-50 hover:bg-papel-50/15'
                        : 'text-tinta-600 hover:text-acento-texto hover:bg-papel-200'">
                Sair
              </button>
            </div>
          } @else {
            <a routerLink="/login"
               class="btn btn-pequeno transition-colors"
               [class]="sobreHero()
                 ? 'bg-papel-50 text-tinta-900 hover:bg-acento-500'
                 : 'bg-tinta-900 text-papel-50 hover:bg-tinta-800'">
              Entrar
            </a>
          }
        </nav>

        <!-- Sanfona: abaixo de md -->
        <button
          type="button"
          (click)="alternar()"
          class="md:hidden -mr-2 p-2 transition-colors"
          [class]="sobreHero() ? 'text-papel-50' : 'text-tinta-700 hover:text-acento-texto'"
          [attr.aria-expanded]="aberto()"
          aria-controls="menu-mobile"
          aria-label="Abrir menu de navegação"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
            @if (aberto()) {
              <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
            } @else {
              <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
            }
          </svg>
        </button>
      </div>

    </header>

      <!--
        Menu do celular: painel escuro de tela cheia logo abaixo da barra, com os
        links grandes entrando em cascata. Fecha na hora (sem animação de saída):
        quem fecha um menu já decidiu para onde vai.

        Fica FORA do <header> de propósito: com a barra sólida, o header tem
        backdrop-filter, e filtro vira a referência de posicionamento dos filhos
        fixed — o painel ficava preso à altura da barra em vez de cobrir a tela.
        z-[45]: acima do ingresso 3D da home (z-40), abaixo da barra (z-50).
      -->
      @if (aberto()) {
        <nav id="menu-mobile" aria-label="Menu"
             class="md:hidden fixed z-[45] inset-x-0 top-16 bottom-0 bg-tinta-900 text-papel-50 overflow-y-auto
                    flex flex-col px-6 pt-8 pb-10 animate-[surgir_200ms_ease-out_both]">
          <ul class="flex-1">
            @for (item of itensMenu(); track item.rota; let i = $index) {
              <li class="animate-entrar-baixo" [style.animation-delay.ms]="60 + i * 50">
                <a [routerLink]="item.rota" (click)="fechar()"
                   routerLinkActive="text-acento-500" [routerLinkActiveOptions]="{ exact: true }"
                   class="block py-2.5 font-display text-[2.25rem] leading-tight font-semibold
                          active:translate-x-1 transition-transform duration-150">
                  {{ item.rotulo }}
                </a>
              </li>
            }
          </ul>

          <div class="perfuracao opacity-40 mb-6"></div>
          @if (auth.isLoggedIn()) {
            <div class="flex items-center justify-between gap-3 animate-entrar-baixo"
                 [style.animation-delay.ms]="60 + itensMenu().length * 50">
              <span class="etiqueta text-papel-50/60 truncate">{{ auth.currentUser()?.email }}</span>
              <button type="button" (click)="fechar(); auth.logout()"
                      class="btn btn-pequeno border border-papel-50/40 text-papel-50 shrink-0
                             active:bg-papel-50 active:text-tinta-900">
                Sair
              </button>
            </div>
          } @else {
            <a routerLink="/login" (click)="fechar()" class="btn-principal w-full py-3.5 animate-entrar-baixo"
               [style.animation-delay.ms]="60 + itensMenu().length * 50">
              Entrar
            </a>
          }
        </nav>
      }
  `,
})
export class NavbarComponent implements OnInit, OnDestroy {

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zona = inject(NgZone);

  readonly aberto = signal(false);
  private readonly noTopo = signal(true);
  private readonly rotaComHeroEscuro = signal(false);

  /**
   * A barra só fica transparente quando há imagem escura atrás dela. Com o menu
   * aberto ela volta a ser sólida: o painel do menu por cima da foto ficaria
   * ilegível.
   */
  readonly sobreHero = computed(
    () => this.noTopo() && this.rotaComHeroEscuro() && !this.aberto(),
  );

  private inscricaoRota?: Subscription;

  ngOnInit(): void {
    this.avaliarRota(this.router.url);
    this.inscricaoRota = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.avaliarRota(e.urlAfterRedirects));

    if (typeof window === 'undefined') {
      return;
    }

    // O ouvinte vive fora da zona do Angular: dentro dela, cada evento de scroll
    // dispararia uma verificação da aplicação inteira. Só voltamos para a zona
    // quando o booleano realmente vira — duas vezes por travessia, não 60 por
    // segundo.
    this.zona.runOutsideAngular(() => {
      window.addEventListener('scroll', this.aoRolar, { passive: true });
      this.aoRolar();
    });
  }

  ngOnDestroy(): void {
    this.inscricaoRota?.unsubscribe();
    window.removeEventListener('scroll', this.aoRolar);
    this.travarRolagem(false);
  }

  /** Classes dos links, que mudam de cor conforme o fundo. */
  classeLink(): string {
    return this.sobreHero()
      ? 'text-papel-50/85 hover:text-papel-50'
      : 'text-tinta-700 hover:text-acento-texto';
  }

  classeAtiva(): string {
    return this.sobreHero() ? 'text-acento-500' : 'text-acento-texto';
  }

  primeiroNome(): string {
    return this.auth.currentUser()?.name?.split(' ')[0] ?? '';
  }

  /** Links do menu do celular, conforme quem está logado. */
  readonly itensMenu = computed(() => {
    const itens = [{ rota: '/', rotulo: 'Início' }, { rota: '/events', rotulo: 'Eventos' }];
    if (this.auth.isLoggedIn()) {
      if (this.auth.isOrganizador()) {
        itens.push(
          { rota: '/organizer', rotulo: 'Painel' },
          { rota: '/organizer/validate', rotulo: 'Portaria' },
          { rota: '/events/new', rotulo: 'Criar evento' },
        );
      }
      itens.push({ rota: '/reservations', rotulo: 'Meus ingressos' });
    }
    return itens;
  });

  alternar(): void {
    this.aberto.update((v) => !v);
    this.travarRolagem(this.aberto());
  }

  fechar(): void {
    this.aberto.set(false);
    this.travarRolagem(false);
  }

  fecharComEsc(): void {
    if (this.aberto()) this.fechar();
  }

  /** Com o menu cobrindo a tela, a página de trás não deve rolar sob o dedo. */
  private travarRolagem(travar: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = travar ? 'hidden' : '';
  }

  private readonly aoRolar = (): void => {
    const topo = window.scrollY < LIMIAR_DE_ROLAGEM;
    if (topo !== this.noTopo()) {
      this.zona.run(() => this.noTopo.set(topo));
    }
  };

  private avaliarRota(url: string): void {
    const caminho = url.split('?')[0].split('#')[0];
    this.rotaComHeroEscuro.set(ROTAS_COM_HERO_ESCURO.includes(caminho));
  }
}
