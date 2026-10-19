// Reels do Instagram no formato que o Lucas já posta (ver exemplo-reels.mp4 e
// lib/reels.mjs): abertura gravada no celular com o comentário do "cliente",
// transição em fatias, o site rodando numa janela sobre a cor do projeto e a
// tela final com o @.
//
//   npm run instagram              → grava o site e monta saida/canhoto-instagram.mp4
//   npm run instagram -- --montar  → só remonta (depois de trocar a abertura ou um texto)
//
// A abertura é o vídeo do celular salvo em gravacao/entrada/abertura.mp4 (ou
// passado com --abertura caminho.mp4). Sem ele, o Reels começa direto no site.
// Toda montagem também gera saida/previa-comentario.jpg, para conferir onde o
// comentário fica antes de postar.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { RAIZ, entrar, iniciar, limparPendentes } from './lib/gravador.mjs';
import { montarReels, previaComentario } from './lib/reels.mjs';

const MARCA = {
  nome: 'LUCAS SILVA',
  cargo: 'DESENVOLVEDOR WEB',
  arroba: '@dev.lucassilva.ss',
  // A cor do projeto, como o laranja do Prumo no exemplo: aqui o verde do Canhoto.
  fundo: ['#D3EE6C', '#A2CA1E'],
  destaque: '#B9F706',
  tinta: '#13171A',
  rotulo: '#3B4B04',
};

/** O comentário que aparece quando você olha para cima. */
const COMENTARIO = {
  usuario: 'canhoto.ingressos',
  texto: 'Lucas, precisamos de um site de ingressos que não venda o mesmo lugar duas vezes. Consegue fazer?',
  quando: '1 sem',
  aparece: 1.0, // segundo da abertura em que ele entra
  topo: 290,    // px do alto do vídeo (o exemplo usava 150 e ficava sob o @ do Reels)
};

const TITULO_JANELA = 'canhoto · ingressos sem sobrevenda';
const ICONES = [
  { arquivo: 'openjdk.svg', nome: 'Java' },
  { arquivo: 'springboot.svg', nome: 'Spring Boot' },
  { arquivo: 'angular.svg', nome: 'Angular' },
  { arquivo: 'threedotjs.svg', nome: 'Three.js' },
  { texto: 'GSAP', nome: 'GSAP' },
];

const argumento = (nome) => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : undefined; };
const SITE = 'instagram-site.mp4';

if (!process.argv.includes('--montar')) {
  // 16:10, a proporção da janela do palco.
  const ALTURA = 800;
  const sessao = await entrar('marina@demo.com', 'demo123');
  await limparPendentes(sessao);
  const g = await iniciar({ nome: 'instagram', largura: 1280, altura: ALTURA, dpr: 1.25, celular: false, sessao });

  async function clicar(seletor, segundos = 0.7) {
    await g.passarMouse(seletor, segundos);
    await g.tocar(seletor);
  }

  await g.abrir('/', () => !!document.querySelector('app-ingresso-3d canvas') && !!document.querySelector('app-marquise'));

  // O ingresso chega, e o mouse dá um giro nele.
  await g.durante(1.4);
  await g.passarMouse('[data-ancora="hero"]', 0.7);
  await g.arrastarMouse(280, 10, 1.0);
  await g.durante(0.8);

  // A viagem: "Como funciona" empilhando e a janela do show abrindo.
  await g.rolarAte(await g.posicao('#como-funciona') - 40, 1.2);
  await g.rolarAte(await g.posicao('#como-funciona', 'base') - ALTURA, 3.0);
  await g.rolarAte(await g.posicao('#janela'), 0.8);
  await g.rolarAte(await g.posicao('#janela', 'base') - ALTURA, 3.0);

  // A assinatura: troca um caractere e o selo do ingresso acende em vermelho.
  await g.rolarAte(await g.posicao('[data-ancora="canhoto"]', 'centro') - ALTURA / 2, 1.6);
  await g.gravarAte(() => !document.querySelector('app-assinatura-demo button').disabled);
  await g.durante(0.3);
  await clicar('app-assinatura-demo button', 0.7);
  await g.durante(1.8);

  // O rasgo, e daí para os eventos.
  const maximo = await g.medida(() => document.documentElement.scrollHeight - innerHeight);
  await g.rolarAte(Math.min(maximo, await g.posicao('[data-ancora="porque"]', 'centro') - ALTURA / 2), 1.6);
  await g.durante(1.0);
  await clicar(await g.marcar('comecar', 'a', 'Começar pelos eventos'), 0.6);
  await g.gravarAte(() => document.querySelectorAll('a[href^="/events/"] h2').length > 3);
  await g.durante(0.6);
  const evento = await g.marcar('evento', 'a[href^="/events/"]', 'Festival Aurora');
  await g.rolarAte(await g.posicao(evento) - 110, 1.1);
  await g.passarMouse(evento, 0.7);
  await g.durante(0.5);
  await g.tocar(evento);
  await g.gravarAte(() => !!document.querySelector('[role="radiogroup"]'));
  await g.durante(1.8);

  await g.montar(SITE);
  await g.fechar();
}

const aberturaPedida = argumento('--abertura');
const padrao = path.join(RAIZ, 'entrada', 'abertura.mp4');
const abertura = aberturaPedida ? path.resolve(aberturaPedida) : existsSync(padrao) ? padrao : undefined;
if (!abertura) console.log('  sem abertura: grave o começo e salve em gravacao/entrada/abertura.mp4');

const { cartao } = await montarReels({
  site: path.join(RAIZ, 'saida', SITE), abertura, comentario: COMENTARIO, marca: MARCA,
  tituloJanela: TITULO_JANELA, icones: ICONES, arquivo: 'canhoto-instagram.mp4',
});

// Prévia do comentário: sobre a sua abertura, ou sobre o primeiro quadro do exemplo.
const exemplo = path.join(RAIZ, '..', 'exemplo-reels.mp4');
const fundo = abertura ?? (existsSync(exemplo) ? exemplo : undefined);
if (fundo) {
  await previaComentario({ fundo, segundo: abertura ? COMENTARIO.aparece + 0.6 : 0, cartao, arquivo: 'previa-comentario.jpg' });
  console.log('  prévia do comentário: saida/previa-comentario.jpg (em vermelho, o que a interface do Reels cobre)');
}
