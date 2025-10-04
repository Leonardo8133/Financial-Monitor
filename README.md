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

## Testes

Testes unitários e de componentes são executados com [Vitest](https://vitest.dev/) e [Testing Library](https://testing-library.com/).

```bash
npm run test
```

## Build para produção

```bash
npm run build
```

Os arquivos prontos ficam disponíveis em `dist/`.

## Publicando no GitHub Pages

Este repositório já contém um workflow de CI/CD (`.github/workflows/deploy.yml`) que executa testes, gera o build de produção e publica automaticamente no GitHub Pages sempre que há push na branch `main`.

1. Configure o Pages em **Settings > Pages** para usar a opção **GitHub Actions**.
2. Realize um push para a branch `main` com suas alterações.
3. O workflow irá gerar e publicar o site em `https://<seu-usuario>.github.io/financial-monitor/` (ou no domínio customizado configurado no Pages).

Caso prefira realizar o processo manualmente, rode `npm run build` e publique o conteúdo de `dist/` no branch escolhido.

> **Dica:** o `vite.config.js` está configurado com `base: "./"`, o que permite hospedar o build em subdiretórios, como acontece no GitHub Pages (`https://usuario.github.io/repositorio/`).
