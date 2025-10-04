# Financial Monitor

Uma aplicação React para acompanhar investimentos com armazenamento local (localStorage), exportação/importação em JSON e gráficos com Recharts.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- npm (instalado junto com o Node.js)

## Desenvolvimento local

```bash
npm install
npm run dev
```

O comando `npm run dev` inicia o Vite na porta padrão (geralmente `http://localhost:5173`).

## Build para produção

```bash
npm run build
```

Os arquivos prontos ficam disponíveis em `dist/`.

## Publicando no GitHub Pages

1. Gere o build de produção (`npm run build`).
2. Faça o deploy do conteúdo da pasta `dist/` para o branch `gh-pages` do repositório.
   - Você pode utilizar o [vite-plugin-gh-pages](https://github.com/stafyniaksacha/vite-plugin-gh-pages) ou o [gh-pages](https://github.com/tschaub/gh-pages) CLI, ou configurar uma GitHub Action que faça o deploy automático após o build.
3. No repositório GitHub, habilite o GitHub Pages apontando para o branch `gh-pages` (ou `docs/`, conforme sua preferência).

> **Dica:** o `vite.config.js` está configurado com `base: "./"`, o que permite hospedar o build em subdiretórios, como acontece no GitHub Pages (`https://usuario.github.io/repositorio/`).
