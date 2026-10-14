# Redesign visual do Canhoto — estado e próximos passos

> Documento de continuação. Escrito em 2026-10-14 para retomar o trabalho em
> outro computador, por uma pessoa ou por uma sessão nova do Claude Code.
> Leia a seção 1 e a 5 antes de mexer em qualquer coisa.

Objetivo: dar movimento e presença à identidade que o Canhoto já tem — papel
creme, tinta preta, verde `#B9F706`, Fraunces + Archivo + Space Mono, cartões
com recorte de ingresso — **sem trocar essa identidade por outra**. A
referência de motion é GSAP; as ideias vêm do Skiper UI, spell.sh, reactbits e
inspora (seção 4).

---

## 1. Onde paramos

- **Branch:** `feature/canhoto-rebrand-e-correcoes` (já no GitHub).
- **Feito:** ingresso 3D girando no hero da home (seção 3).
- **Próximo:** item 1 do roteiro — "Como funciona" com cards empilhando (seção 6).
- **Dependências novas no front:** `gsap` 3.15, `three` 0.186, `@types/three` (dev).

### Retomar em outro computador

```bash
git clone https://github.com/lucas-s-santos/ticketflow.git
cd ticketflow
git checkout feature/canhoto-rebrand-e-correcoes

docker compose up -d                 # Postgres + RabbitMQ (Docker Desktop aberto antes)

cd backend
./mvnw spring-boot:run               # precisa de JDK 21 (JAVA_HOME apontando para ele)

cd ../frontend
npm install                          # o projeto usa npm, NÃO pnpm
npm start                            # http://localhost:4200
```

Contas de demonstração: `organizador@demo.com` e `cliente@demo.com`, senha `demo123`.

**Problemas já vistos:**

| Sintoma | Causa | Solução |
|---|---|---|
| Backend cai com `ClassFormatError: Invalid method Code length 0` | `.class` corrompido em `backend/target/` (extensão Java do VS Code ou OneDrive escrevendo na mesma pasta) | `./mvnw clean spring-boot:run` |
| `release 21 not supported` no Maven | `java` do PATH é antigo | definir `JAVA_HOME` para o JDK 21 |
| `docker info` falha com `dockerDesktopLinuxEngine` | Docker Desktop fechado | abrir o Docker Desktop e esperar ~30s |
| `npm install` avisa `allow-scripts` | npm novo bloqueia scripts de instalação | inofensivo hoje; se o `ng serve` reclamar do esbuild, `npm approve-scripts esbuild` |

**Arquivos que NÃO estão no repositório** (de propósito, ver `.gitignore`): os
dois vídeos promocionais `Canhoto_*.mp4` da raiz (~5 MB e ~8 MB). Eles só
existem no computador onde foram gerados. O item 8 do roteiro precisa deles:
leve-os por pendrive/drive, e o que entrar no repositório deve ser uma versão
comprimida em `frontend/public/`.

---

## 2. Decisões já tomadas (não reabrir sem motivo)

1. **Os comandos `pnpm dlx shadcn add @skiper-ui/...` não funcionam aqui.**
   O Skiper UI é React/Next.js e o Canhoto é Angular — o CLI do shadcn não
   instala em Angular. Além disso, 11 dos 18 componentes listados são pagos (o
   registro responde `Missing license key`). Caminho escolhido: **recriar a
   ideia em Angular + GSAP**, não portar código.
2. **npm, não pnpm.** O projeto tem `package-lock.json`.
3. **GSAP inteiro é gratuito** desde a 3.13, incluindo `SplitText`,
   `ScrollTrigger`, `Flip`, `Draggable`, `InertiaPlugin`, `MorphSVG`,
   `DrawSVG`. Não precisa de conta nem token.
4. **O ingresso 3D é gerado em código**, sem Blender/Spline. A forma é uma placa
   com recortes; as faces são desenhadas em canvas com as fontes da marca. Se um
   dia quiser um objeto modelado (palco, logo em volume): Spline
   (spline.design, no navegador, mais fácil) ou Blender (gratuito) → exportar
   `.glb` → carregar com `GLTFLoader` na mesma cena.
5. **Identidade mantida.** Tokens em `frontend/src/styles.css` (cores como
   variáveis CSS) e `tailwind.config.js`. Nada de rounded-xl em tudo, nada de
   pílulas, verde nunca como cor de texto sobre creme (contraste 1.16) — use
   `acento-texto` / `acento-escuro`.

---

## 3. O que foi feito: ingresso 3D no hero

Arquivos:

- `frontend/src/app/features/home/ingresso-3d/ingresso-3d.component.ts` — moldura Angular. Faz `import()` dinâmico da cena, fora da zona do Angular.
- `frontend/src/app/features/home/ingresso-3d/ingresso-3d.cena.ts` — Three.js + GSAP: geometria, materiais, luz, ciclo de giro, arraste, rolagem.
- `frontend/src/app/features/home/ingresso-3d/ingresso-3d.texturas.ts` — desenho das faces em canvas (frente preta, verso verde, mapas do selo holográfico).
- `frontend/src/app/features/home/home.component.ts` — hero novo + entrada do título com `SplitText`.
- `frontend/src/styles.css` — classe `.luz-palco` (refletor verde e feixes de luz do fundo).

Comportamento:

- Entra subindo e girando enquanto o título sobe linha a linha (único momento orquestrado da página).
- Ciclo: segura a frente ~3,8s → vira para o verso (1,7s) → segura ~2,6s → volta. Sempre no mesmo sentido.
- Balanço e flutuação leves em repouso; inclina seguindo o mouse (só com mouse, não no toque).
- **Arrastar gira**; ao soltar, a inércia projeta e encaixa na face mais próxima. Dica "Arraste para girar" some no primeiro arraste e ao rolar.
- Ao rolar para fora do hero, o ingresso deita para trás (ScrollTrigger com scrub).
- `prefers-reduced-motion`: sem entrada, sem ciclo, sem balanço — pose fixa inclinada; arrastar continua funcionando.
- Sem WebGL: cai para a face da frente como imagem chapada.

Onde ajustar:

| Quero mudar | Onde |
|---|---|
| Textos, campos, cores das faces | `desenharFrente()` / `desenharVerso()` em `ingresso-3d.texturas.ts` |
| Proporção, posição da perfuração | `LARGURA`, `ALTURA`, `POSICAO_PERFURACAO` em `ingresso-3d.texturas.ts` |
| Recortes, dentes, espessura | constantes no topo de `ingresso-3d.cena.ts` |
| Tempo do ciclo de giro | timeline `ciclo` em `ingresso-3d.cena.ts` |
| Brilho / quão preto fica | `cena.environmentIntensity` (0.3) e `clearcoat` (0.18) em `ingresso-3d.cena.ts` |
| Quanto o ingresso sangra para a direita | classes `lg:-mr-4 xl:-mr-16 2xl:-mr-36` no hero de `home.component.ts` |

Peso: a cena é um chunk lazy de ~141 kB (gzip) que só baixa depois da primeira
pintura. O pacote inicial continua em ~97 kB.

Cuidados que já estão no código e precisam continuar:

- Canvas só desenha depois de `carregarFontes()` — texto desenhado com fonte reserva não muda depois.
- Cada efeito escreve no **seu próprio grupo** (`rolagem`, `entrada`, `inclinacao`, `giro`); dois efeitos no mesmo `transform` se sobrescrevem.
- O QR do ingresso é **decorativo de propósito** (semente fixa). QR funcional em material de marketing é convite a golpe.

Não verificado ainda: celular de verdade (arraste por toque), Safari e Firefox.
Os testes foram em Chrome headless com renderização por software.

---

## 4. Referências

- Skiper UI: `https://skiper-ui.com/v1/skiperN` (troque N pelo número). Grátis: 16, 19, 26, 28, 30, 48, 67. Pagos: 6, 8, 13, 21, 29, 32, 35, 42, 55, 71, 76.
- spell.sh — React. Usado: ideia dos feixes de luz (Light Rays) no fundo do hero.
- reactbits.dev — React. Úteis: Decrypted/Scrambled Text, Count Up, backgrounds.
- inspora.design — galeria. Usado: "Holo 3D Card" virou o selo holográfico.
- originkit.dev — não deu para ler (página montada por JavaScript).

---

## 5. Princípios de motion (valem para todo o roteiro)

1. **Um momento orquestrado por página.** O resto fica quieto. Fade-and-slide em toda seção vira ruído.
2. **GSAP sempre fora da zona do Angular:** `this.zona.runOutsideAngular(...)` dentro de `afterNextRender`. Senão o ticker dispara detecção de mudanças a cada quadro.
3. **`gsap.context(() => {...}, raiz)` + `ctx.revert()` no `ngOnDestroy`.** Sem isso, ScrollTriggers e tweens vazam entre rotas.
4. **Bibliotecas pesadas por `import()` dinâmico**, nunca no pacote inicial (orçamento: 500 kB aviso / 1 MB erro em `angular.json`).
5. **Só `transform` e `opacity`** (e `clip-path` para revelações). Nada de animar `width`, `height`, `top`, `margin`.
6. **Curvas:** entrada/saída com `expo.out` ou `power3.out`; movimento na tela com `power3.inOut`; nunca `ease-in` em UI. Interações de UI abaixo de 300ms.
7. **Hover só com mouse:** `@media (hover: hover) and (pointer: fine)`. No toque, hover dispara no tap.
8. **Botões respondem ao toque:** `scale(0.97)` no `:active`, ~160ms.
9. **`prefers-reduced-motion`:** tirar movimento e posição; manter opacidade/cor quando ajudam a entender.
10. **Nunca animar de `scale(0)`:** começar de `0.9`–`0.95` com opacidade.
11. Estilos novos vão em `styles.css` (o orçamento por componente é 2 kB / 4 kB).

---

## 6. Roteiro (em ordem recomendada)

### 1. Home — "Como funciona" empilhando  ← começar aqui
- **Ref:** skiper16 (Card stack scroll) + skiper19 (SVG follow scroll).
- **Onde:** seção `#como-funciona` em `home.component.ts`.
- **Ideia:** os 3 passos (`.bilhete`) ficam `position: sticky` e se empilham como ingressos à medida que a pessoa rola; o de baixo encolhe levemente (`scale` 0.94, escurece). Uma linha de perfuração (SVG pontilhado) se desenha ligando os passos, com `ScrollTrigger` + `scrub` animando `stroke-dashoffset` (ou `DrawSVGPlugin`).
- **Cuidado:** no celular, empilhar pode virar só lista — testar altura. Reduced motion: lista normal.

### 2. Home — revelações e a seção "O canhoto"
- **Ref:** skiper32/71 (Image reveal), reactbits Decrypted Text.
- **Onde:** seções `secoes` em `home.component.ts`; pode substituir `RevelarDirective` nessas imagens.
- **Ideia:** a foto entra por máscara `clip-path: inset(100% 0 0 0)` → `inset(0)` com `power3.inOut`. Na seção "O canhoto", um código HMAC de exemplo (`a7f3 9c2e 41bd…`) embaralha caracteres e assenta — mostra que o código é assinado.

### 3. Meus ingressos como carteira
- **Ref:** skiper21 (Family wallet) + skiper48 (Card swipe carousel).
- **Onde:** `features/reservations/my-reservations/my-reservations.component.ts`.
- **Ideia:** ingressos empilhados como no Apple Wallet; tocar abre o ingresso com QR (transição com `Flip` do GSAP). No celular, arrastar para o lado troca de ingresso (`Draggable` + `InertiaPlugin`).
- **Cuidado:** é a tela mais funcional do app — QR tem que abrir rápido, sem animação longa no caminho.

### 4. Lista de eventos
- **Ref:** skiper35 (Hover expand); adaptação do skiper6 (imagem seguindo o cursor).
- **Onde:** `features/events/events-list/events-list.component.ts`.
- **Ideia:** no desktop, cards que expandem a foto no hover (só com mouse). Alternativa editorial: lista de nomes de eventos em Fraunces grande, com a foto do evento flutuando junto ao cursor (`gsap.quickTo`).
- **Cuidado:** busca e paginação já existem — não quebrar.

### 5. Detalhe do evento
- **Ref:** skiper29/30/55 (parallax).
- **Onde:** `features/events/event-detail/event-detail.component.ts`.
- **Ideia:** banner com parallax por `ScrollTrigger` e o seletor de setores com transição de estado. A `ParalaxeDirective` atual funciona; migrar só se ganhar algo.

### 6. Menu do celular
- **Ref:** skiper13 (Nike menu).
- **Onde:** `shared/components/navbar/navbar.component.ts`.
- **Ideia:** menu em tela cheia, links em Fraunces grande entrando em cascata (30–80ms entre itens), fechar mais rápido do que abrir.

### 7. Painel do organizador
- **Ref:** reactbits Count Up; skiper76 (Apple feature block) como inspiração de layout.
- **Onde:** `features/organizer/dashboard/dashboard.component.ts`.
- **Ideia:** números rolando até o valor (`.numero` já usa `tabular-nums`, então não "dançam"), barras de ocupação por setor crescendo na entrada.
- **Cuidado:** painel é ferramenta de uso diário — animação só na primeira carga, nunca em atualização.

### 8. Seção de vídeo
- **Ref:** skiper67 (Video player).
- **Ideia:** vídeo promo em destaque na home, com capa e play que abre em modal.
- **Pré-requisito:** os `.mp4` da raiz (seção 1) comprimidos em `frontend/public/` — alvo < 3 MB, `preload="none"`, com `poster`.

### 9. Modo escuro
- **Ref:** skiper26 (Theme toggle).
- **Onde:** `styles.css` (redefinir as variáveis em `[data-tema="escuro"]`) + botão na navbar.
- **Cuidado:** refazer as contas de contraste da rampa `tinta`/`papel` — o arquivo documenta por que cada tom passa no AA.

### 10. Micro-interações globais
- `scale(0.97)` no `:active` de `.btn` (hoje é `translate-y-px`), hovers atrás de `@media (hover: hover)`, foco visível intacto.

### Descartados
- skiper6 como vitrine de equipe (não há equipe; só a ideia do item 4 serve).
- skiper8 Words preloader — preloader só atrasa o conteúdo.
- skiper42 ícones animados — pouco ganho para o custo.

---

## 7. Como conferir visualmente

Screenshots automáticos ajudam a revisar sem abrir o navegador. Numa pasta
**fora do repositório**:

```bash
npm init -y && npm install puppeteer-core
```

```js
// shots.mjs — uso: node shots.mjs 1440 900 desk 3000,9000
import puppeteer from 'puppeteer-core';
const [w, h, nome, tempos] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', // ajuste no outro PC
  headless: 'new',
  // WebGL por software: funciona sem GPU, mas é lento (o ciclo do GSAP atrasa)
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
page.on('pageerror', (e) => console.log('erro:', e.message));
await page.goto('http://localhost:4200/', { waitUntil: 'load' }); // não use networkidle0: o dev server nunca fica ocioso
const t0 = Date.now();
for (const ms of tempos.split(',').map(Number)) {
  await new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - t0))));
  await page.screenshot({ path: `${nome}-${ms}.png` });
}
await browser.close();
```

Para testar movimento reduzido:
`await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])`
antes do `goto`.

Antes de subir qualquer etapa: `npx ng build` em `frontend/` precisa passar sem
erro e sem estourar o orçamento.
