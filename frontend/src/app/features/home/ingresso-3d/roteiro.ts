/**
 * O roteiro da viagem do ingresso 3D pela home.
 *
 * <p>Cada parada aponta para uma âncora — um elemento vazio no template, com
 * {@code data-ancora="nome"} — cuja caixa diz onde o ingresso fica naquele
 * ponto da rolagem. Entre duas paradas, posição, tamanho, pose, opacidade e
 * rasgo são interpolados conforme a pessoa rola.
 *
 * <p>Só tipos: este arquivo não importa Three.js, para a home poder declarar o
 * roteiro sem puxar a biblioteca para o próprio pacote.
 */
export interface Parada {
  /** {@code data-ancora} do elemento cuja caixa recebe o ingresso. */
  readonly ancora: string;
  /** Em que ponto da rolagem o ingresso está exatamente aqui. */
  readonly quando: Quando;
  /** Fração da âncora que o ingresso ocupa, pela largura ou pela altura (padrão 0.9). */
  readonly preenche?: number;
  /** Rotação de repouso em radianos. */
  readonly pose?: { readonly x: number; readonly y: number; readonly z: number };
  /**
   * Quanto o ingresso "vive" aqui, de 0 a 1: girar sozinho, aceitar arraste,
   * balançar, flutuar e inclinar com o mouse. 1 no hero, 0 quando precisa ficar
   * parado e alinhado — como ao virar a janela do show.
   */
  readonly vida?: number;
  /** Só o hero gira sozinho e aceita arraste (padrão 0). */
  readonly ciclo?: number;
  readonly opacidade?: number;
  /** 0 = inteiro; 1 = canhoto destacado do corpo. */
  readonly rasgo?: number;
}

export type Quando =
  /** No topo da página (rolagem zero). */
  | { readonly tipo: 'topo' }
  /** Quando o centro da âncora passa pelo centro da janela. */
  | { readonly tipo: 'centro' }
  /**
   * Relativo a uma seção: 0 quando o topo dela encosta no topo da janela,
   * 1 quando a base dela encosta na base da janela. Serve para seções com
   * conteúdo grudado (sticky), em que a âncora fica parada enquanto se rola.
   */
  | { readonly tipo: 'secao'; readonly seletor: string; readonly fracao: number };
