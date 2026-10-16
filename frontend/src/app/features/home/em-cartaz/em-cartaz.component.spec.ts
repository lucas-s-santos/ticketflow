import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { EmCartazComponent } from './em-cartaz.component';
import { EventResponse } from '../../events/event.model';

function evento(id: string, setores: [number, number][]): EventResponse {
  return {
    id,
    name: `Evento ${id}`,
    description: null,
    date: '2026-11-20T21:00:00Z',
    location: 'Teatro Central — Rio de Janeiro, RJ',
    coverImageUrl: null,
    createdAt: '2026-10-01T00:00:00Z',
    sectors: setores.map(([price, availableSeats], i) => ({
      id: `${id}-${i}`, name: `Setor ${i}`, capacity: 100, availableSeats, price,
    })),
  };
}

// O app registra o pt-BR no app.config.ts; o teste monta o componente sem ele.
registerLocaleData(localePt, 'pt-BR');

describe('EmCartazComponent', () => {
  beforeEach(() => {
    // O jsdom não tem matchMedia; as diretivas de efeito perguntam por ponteiro
    // e movimento reduzido antes de ligar. "Não" para tudo: nenhum efeito liga.
    window.matchMedia ??= ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    TestBed.configureTestingModule({
      imports: [EmCartazComponent],
      providers: [provideRouter([])],
    });
  });

  function montar(eventos: EventResponse[]): HTMLElement {
    const fixture = TestBed.createComponent(EmCartazComponent);
    fixture.componentRef.setInput('eventos', eventos);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('some inteira quando não há eventos (API fora não vira vitrine vazia)', () => {
    expect(montar([]).querySelector('section')).toBeNull();
  });

  it('mostra no máximo três eventos', () => {
    const el = montar(['a', 'b', 'c', 'd', 'e'].map((id) => evento(id, [[50, 10]])));
    expect(el.querySelectorAll('.cartaz').length).toBe(3);
  });

  it('"a partir de" ignora setor esgotado', () => {
    const componente = TestBed.createComponent(EmCartazComponent).componentInstance;
    // O setor de R$ 30 está esgotado: o menor preço que ainda se compra é R$ 80.
    expect(componente.menorPreco(evento('x', [[30, 0], [80, 5], [120, 2]]))).toBe(80);
  });

  it('evento com todos os setores esgotados mostra o selo', () => {
    const el = montar([evento('x', [[30, 0], [80, 0]])]);
    expect(el.querySelector('.selo-neutro')?.textContent).toContain('Esgotado');
  });
});
