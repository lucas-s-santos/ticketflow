// Prepara a conta usada nas gravações: Marina Costa (marina@demo.com / demo123),
// com quatro ingressos de eventos diferentes, um deles já usado na portaria.
// A conta cliente@demo.com acumula ingressos repetidos de testes e fica feia
// em vídeo. Rodar de novo não duplica nada: só cria o que estiver faltando.
//
// Precisa do backend no ar (localhost:8080) com os dados de demonstração da V7.
const API = process.env.API ?? 'http://localhost:8080/api';
const CONTA = { name: 'Marina Costa', email: 'marina@demo.com', password: 'demo123', role: 'CLIENTE' };

/** Na ordem em que aparecem na carteira; o último sai com check-in feito. */
const INGRESSOS = [
  { evento: 'Festival Aurora — Edição Verão', setores: ['Pista', 'Camarote'] },
  { evento: 'Noite de Jazz na Serra', setores: ['Mesa (4 lugares)', 'Plateia'] },
  { evento: 'Dev Summit Brasil', setores: ['Inteira'] },
  { evento: 'Stand-Up: Sessão Dupla', setores: ['Plateia Baixa', 'Plateia Alta'], usado: true },
];

async function chamar(metodo, caminho, token, corpo, extras = {}) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extras },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  if (!r.ok) throw Object.assign(new Error(`${metodo} ${caminho} -> HTTP ${r.status}: ${texto.slice(0, 200)}`), { status: r.status });
  return texto ? JSON.parse(texto) : null;
}

async function entrarOuCriar() {
  try {
    return await chamar('POST', '/auth/login', null, { email: CONTA.email, password: CONTA.password });
  } catch (e) {
    if (e.status !== 401 && e.status !== 404) throw e;
    console.log(`criando a conta ${CONTA.email}`);
    return chamar('POST', '/auth/register', null, CONTA);
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const marina = (await entrarOuCriar()).token;
const organizador = (await chamar('POST', '/auth/login', null, { email: 'organizador@demo.com', password: 'demo123' })).token;

const eventos = (await chamar('GET', '/events?page=0&size=50', marina)).content;
const minhas = await chamar('GET', '/reservations/me', marina);

for (const desejado of INGRESSOS) {
  let reserva = minhas.find((r) => r.status === 'CONFIRMED' && r.eventName === desejado.evento);
  if (!reserva) {
    const resumo = eventos.find((e) => e.name === desejado.evento);
    if (!resumo) throw new Error(`evento não encontrado: ${desejado.evento}`);
    const evento = await chamar('GET', `/events/${resumo.id}`, marina);
    const setor = desejado.setores.map((n) => evento.sectors.find((s) => s.name === n && s.availableSeats > 0)).find(Boolean)
      ?? evento.sectors.find((s) => s.availableSeats > 0);
    if (!setor) throw new Error(`sem vagas em ${desejado.evento}`);

    const nova = await chamar('POST', '/reservations', marina, { ticketSectorId: setor.id, quantity: 1 });
    const pagamento = await chamar('POST', '/payments', marina, { reservationId: nova.id, method: 'PIX' }, { 'Idempotency-Key': crypto.randomUUID() });
    let status = pagamento.status;
    for (let i = 0; i < 20 && status === 'PROCESSING'; i++) {
      await espera(1000);
      status = (await chamar('GET', `/payments/${pagamento.id}`, marina)).status;
    }
    if (status !== 'APPROVED') throw new Error(`pagamento de ${desejado.evento} terminou em ${status}`);
    reserva = (await chamar('GET', '/reservations/me', marina)).find((r) => r.id === nova.id);
    console.log(`ingresso criado: ${desejado.evento} · ${setor.name}`);
  }
  if (desejado.usado && !reserva.checkedInAt) {
    await chamar('POST', '/tickets/validate', organizador, { token: reserva.ticketToken });
    console.log(`check-in feito: ${desejado.evento}`);
  }
}

const final = await chamar('GET', '/reservations/me', marina);
console.log('\ncarteira da Marina:');
for (const r of final.filter((x) => x.status === 'CONFIRMED')) {
  console.log(`  ${r.checkedInAt ? 'usado ' : 'válido'}  ${r.eventName} · ${r.sectorName}`);
}
