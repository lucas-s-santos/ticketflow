# Textos dos posts

Rascunhos para acompanhar os vídeos. Ajuste o tom à sua voz antes de postar.

---

## Instagram (Reels) — `canhoto-instagram.mp4`

> Me pediram um ingresso 3D que parecesse de verdade. Entreguei o sistema inteiro 🎟️
>
> O ingresso gira, desce a página com a rolagem e rasga no fim. E por trás dele:
> a vaga trava no seu nome no instante do clique e fica guardada por 15 minutos
> enquanto você paga. O QR de cada ingresso é assinado: mudou um caractere, não
> entra. E na portaria cada canhoto vale uma vez só.
>
> Java + Spring Boot, Angular, Three.js e GSAP.
>
> Código aberto no GitHub, link na bio.
>
> #programacao #desenvolvimentoweb #java #springboot #angular #threejs #gsap #fullstack #devbrasil

Dicas: escolha `canhoto-instagram-capa.jpg` como capa e ponha a música no próprio app.

---

## LinkedIn — `canhoto-linkedin.mp4`

> Construí o Canhoto, uma plataforma de venda de ingressos de ponta a ponta — do
> clique na vaga até a leitura do QR na portaria.
>
> O vídeo mostra uma compra de verdade no sistema rodando. Algumas decisões por trás dela:
>
> 🔒 Sem sobrevenda. A reserva trava o setor com lock pessimista no PostgreSQL, e a
> vaga fica no nome de quem clicou por 15 minutos. Um teste de concorrência solta
> 20 reservas ao mesmo tempo contra um setor de 5 vagas e confere que passam
> exatamente 5.
>
> 📨 Pagamento assíncrono. O checkout publica na fila do RabbitMQ (só depois do
> commit da transação), um gateway simulado processa e responde por webhook
> assinado com HMAC, com retentativa e fila de mensagens mortas. A chave de
> idempotência impede cobrar duas vezes o mesmo clique.
>
> 🎟️ Ingresso que não se falsifica. O QR é assinado com HMAC e recalculado a cada
> leitura em vez de ficar guardado num banco. Trocou um caractere, a assinatura não
> confere. E o mesmo canhoto lido duas vezes na portaria é recusado na segunda.
>
> ✨ Front em Angular 18 com Signals e componentes standalone, Tailwind, GSAP e
> Three.js — o ingresso 3D da home é desenhado em código e desce a página junto com
> a rolagem.
>
> Também tem painel do organizador, CI/CD e deploy configurado para Render, Vercel e Neon.
>
> Detalhe nerd: o vídeo não foi gravado com gravador de tela. Um script com
> Puppeteer dirige o próprio site e congela o relógio da página para tirar um
> quadro a cada 1/30 s — por isso as animações saem lisas.
>
> Código no GitHub: https://github.com/lucas-s-santos/ticketflow
>
> #Java #SpringBoot #Angular #RabbitMQ #PostgreSQL #ThreeJS #DesenvolvimentoDeSoftware #FullStack
