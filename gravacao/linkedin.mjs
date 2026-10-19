// Vídeo do LinkedIn: 1920×1080, ~65 s. O site é gravado num desktop
// (1280×720 px CSS, mouse) e vai para dentro de uma janela sobre o palco
// escuro, com a legenda embaixo (ver lib/montagem.mjs).
//
//   npm run linkedin              → grava e monta saida/canhoto-linkedin.mp4
//   npm run linkedin -- --montar  → só remonta (depois de mudar um texto)
//
// Roteiro: o produto inteiro, do clique à portaria — a home (ingresso 3D,
// assinatura), a lista de eventos, uma compra de verdade (reserva, Pix, fila,
// aprovação), a carteira, o painel do organizador e o check-in do ingresso
// recém-comprado, que na segunda leitura é recusado.
//
// Cada gravação compra um ingresso para a Marina e faz o check-in dele.
import { entrar, iniciar, limparPendentes } from './lib/gravador.mjs';
import { montarComCenas } from './lib/montagem.mjs';

const EVENTO = 'Mostra de Teatro Contemporâneo';

const LEGENDAS = {
  abertura: { rotulo: 'Projeto full stack · Java 21 + Angular', texto: 'Canhoto: venda de ingressos, do clique à portaria.' },
  viagem: { rotulo: 'Three.js · GSAP', texto: 'O ingresso 3D desce a página junto com a rolagem.' },
  assinatura: { rotulo: 'QR assinado com HMAC-SHA256', texto: 'Trocou um caractere do código? A assinatura não confere.' },
  eventos: { rotulo: 'Angular 18 · View Transitions API', texto: 'A foto do evento voa da lista até a página dele.' },
  reserva: { rotulo: 'Spring Boot · lock pessimista no PostgreSQL', texto: 'Reservou, a vaga é sua por 15 minutos. Sem sobrevenda.' },
  pagamento: { rotulo: 'RabbitMQ · webhook assinado · idempotência', texto: 'O pagamento é processado em segundo plano.' },
  carteira: { rotulo: 'Angular Signals · GSAP Flip', texto: 'Na carteira, cada ingresso com o seu QR.' },
  painel: { rotulo: 'Painel do organizador', texto: 'Do outro lado: ocupação, receita e check-in.' },
  portaria: { rotulo: 'Portaria · check-in', texto: 'Na portaria, cada canhoto vale uma vez só.' },
};
const CARTELA = {
  titulo: 'Canhoto',
  linhas: [
    'Java 21 · Spring Boot · RabbitMQ · PostgreSQL',
    'Angular · Tailwind · GSAP · Three.js',
    'github.com/lucas-s-santos/ticketflow',
  ],
};

const API = process.env.API ?? 'http://localhost:8080/api';
const minhasReservas = async (token) =>
  (await fetch(`${API}/reservations/me`, { headers: { Authorization: `Bearer ${token}` } })).json();

if (!process.argv.includes('--montar')) {
  const ALTURA = 720;
  const marina = await entrar('marina@demo.com', 'demo123');
  const organizador = await entrar('organizador@demo.com', 'demo123');
  await limparPendentes(marina);
  const antes = new Set((await minhasReservas(marina.token)).map((r) => r.id));

  const g = await iniciar({ nome: 'linkedin', largura: 1280, altura: ALTURA, dpr: 1.5, celular: false, sessao: marina });

  const cenas = [];
  /** Grava uma cena e anota em que trecho do vídeo ela ficou (para a legenda). */
  async function cena(chave, acao) {
    const de = g.tempo();
    await acao();
    cenas.push({ chave, de, ate: g.tempo() });
  }
  /** Leva o mouse até o elemento e clica. */
  async function clicar(seletor, segundos = 0.7) {
    await g.passarMouse(seletor, segundos);
    await g.tocar(seletor);
  }
  const textoNaTela = (t) => new Function(`return document.body.textContent.includes(${JSON.stringify(t)})`);

  await g.abrir('/', () => !!document.querySelector('app-ingresso-3d canvas') && !!document.querySelector('app-marquise'));

  await cena('abertura', async () => {
    await g.durante(1.8);
    // Pega o ingresso e gira com o mouse.
    await g.passarMouse('[data-ancora="hero"]', 0.8);
    await g.arrastarMouse(280, 12, 1.1);
    await g.durante(1.3);
  });

  await cena('viagem', async () => {
    await g.rolarAte(await g.posicao('#como-funciona') - 40, 1.5);
    await g.rolarAte(await g.posicao('#como-funciona', 'base') - ALTURA, 3.4);
    await g.rolarAte(await g.posicao('#janela'), 1.0);
    await g.rolarAte(await g.posicao('#janela', 'base') - ALTURA, 3.6);
  });

  await cena('assinatura', async () => {
    await g.rolarAte(await g.posicao('[data-ancora="canhoto"]', 'centro') - ALTURA / 2, 2.0);
    await g.gravarAte(() => !document.querySelector('app-assinatura-demo button').disabled);
    await g.durante(0.5);
    await clicar('app-assinatura-demo button', 0.8);
    await g.durante(2.4);
  });

  await cena('eventos', async () => {
    await clicar('header a[href="/events"]', 0.8);
    await g.gravarAte(() => document.querySelectorAll('a[href^="/events/"] h2').length > 3);
    await g.durante(0.8);
    const cartao = await g.marcar('evento', 'a[href^="/events/"]', EVENTO);
    await g.rolarAte(await g.posicao(cartao) - 110, 1.4);
    await g.passarMouse(cartao, 0.8);
    await g.durante(0.7);
    await g.tocar(cartao);
    await g.gravarAte(() => !!document.querySelector('[role="radiogroup"]'));
    await g.durante(1.6);
  });

  await cena('reserva', async () => {
    await g.rolarAte(await g.posicao('[role="radiogroup"]') - 180, 1.3);
    await clicar('[role="radio"]:not([disabled])', 0.7);
    await g.durante(0.5);
    const reservar = await g.marcar('reservar', 'button', 'Reservar e pagar depois');
    await g.rolarAte(await g.posicao(reservar, 'base') - ALTURA + 90, 0.9);
    await clicar(reservar, 0.6);
    await g.gravarAte(textoNaTela('Reserva criada'));
    await g.durante(1.6);
  });

  await cena('pagamento', async () => {
    await clicar(await g.marcar('irPagar', 'a', 'Ir para o pagamento'), 0.6);
    await g.gravarAte(textoNaTela('Pagar agora'));
    await g.durante(1.0);
    await clicar(await g.marcar('pagar', 'button', 'Pagar agora'), 0.6);
    await g.durante(0.4);
    await clicar(await g.marcar('pix', 'button', 'Pix'), 0.5);
    // O Angular só redesenha no quadro seguinte (eventCoalescing): primeiro espera o
    // "Processando…" aparecer, depois a aprovação tirar a reserva de "Aguardando
    // pagamento" — a consulta é a cada 1,5 s e a carteira recarrega da API.
    await g.gravarAte(textoNaTela('Processando'));
    await g.gravarAte(() => !document.body.textContent.includes('Processando')
      && !document.body.textContent.includes('Aguardando pagamento'), 12);
    await g.durante(1.4);
  });

  await cena('carteira', async () => {
    await g.rolarAte(Math.max(0, await g.posicao('[data-frente]') - 150), 0.9);
    const outro = await g.marcar('outro', '[data-cartao] button', 'Noite de Jazz');
    await clicar(outro, 0.7);
    await g.durante(1.8);
  });

  // O ingresso que acabou de ser comprado é o que vai passar pela portaria.
  const novo = (await minhasReservas(marina.token)).find((r) => !antes.has(r.id) && r.status === 'CONFIRMED');
  if (!novo) throw new Error('a compra da gravação não aparece como confirmada');

  // Corte para o organizador: escurece, troca de conta fora da gravação, clareia.
  await g.escurecer(0, 1, 0.35);
  await g.durante(0.4);
  await g.trocarSessao(organizador);
  // Pronta com o título na tela: a chegada dos dados e a contagem dos números entram no vídeo.
  await g.abrir('/organizer', () => document.body.textContent.includes('Painel de vendas'));
  await g.escurecer(1, 0, 0.4);

  await cena('painel', async () => {
    await g.durante(3.4);
  });

  await cena('portaria', async () => {
    await clicar(await g.marcar('portaria', 'main a', 'Portaria'), 0.7);
    await g.gravarAte(() => !!document.querySelector('input[placeholder="Código do ingresso"]'));
    await g.durante(0.6);
    const campo = 'input[placeholder="Código do ingresso"]';
    await g.colar(campo, novo.ticketToken);
    await g.durante(0.6);
    const validar = await g.marcar('validar', 'button', 'Validar');
    await clicar(validar, 0.5);
    await g.gravarAte(textoNaTela('Entrada liberada'));
    await g.durante(2.2);
    // O mesmo canhoto, de novo.
    await g.colar(campo, novo.ticketToken);
    await g.durante(0.5);
    await g.tocar(validar);
    await g.gravarAte(textoNaTela('Entrada recusada'));
    await g.durante(2.6);
  });

  await g.montar('linkedin-site.mp4', cenas);
  await g.fechar();
}

await montarComCenas({
  formato: 'horizontal', gravacao: 'linkedin-site.mp4', legendas: LEGENDAS, cartela: CARTELA,
  arquivo: 'canhoto-linkedin.mp4',
});
