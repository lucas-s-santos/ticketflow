# Gravação dos vídeos de divulgação

Scripts que gravam o Canhoto rodando de verdade e montam os vídeos para postar:

| Comando | Sai em `saida/` | Formato |
|---|---|---|
| `npm run instagram` | `canhoto-instagram.mp4` + `-capa.jpg` + `previa-comentario.jpg` | Reels 1080×1920 no formato do Lucas (abertura no celular + site numa janela) |
| `npm run linkedin` | `canhoto-linkedin.mp4` + `-capa.jpg` | 1920×1080, ~58 s, compra completa com legendas |
| `npm run celular` | `celular-carteira.png`, `celular-home.png` | telas do app para mostrar no celular durante a abertura |

O site é gravado pelo próprio script (rolagens, cliques, arrastes), e gravar de
novo dá o mesmo vídeo. A única parte feita à mão é a abertura do Reels.

## Pré-requisitos

- Backend, frontend e Docker no ar (ver o `CLAUDE.md` da raiz). Grave contra o
  `npm start`, com o mesmo banco de demonstração da V7.
- Google Chrome instalado em `C:/Program Files/Google/Chrome/Application/chrome.exe`
  (outro caminho: variável `CHROME`).
- `ffmpeg` e `ffprobe` no PATH (outro caminho: `FFMPEG` / `FFPROBE`).
- Internet: as artes usam fontes do Google Fonts.

```bash
cd gravacao
npm install
npm run dados       # uma vez: cria a Marina (marina@demo.com / demo123) com 4 ingressos
npm run instagram
npm run linkedin
```

**Não mexa no frontend durante uma gravação.** O `npm start` recarrega a página
a cada arquivo salvo, e a gravação em andamento se perde.

## Reels do Instagram

Segue o formato de `exemplo-reels.mp4` (na raiz do projeto):

1. **Abertura** gravada no celular: você pensando, um comentário de cliente
   aparece na tela, você olha para cima e lê.
2. **Transição em fatias** para o palco: fundo na cor do projeto, `LUCAS SILVA /
   DESENVOLVEDOR WEB`, o site rodando numa janela de navegador e as tecnologias embaixo.
3. **Tela final** preta com o @.

A abertura sai dos vídeos do celular: `CORTES`, no topo de `instagram.mjs`,
lista os trechos (arquivo, de, até — em segundos do original) e o script junta
tudo, em pé e sem som, em `saida/abertura.mp4`. Os vídeos de 2026-10-19
(`IMG_0304.MOV` e `IMG_0305.MOV`) ficam na raiz do projeto, fora do git. Um
vídeo já editado também serve: `gravacao/entrada/abertura.mp4` ou
`--abertura caminho.mp4`.

Depois de mudar um corte ou um texto, `npm run instagram -- --montar` (não grava
o site de novo, ~2 min) e confira `saida/previa-comentario.jpg` — o comentário
sobre a abertura, com as faixas que a interface do Reels cobre em vermelho.
No topo de `instagram.mjs`:

- `COMENTARIO.aparece` — o segundo da abertura em que o comentário entra (logo antes de você olhar para cima);
- `COMENTARIO.topo` — a altura dele (290 px; o exemplo usava 150 e ficava sob o @);
- `COMENTARIO.texto` / `usuario` — o que o "cliente" pede (cabe em duas linhas até ~100 caracteres).

Cor do fundo, nome, cargo, @ e ícones das tecnologias ficam em `MARCA` e
`ICONES`. Os ícones vêm do [Simple Icons](https://simpleicons.org) (CC0), em `lib/icones/`.

## LinkedIn: mudar um texto

As legendas e a cartela final ficam no topo de `linkedin.mjs` (`LEGENDAS` e
`CARTELA`). Depois de mudar, só remonte: `npm run linkedin -- --montar`.

## Como funciona

1. **`lib/palco.js`** é injetado na página antes de qualquer script dela e troca
   o relógio (`performance.now`, `Date.now`, `requestAnimationFrame`, timers) por
   um relógio virtual. Ele só anda quando o gravador manda, 1/30 s por quadro —
   GSAP, Three.js, animações de CSS, View Transitions e o `<video>` da home ficam
   todos no mesmo tempo. Por isso o vídeo sai liso mesmo que cada print demore
   200 ms. Também desenha o ponteiro do mouse (o headless não tem cursor), o
   círculo dos toques e o escurecimento das trocas de página.
2. **`lib/gravador.mjs`** dirige o Chrome (Puppeteer): abre rotas, rola, clica,
   arrasta, cola texto, e tira um JPEG por quadro em `saida/quadros-*`. No fim
   junta tudo em `saida/*-site.mp4`.
3. **`lib/reels.mjs`** (Instagram) e **`lib/montagem.mjs`** (LinkedIn) montam o
   vídeo final. As artes (fundo, janela, legendas, comentário, telas finais) são
   HTML fotografado pelo Chrome; o ffmpeg só compõe.

## Efeitos colaterais

- `npm run linkedin` compra um ingresso da *Mostra de Teatro Contemporâneo* para
  a Marina e faz o check-in dele na portaria. Cada gravação gasta uma vaga e
  deixa mais um ingresso "Utilizado" na carteira dela.
- Antes de gravar, os scripts cancelam reservas da Marina que tenham ficado
  esperando pagamento (de uma gravação interrompida).
- O login é feito uma vez por gravação, direto na API (o app limita a 10
  tentativas a cada 5 minutos).

## Postar

- **Instagram:** suba `canhoto-instagram.mp4` como Reels e escolha a capa
  `canhoto-instagram-capa.jpg`. Se a abertura tiver som, ele vai junto; o resto
  é mudo — ponha a música no próprio app.
- **LinkedIn:** suba `canhoto-linkedin.mp4` direto no post (vídeo nativo alcança
  mais que link). As legendas já estão no vídeo, que a maioria assiste sem som.
  O LinkedIn não tem biblioteca de músicas: para pôr uma, baixe uma faixa livre
  (Pixabay Music ou a Biblioteca de áudio do YouTube) e rode
  `node musica.mjs saida/canhoto-linkedin.mp4 caminho/da/musica.mp3` — sai
  `canhoto-linkedin-com-musica.mp4` em segundos, sem recodificar o vídeo.
- Textos sugeridos para os dois posts: `textos-dos-posts.md`.
