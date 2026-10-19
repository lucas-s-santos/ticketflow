# Redesign visual do Canhoto — estado e próximos passos

> Documento de continuação. Escrito em 2026-10-14 e atualizado em 2026-10-19,
> para retomar o trabalho em outro computador, por uma pessoa ou por uma sessão
> nova do Claude Code. Leia a seção 1 e a 5 antes de mexer em qualquer coisa.

Objetivo: dar movimento e presença à identidade que o Canhoto já tem — papel
creme, tinta preta, verde `#B9F706`, Fraunces + Archivo + Space Mono, cartões
com recorte de ingresso — **sem trocar essa identidade por outra**. A
referência de motion é GSAP; as ideias vêm do Skiper UI, spell.sh, reactbits e
inspora (seção 4).

---

## 1. Onde paramos

- **Branch:** `feature/canhoto-rebrand-e-correcoes` (já no GitHub).
- **Feito:** o ingresso 3D viajando pela home, com a janela para o show e o rasgo
  (seção 3); itens 1 a 4 do roteiro, o banner do item 5 e a transição entre
  páginas (seção 6). De carona, um bug crítico de pagamento no backend (seção 8).
- **Revisão de celular (2026-10-15):** todas as telas auditadas em 390×844 (script
  de auditoria na seção 7); nenhuma rola para o lado.
- **Vídeos de divulgação (2026-10-19):** a pasta `gravacao/` grava o Reels do
  Instagram e o vídeo do LinkedIn a partir do site rodando (item 11 do roteiro e
  `gravacao/README.md`). Os MP4 ficam em `gravacao/saida/`, fora do repositório.
- **Próximo:** regerar o vídeo da catraca (prompt corrigido no item 8) e decidir o
  modo escuro (item 9) — perguntar ao Lucas antes, porque muda a identidade.
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
Para os vídeos há também a `marina@demo.com` (mesma senha), criada pelo
`npm run dados` da pasta `gravacao/`.

**Problemas já vistos:**

| Sintoma | Causa | Solução |
|---|---|---|
| Backend cai com `ClassFormatError: Invalid method Code length 0`, ou teste/contexto falha com `java.lang.Error: Unresolved compilation problems` | A extensão Java do VS Code (compilador do Eclipse) grava `.class` na mesma `backend/target/classes` do Maven — às vezes de um arquivo no meio da edição — e o Maven reaproveita | **Sempre** `./mvnw clean ...`; e pare o `spring-boot:run` antes de rodar testes (os dois compilam na mesma pasta) |
| `clean` falha com `Failed to delete ...\target\...` | Algum terminal está com a pasta `target` aberta (no Windows, pasta em uso fica travada) | sair da pasta e repetir |
| Login devolve 429 depois de vários testes | Limite de 10 tentativas a cada 5 min por origem (é o app funcionando) | esperar a janela, ou nos scripts logar uma vez e reaproveitar o token (seção 7) |
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

## 3. O ingresso 3D que viaja pela home

Arquivos (todos em `frontend/src/app/features/home/`):

- `ingresso-3d/ingresso-3d.component.ts` — moldura Angular. Recebe o `roteiro` e faz `import()` dinâmico da cena, fora da zona do Angular.
- `ingresso-3d/ingresso-3d.cena.ts` — Three.js + GSAP: geometria em duas peças, materiais, luz, ciclo de giro, arraste, roteiro, rasgo, selo.
- `ingresso-3d/ingresso-3d.texturas.ts` — faces em canvas, mapas do selo, **as medidas do contorno** e `svgDoIngresso()` (o mesmo contorno em SVG, usado como máscara da janela do show).
- `ingresso-3d/roteiro.ts` — só os tipos do roteiro (sem Three.js).
- `janela-show/janela-show.component.ts` — a janela para o show.
- `home.component.ts` — o `ROTEIRO` (as paradas) e as âncoras no template.

**Como funciona.** O canvas é `position: fixed`, do tamanho do hero (×1.35), e
fica por cima da página com `pointer-events: none`. Cada seção da home tem uma
âncora vazia (`data-ancora="hero" | "como" | "janela" | "canhoto" | "porque"`)
que diz onde o ingresso fica. O `ROTEIRO` lista as paradas em ordem, cada uma com
o momento da rolagem em que o ingresso está exatamente ali (`quando`), pose,
"vida" (quanto gira, balança e segue o mouse), opacidade e rasgo. A cada quadro a
cena descobre entre quais paradas a rolagem está, interpola tudo e move o canvas
com `transform` de CSS. **Ela não usa um canvas do tamanho da tela de propósito**:
em tela de alta densidade seriam milhões de pixels por quadro para mostrar um
cartão.

A viagem:

1. **Hero:** entra girando enquanto o título sobe; ciclo frente → verso; balança; inclina com o mouse; **arrastar gira** (a âncora do hero recebe o arraste, já que o canvas não recebe ponteiro).
2. **Como funciona** (só desktop): pequeno embaixo do trilho dos passos, virando devagar enquanto eles se empilham. No celular a âncora some e ele também.
3. **Janela para o show:** pousa reto, do tamanho exato do recorte, e some; por baixo aparece a foto da plateia recortada no formato dele, e o recorte cresce até a foto tomar a tela.
4. **"O canhoto":** no lugar da foto. Quando a demonstração acusa adulteração (evento de janela `canhoto:assinatura`), o selo acende em vermelho e ele treme.
5. **"Por que Canhoto?":** rasga na perfuração; o canhoto se solta e vem para perto.

- `prefers-reduced-motion`: o roteiro vira só o hero (sem viagem), a foto volta a "O canhoto" e a janela vira foto inteira estática.
- Sem WebGL: imagem chapada no hero, foto em "O canhoto".

Onde ajustar:

| Quero mudar | Onde |
|---|---|
| Por onde ele passa, pose em cada lugar, quando rasga | `ROTEIRO` em `home.component.ts` (e as âncoras no template) |
| Textos, campos, cores das faces | `desenharFrente()` / `desenharVerso()` em `ingresso-3d.texturas.ts` |
| Proporção, perfuração, mordidas, dentes | constantes no topo de `ingresso-3d.texturas.ts` (a máscara da janela acompanha) |
| Como as peças se separam no rasgo | `aplicarRasgo()` em `ingresso-3d.cena.ts` |
| Tempo do ciclo de giro | timeline `ciclo` em `ingresso-3d.cena.ts` |
| Brilho / quão preto fica | `cena.environmentIntensity` (0.3) e `clearcoat` (0.18) |
| Fases da janela (troca, crescimento, texto) | `FASES` em `janela-show.component.ts` — `trocaAte` precisa bater com a parada `fracao: 0.1` do roteiro |

Peso: a cena é um chunk lazy de ~124 kB (gzip) que só baixa depois da primeira
pintura. O pacote inicial continua em ~99 kB.

Cuidados que já estão no código e precisam continuar:

- Canvas só desenha depois de `carregarFontes()` — texto desenhado com fonte reserva não muda depois.
- Cada efeito escreve no **seu próprio grupo** (`entrada`, `pose`, `inclinacao`, `giro`, e um pivô por peça); dois efeitos no mesmo `transform` se sobrescrevem.
- As duas peças **se sobrepõem um fio** (`SOBREPOE`) na linha do rasgo. Encostadas exatamente, a borda verde de dentro vazava pela emenda como uma linha.
- Na janela, **a máscara fica numa moldura parada e o zoom só na foto de dentro**: na mesma camada, o `scale` levava a máscara junto e a janela saía maior que o ingresso e fora do lugar.
- Paradas com `quando: 'secao'` medem a seção (não sticky), não a âncora: elemento sticky muda de posição com a rolagem e quebraria a conta.
- O QR do ingresso é **decorativo de propósito** (semente fixa). QR funcional em material de marketing é convite a golpe.

Não verificado ainda: celular de verdade, Safari e Firefox. Os testes foram em
Chrome headless com renderização por software (lento para WebGL: a viagem
completa leva minutos para fotografar).

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

### 1. Home — "Como funciona" empilhando  ✅ feito (2026-10-15)
- **Onde:** `features/home/como-funciona/como-funciona.component.ts` + `.bilhete-passo` em `styles.css`.
- **Como ficou:** os 3 passos são ingressos deitados (em pé no celular) que grudam no topo um sobre o outro. O empilhamento é **CSS puro** (`sticky` com topo crescente via `--i`); o script só escurece o de baixo enquanto o próximo o cobre e acende os números.
- **Revisto em 2026-10-15 (pedido do Lucas: "cartões em cima do outro certinho" e manter os números acendendo):** os cartões têm **a mesma altura** (`h-[25rem]` celular, `md:h-[22rem]`) e **não encolhem mais** — encolher deixava os de trás mais estreitos e o maço torto. Cada um gruda 12–16 px abaixo do anterior, com sombra para cima (`.sombra-maco`). Os números (`.numero-passo` em `styles.css`) acendem em verde e o atual brilha e dá um pulo; no **celular** há uma faixa grudada no topo com 01–02–03 e a perfuração enchendo, já que o trilho lateral é só de desktop. Tudo que mostra o passo atual tem `data-passo`, e o script só reescreve os atributos quando o passo muda.
- **Armadilhas:** (1) ScrollTrigger mede errado a posição de elemento `sticky` — as contas são feitas à mão, relativas à janela, com a posição natural somando alturas. (2) Posições guardadas em px quebram quando a marquise aparece depois da API e empurra a página — por isso tudo é recalculado por quadro a partir de um único `getBoundingClientRect`. (3) O efeito só começa quando o próximo cartão **encosta** no de baixo, senão ele escurece antes de ser coberto.

### 2. Home — revelação da foto e a seção "O canhoto"  ✅ feito (2026-10-15)
- **Onde:** `shared/directives/revelar-mascara.directive.ts` e `features/home/assinatura-demo/assinatura-demo.component.ts`.
- **Como ficou:** a foto abre por `clip-path` enquanto assenta de 1.18 para 1. Ao lado, em vez de texto embaralhando por enfeite, uma **demonstração de verdade**: o botão "Trocar um caractere" altera o id da reserva, a assinatura é recalculada com **HMAC-SHA256 real** (Web Crypto), embaralha com o `ScrambleTextPlugin` e o selo vai de "Válido" para "Assinatura não confere". A chave é só da demo (a real fica no backend).
- **Armadilha importante:** o Chrome aplica `clip-path` no cálculo do `IntersectionObserver`. Com a moldura totalmente recortada, o observador **nunca dispara** — e o `loading="lazy"` da imagem (mesmo mecanismo) **nunca baixa a foto**. A diretiva mede por `getBoundingClientRect` na rolagem e força `loading="eager"`. Vale para qualquer revelação futura por `clip-path`.

### 3. Meus ingressos como carteira  ✅ feito (2026-10-15)
- **Onde:** `features/reservations/my-reservations/my-reservations.component.ts` + `.sombra-maco` em `styles.css`.
- **Como ficou:** o primeiro ingresso **válido** fica aberto, com o QR à vista (na portaria, zero toques). Os outros formam um maço de cabeçalhos com sombra para cima; os usados vão para o fim, esmaecidos. Tocar num cartão do maço o traz para a frente com **`Flip`** (ele atravessa e abre; o anterior fecha). No desktop é **uma lista só em grid de duas colunas** — aberto fixo à esquerda, maço à direita —, o que deixa o Flip mover o cartão entre as colunas sem duplicar DOM. Foco vai para o ingresso aberto; o canhoto dos cartões do maço é `inert`.
- **Armadilhas:** (1) referência de template `#carteira` com o mesmo nome do `computed` `carteira` → "not callable"; a referência virou `#maco`. (2) `filter: drop-shadow` em 14 cartões pesava na animação → `box-shadow`, e por isso só o aberto usa `.bilhete` (a máscara cortaria a sombra). (3) Nome de classe com `/` ou `[]` não funciona em `[class.xxx]` do Angular — crie uma classe nomeada no `styles.css`.
- **Arraste no celular (feito em 2026-10-15):** no toque, arrastar o ingresso aberto para o lado troca para o vizinho (esquerda = próximo, direita = anterior, dando a volta). Peteleco (> 0,35 px/ms) ou um terço da largura troca; menos que isso volta com mola. Só vira arraste depois de andar 8 px mais na horizontal que na vertical — o mesmo dedo rola a página. Mouse fica de fora (no desktop o maço está ao lado). Pointer events puros com delegação na raiz do componente; não precisou do `Draggable`.

### 4. Lista de eventos  ✅ feito (2026-10-15)
- **Onde:** `features/events/events-list/events-list.component.ts`.
- **Como ficou:** o destaque é um **banner de ponta a ponta** (`mx-[calc(50%-50vw)]`), com o preço num canhoto pequeno no canto. Os demais em **linhas de três**: no desktop o cartão sob o mouse ou com foco cresce (`grow-[1.7]`) e os vizinhos cedem — o "hover expand" do skiper35. Abaixo de lg as linhas viram `display: contents` e os cartões caem numa grade de duas colunas; linha incompleta ganha espaçadores para não esticar um cartão sozinho.
- **Globais que vieram junto:** `hoverOnlyWhenSupported` no Tailwind (hover só com mouse em todo o sistema) e `overflow-x: clip` no `<main>` (foto de 100vw não gera rolagem lateral; `clip`, e não `hidden`, para o `sticky` das páginas continuar funcionando).

### 5. Detalhe do evento  ✅ banner feito (2026-10-15)
- **Onde:** `features/events/event-detail/event-detail.component.ts`.
- **Como ficou:** a capa é um banner de ponta a ponta com paralaxe (a `ParalaxeDirective` existente) e o nome por cima. Evento sem capa mantém o layout antigo.
- **Ainda dá para fazer:** transição de estado no seletor de setores.

### Novo — Transição entre páginas  ✅ feito (2026-10-15)
- **Onde:** `withViewTransitions` em `app.config.ts`, CSS `::view-transition-*` em `styles.css`, `nomearCapa()` na lista, banner do detalhe.
- **Como ficou:** toda troca de rota tem crossfade curto (220 ms); clicando num evento, **a capa voa do cartão até o banner** do detalhe. Desligado com movimento reduzido; navegador sem suporte só troca de página.
- **Armadilhas:** (1) o navegador fotografa a página nova logo que a rota renderiza — com o banner esperando a API, não havia o que ligar. A lista manda capa e nome por `RouterLink [state]` e o detalhe desenha o banner já no primeiro quadro. (2) Só a capa clicada recebe `view-transition-name` (dois elementos com o mesmo nome cancelam a transição). (3) O nome fica na moldura com `overflow: hidden`, não na `<img>`: o navegador captura o elemento sem o recorte dos ancestrais. (4) O build avisa `8 rules skipped due to selector errors` — é só a etapa de CSS crítico, que não entende pseudo-elementos; as regras continuam no CSS final (conferido no `dist/`).

### Novo — Janela para o show  ✅ feito (2026-10-15)
- Ver seção 3, parada 3. Desde 2026-10-16 dentro da janela roda um vídeo do show (item 8), não mais a foto `hero-show.jpg` (removida).

### 6. Menu do celular  ✅ feito (2026-10-15)
- **Onde:** `shared/components/navbar/navbar.component.ts` (+ `@keyframes surgir` em `styles.css`).
- **Como ficou:** painel escuro de tela cheia abaixo da barra, links grandes em Fraunces entrando em cascata (50 ms entre itens), página atual em verde, usuário e "Sair" no pé. Fecha sem animação; Esc fecha; a página de trás não rola enquanto está aberto.
- **Armadilhas:** (1) **a navbar nunca grudou no topo** — o `sticky` estava no `<header>`, preso dentro do `<app-navbar>`, que tem a altura dele. O host agora é `display: contents`. Vale para qualquer componente cujo elemento raiz precise de `sticky`. (2) O painel do menu fica **fora** do `<header>`: com a barra sólida, o `backdrop-filter` dela vira referência de posicionamento dos filhos `fixed`, e o painel ficava preso à altura da barra.

### 7. Painel do organizador  ✅ feito (2026-10-15)
- **Onde:** `features/organizer/dashboard/dashboard.component.ts`, `shared/directives/contagem.directive.ts`, `.barra-ocupacao` em `styles.css`.
- **Como ficou:** os totais contam até o valor (`appContagem`, só na primeira exibição); as barras de ocupação crescem da esquerda (`scaleX`, não `width`). No celular cada setor vira uma linha empilhada — a tabela de cinco colunas só cabia rolando para o lado.

### 8. Vídeo na janela para o show  ✅ feito (2026-10-16)
- **Decisão:** em vez de uma seção a mais, o vídeo entra **dentro da janela para o show** — a foto da plateia virou o show em movimento.
- **Arquivos:** `frontend/public/janela-show.mp4` (9 s, 1600 px, sem som, 2,8 MB) e `janela-show.jpg` (poster = primeiro quadro). Ligados em `MIDIA`, no topo de `janela-show.component.ts`. O `<video>` (mudo, loop, `playsinline`) só baixa e toca com a seção por perto e pausa fora dela; com movimento reduzido fica o poster.
- **Origem:** gerado no Google Flow (Veo, 16:9, 1080p) — o bruto `Crowd_watching_concert_stage_1080p_20261015220432.mp4` fica na raiz do computador de casa (`/*.mp4` da raiz não vai para o git). Havia outra variação boa (`..._20261015220323.mp4`, mais escura); dá para trocar com o mesmo comando abaixo.
- **Os `.mp4` antigos da raiz não servem:** roxos, com texto de IA embaralhado e letreiro em inglês; girar o matiz para o verde deixava lasers rosa e pessoas verdes.
- **Comando usado** (o loop fecha sem pulo: o último segundo se dissolve no primeiro):

  ```bash
  ffmpeg -i BRUTO.mp4 -an -filter_complex "[0:v]split[a][b];[a]trim=start=1,setpts=PTS-STARTPTS[corpo];[b]trim=0:1,setpts=PTS-STARTPTS[inicio];[corpo][inicio]xfade=transition=fade:duration=1:offset=8,scale=1600:-2,format=yuv420p[v]"          -map "[v]" -c:v libx264 -crf 28 -preset slow -movflags +faststart frontend/public/janela-show.mp4
  ffmpeg -i frontend/public/janela-show.mp4 -frames:v 1 -q:v 4 frontend/public/janela-show.jpg
  ```
  (`offset` = duração do bruto − 2; para 10 s, 8. Alvo < 3 MB: se passar, suba o `-crf`.)

- **Prompt que funcionou** (Flow, 16:9, 1080p, 8 s; gerar 2–4 variações):

  > Cinematic wide shot from inside a packed concert crowd at night, looking toward a big stage. Acid lime-green stage lights and laser beams cut through thick haze; everything else is deep black and dark charcoal. Silhouettes of the crowd in the foreground with hands raised, backlit. Slow, steady dolly-in toward the stage. Shallow depth of field, subtle film grain. No text, no logos, no letters, no numbers, no screens, no phones. Main subject centered so the frame can be cropped to vertical.

- **Pendente — vídeo da catraca:** o primeiro saiu com **"#B9F706" escrito no scanner** (o código da cor estava no prompt e a IA escreveu como texto). Apagar com `delogo` deixou retângulos borrados em cima do anel e do celular — não serve. Regerar com o prompt abaixo (sem código de cor). Ideia de uso: o cartão do passo 02 do "Como funciona" ("Entre com o canhoto") com o vídeo no lugar da foto.

  > Close-up at a concert venue entrance at night: a hand holds a smartphone showing a large plain QR code (no text on the screen) and brings it to a dark metal turnstile scanner with a glowing acid lime-green ring light. The ring flashes brighter as it reads the code, then the gate opens and the camera follows the person stepping forward into a crowd lit by lime-green stage lights. Dark, moody, cinematic, shallow depth of field. Plain unmarked surfaces: no printed text, labels, logos, letters or numbers on the scanner, the phone or anywhere in the frame.

- **Lição para prompts de vídeo:** nunca pôr código de cor (hex) nem palavras que possam virar letreiro; descrever a cor em palavras e repetir "sem texto".

### 9. Modo escuro
- **Ref:** skiper26 (Theme toggle).
- **Onde:** `styles.css` (redefinir as variáveis em `[data-tema="escuro"]`) + botão na navbar.
- **Cuidado:** refazer as contas de contraste da rampa `tinta`/`papel` — o arquivo documenta por que cada tom passa no AA.

### 10. Micro-interações globais  ✅ feito (2026-10-15)
- `.btn` encolhe para 0.97 no `:active` (no celular o dedo cobre o botão e descer 1 px não se via) e a transição lista só as propriedades que mudam. Setor do evento e tipo de conta no cadastro têm o mesmo retorno de toque. Hover só com mouse já vinha do `hoverOnlyWhenSupported`.

### 11. Vídeos de divulgação  ✅ feito (2026-10-19)
- **O quê:** `gravacao/` grava o site de verdade e monta dois vídeos — o Reels
  no formato que o Lucas já posta (`exemplo-reels.mp4`: abertura gravada no
  celular com um comentário de "cliente", transição em fatias, site numa janela
  sobre a cor do projeto, tela final com o @) e o do LinkedIn (1920×1080, ~58 s,
  compra completa até o check-in, com legendas). Como rodar, pôr a abertura e
  mudar textos: `gravacao/README.md`.
- **Falta:** gravar a abertura do Reels no celular e salvar em
  `gravacao/entrada/abertura.mp4` (roteiro sugerido no README e na conversa de 2026-10-19).
- **Por que gravar quadro a quadro:** o `page.screencast()` do Puppeteer saía em
  405×720 e ~6 quadros únicos por segundo. O `palco.js` troca o relógio da página
  por um virtual que anda 1/30 s por quadro; GSAP, Three.js, CSS, View
  Transitions e o `<video>` obedecem, então o vídeo sai liso por mais que cada
  print demore (~200 ms).
- **Legenda fora do site (LinkedIn):** a primeira versão desenhava a legenda por
  cima da página e cobria o ingresso 3D. Agora o site vai para uma janela sobre o
  palco escuro e a legenda fica embaixo dela.
- **Comentário do Reels mais baixo:** no exemplo ele ficava a 150 px do topo e o
  @ do Reels cobria; agora fica a 290 px (`COMENTARIO.topo` em `instagram.mjs`).
- **Achados de carona (as gravações mostraram):**
  - O router não voltava a rolagem ao topo — clicar num evento do fim da lista
    abria o detalhe já rolado para baixo. Corrigido com
    `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })` no `app.config.ts`.
  - Os setores do evento vinham na ordem física da tabela, que muda a cada
    UPDATE: depois de reservar, o setor escolhido pulava de posição. Agora o
    `EventService` ordena por preço e nome (`EventSectorOrderTest`).
  - O check-in da portaria lia e depois gravava, sem trava: duas leituras
    simultâneas do mesmo QR passavam as duas. Agora é um `UPDATE ... WHERE
    checked_in_at IS NULL` (`ReservationRepository.marcarCheckIn`), com
    `CheckInConcurrencyTest` (10 leituras ao mesmo tempo, uma entra).
- **Cuidado:** não salvar arquivos do frontend durante uma gravação (o `npm start`
  recarrega a página e a tomada se perde).

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

**Telas logadas** (carteira, painel): não preencha o formulário de login a cada
execução — o limite de 10 logins em 5 min derruba os testes. Faça **um** login
pela API, guarde a resposta num `sessao.json` e injete antes do Angular subir:

```js
await page.evaluateOnNewDocument((s) => {
  localStorage.setItem('canhoto_token', s.token);
  localStorage.setItem('canhoto_user', JSON.stringify({ name: s.name, email: s.email, role: s.role }));
}, sessao);
```

**Peculiaridades do Chrome headless** (custaram tempo, não são bugs do app):

- `window.scrollTo` sozinho às vezes **não dispara evento de scroll** até o próximo
  quadro ser desenhado. Role em passos aguardando `requestAnimationFrame`, ou use
  `page.mouse.wheel`.
- Medir uma animação com um laço de `requestAnimationFrame` dentro do
  `page.evaluate` mostra "quadros travados" que não existem. Para saber se algo
  pesa de verdade, grave um trace (`page.tracing.start` com a categoria
  `devtools.timeline`) e some `Layout`, `Paint`, `EventDispatch`.
- A primeira chamada à API depois de reiniciar o backend demora segundos (JVM
  aquecendo + log de SQL em DEBUG). Use `waitForSelector` com folga, não `sleep` fixo.
- Print no meio de uma View Transition é loteria (a página velha fica congelada
  até a nova estar pronta). Para saber se a transição rodou, colete
  `document.getAnimations().map(a => a.effect?.pseudoElement)` durante a
  navegação e procure `::view-transition-group(capa-evento)`.
- Às vezes o print sai sem uma camada recém-pintada (a foto da janela apareceu
  vazia uma vez e certa na seguinte). Antes de "consertar", leia o estado do
  elemento (`style.opacity`, `mask-size`) para separar bug de atraso de pintura.
- **Auditoria de celular:** abra cada rota em 390×844 (`isMobile`, `hasTouch`,
  sessão injetada), tire `screenshot({ fullPage: true })` e compare
  `document.documentElement.scrollWidth` com 390 para pegar rolagem lateral.
  Print de página inteira **não rola a página**: o que depende de rolagem
  (`appRevelar`, `loading="lazy"`) aparece vazio ali sem ser bug.
- Toque: `page.setViewport({ ..., isMobile: true, hasTouch: true })` e
  `page.touchscreen.touchStart/touchMove/touchEnd` geram pointer events com
  `pointerType: 'touch'` — é assim que o arraste da carteira foi testado.

**Dados de teste:** a conta `cliente@demo.com` não tem reservas no seed. Para ver
a carteira cheia, reserve e pague pela API (`POST /reservations`, depois
`POST /payments` com header `Idempotency-Key`), e faça check-in num deles como
organizador (`POST /tickets/validate`) para ver o estado "Utilizado".

Antes de subir qualquer etapa: `npx ng build` em `frontend/` precisa passar sem
erro e sem estourar o orçamento.

---

## 8. Corrigido de carona: pagamento preso em "processando"

Ao criar dados de teste para a carteira, 2 de cada 3 pagamentos ficavam em
`PROCESSING` para sempre — a pessoa pagava e a reserva expirava. Causa: o
`PaymentService.checkout` publicava a mensagem no RabbitMQ **dentro** da
transação; o consumidor (outra conexão) às vezes procurava o pagamento antes do
commit, não achava e descartava a mensagem.

Agora a publicação acontece em `afterCommit` (`TransactionSynchronization`). O
teste `PaymentPublishAfterCommitTest` falha no código antigo e passa no novo;
a suíte inteira passa (35 testes). Depois da correção: 6 de 6 checkouts seguidos
aprovados.

- **Limite que sobrou:** se a aplicação cair entre o commit e o envio, a mensagem
  se perde. Fechar essa janela pede um outbox transacional (tabela de mensagens
  pendentes + job que publica). Não é urgente para um projeto de portfólio, mas é
  a próxima evolução natural.
- **Também corrigido:** a limpeza do `ReservationConcurrencyTest` apagava *toda*
  reserva pendente do banco, não só as do teste. Os testes rodam no mesmo Postgres
  do docker compose, então rodar a suíte apagava reservas de quem usava o app.
- **Ainda nos dados locais** (só no banco do computador de casa, não no repositório):
  duas reservas do `cliente@demo.com` criadas antes da correção têm pagamento preso
  em `PROCESSING` — já expiraram sozinhas e aparecem no histórico. Há também dois
  pagamentos de 2026-09-24 em `PROCESSING` com reserva `CONFIRMED`: sobras de testes
  com uma versão antiga do código. O webhook atual atualiza pagamento e reserva na
  mesma transação, então isso não se repete.
- **Limpo em 2026-10-15:** um "Evento Concorrência Test" que o teste deixou no
  banco local quando falhou (antes da correção da limpeza) aparecia na lista
  pública e na marquise. Foi apagado com o setor, as 5 reservas e os 5 usuários
  de teste dele. Se aparecer de novo em outro computador, é a mesma sobra.
