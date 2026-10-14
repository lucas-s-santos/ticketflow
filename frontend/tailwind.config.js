/** @type {import('tailwindcss').Config} */

// Sistema de design do Canhoto.
// As cores vivem como custom properties em styles.css (canais RGB, sem o rgb()),
// e aqui viram utilitarios do Tailwind. Isso permite trocar o tema inteiro
// redefinindo as variaveis, sem tocar em nenhuma classe dos componentes.
const cor = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Papel: fundos e superficies. Do mais claro (cartao) ao mais escuro (regua).
        papel: {
          50: cor('papel-50'),
          100: cor('papel-100'),
          200: cor('papel-200'),
          300: cor('papel-300'),
          400: cor('papel-400'),
        },
        // Tinta: textos e elementos escuros. Preto quente, nunca #000.
        tinta: {
          400: cor('tinta-400'),
          500: cor('tinta-500'),
          600: cor('tinta-600'),
          700: cor('tinta-700'),
          800: cor('tinta-800'),
          900: cor('tinta-900'),
        },
        // Acento: o verde da logo (#B9F706). Nome semantico, nao literal —
        // se a marca mudar de cor um dia, as classes dos componentes nao mudam.
        // 500/600 sao PREENCHIMENTO (texto preto por cima);
        // 'texto' e 'escuro' sao as versoes que podem virar letra sobre creme.
        acento: {
          100: cor('acento-100'),
          200: cor('acento-200'),
          400: cor('acento-400'),
          500: cor('acento-500'),
          600: cor('acento-600'),
          texto: cor('acento-texto'),
          escuro: cor('acento-escuro'),
        },
        // Erro: vermelho de verdade, separado da marca.
        erro: {
          100: cor('erro-100'),
          500: cor('erro-500'),
          600: cor('erro-600'),
        },
        // Ocre: aguardando, pendente, expira em breve.
        ocre: {
          100: cor('ocre-100'),
          500: cor('ocre-500'),
          600: cor('ocre-600'),
        },
      },

      fontFamily: {
        // Fraunces: serifada com personalidade, para titulos. E o oposto do
        // "tudo em Inter" que denuncia interface gerada automaticamente.
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        // Archivo: grotesca neutra para o corpo e a interface.
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Space Mono: codigos de ingresso, precos e numeros tabulares.
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        // Escala editorial: os titulos crescem bem mais do que o padrao do Tailwind.
        'titulo-xl': ['clamp(2.75rem, 7vw, 5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'titulo-lg': ['clamp(2rem, 4.5vw, 3.25rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'titulo-md': ['clamp(1.5rem, 3vw, 2.125rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'titulo-sm': ['1.3125rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        // Etiqueta: texto pequeno em caixa alta, muito espacado. Usado em rotulos.
        etiqueta: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },

      borderRadius: {
        // Raios contidos: papel dobra, nao derrete. Nada de rounded-xl em tudo.
        bilhete: '10px',
      },

      boxShadow: {
        // Sombra de papel sobre papel: baixa, quente e curta.
        papel: '0 1px 2px rgb(var(--tinta-900) / 0.05), 0 8px 24px -12px rgb(var(--tinta-900) / 0.18)',
        'papel-alta': '0 2px 4px rgb(var(--tinta-900) / 0.06), 0 18px 40px -16px rgb(var(--tinta-900) / 0.26)',
      },

      // A perfuracao vive em styles.css, em CSS puro: imagem e tamanho de fundo
      // dividem o prefixo bg-* e registrar ambos aqui geraria classes colidentes.

      keyframes: {
        'entrar-baixo': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Entrada do hero: a imagem comeca ampliada e assenta no tamanho certo.
        // Do 1.0 para cima ela terminaria ampliada, e o deslocamento do scroll
        // revelaria a borda; partindo de 1.15 ela so encolhe ate caber.
        'assentar': {
          '0%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        // Marquise: a trilha anda exatamente metade da propria largura, que e
        // onde a segunda copia da lista assume a posicao da primeira. Qualquer
        // outro valor faria a emenda aparecer a cada volta.
        'deslizar': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },

      animation: {
        'entrar-baixo': 'entrar-baixo 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'assentar': 'assentar 2.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        // A duracao real vem do componente, conforme a quantidade de itens.
        'deslizar': 'deslizar 40s linear infinite',
      },
    },
  },
  plugins: [],
};
