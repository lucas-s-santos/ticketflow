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

      @if (aberto()) {
        <nav id="menu-mobile" class="md:hidden border-t border-papel-300 bg-papel-50 px-6 py-2">
          <a routerLink="/events" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
            Eventos
          </a>

          @if (auth.isLoggedIn()) {
            @if (auth.isOrganizador()) {
              <a routerLink="/organizer" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Painel do organizador
              </a>
              <a routerLink="/organizer/validate" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Portaria — validar ingresso
              </a>
              <a routerLink="/events/new" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Criar evento
              </a>
            }
            <a routerLink="/reservations" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
              Meus ingressos
            </a>
            <div class="py-4 flex items-center justify-between gap-3">
              <span class="etiqueta text-tinta-400 truncate">{{ auth.currentUser()?.email }}</span>
              <button type="button" (click)="fechar(); auth.logout()" class="btn-contorno btn-pequeno shrink-0">
                Sair
              </button>
            </div>
          } @else {
            <a routerLink="/login" (click)="fechar()" class="btn-tinta w-full my-4">Entrar</a>
          }
        </nav>
      }
    </header>
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

  alternar(): void {
    this.aberto.update((v) => !v);
  }

  fechar(): void {
    this.aberto.set(false);
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
