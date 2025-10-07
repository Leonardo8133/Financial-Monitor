# Financial Monitor

Uma aplicação React para acompanhar investimentos com armazenamento local (localStorage), exportação/importação em JSON e gráficos com Recharts.

> 📚 Consulte o [Guia do Usuário](docs/USER_GUIDE.md) para instruções detalhadas de uso, filtros, dashboards e dicas de operação.

### Principais recursos

- Dashboards interativos com seleção de período, filtros por fonte e ativação/ocultação de gráficos.
- Tabela inteligente reutilizável (`SmartDataTable`) com ordenação, filtros e paginação integrados.
- Cartões e resultados com tooltips explicando como cada métrica é calculada.
- Importação/exportação em JSON com template oficial e modal animado.

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

## Formato do arquivo JSON

As exportações agora utilizam uma estrutura única que guarda os lançamentos, os bancos cadastrados e um resumo agregado:

```json
{
  "version": 2,
  "created_at": "2025-01-01T00:00:00.000Z",
  "exported_at": "2025-01-31T12:00:00.000Z",
  "banks": [
    { "name": "Nubank Caixinhas", "color": "#8A05BE", "icon": "🟣" }
  ],
  "inputs": [
    {
      "summary": {
        "total_invested": 1000,
        "total_in_account": 0,
        "total_input": 1000,
        "total_yield_value": 0
      },
      "entries": [
        { "bank": "Nubank Caixinhas", "date": "2025-01-15", "inAccount": 0, "invested": 1000, "cashFlow": 1000 }
      ]
    }
  ]
}
```

- **banks**: lista de bancos com cor e ícone que alimenta os cadastros e sugestões.
- **inputs**: coleções de lançamentos; o app lê todos os itens desse array e recalcula rendimentos automaticamente.

O botão **Template** baixa um arquivo com essa estrutura para facilitar a criação de planilhas próprias.

## Publicando no GitHub Pages

Este repositório já contém um workflow de CI/CD (`.github/workflows/deploy.yml`) que executa testes, gera o build de produção e publica automaticamente no GitHub Pages sempre que há push na branch `master`.

1. Configure o Pages em **Settings > Pages** para usar a opção **GitHub Actions**.
2. Realize um push para a branch `master` com suas alterações.
3. O workflow irá gerar e publicar o site em `https://<seu-usuario>.github.io/financial-monitor/` (ou no domínio customizado configurado no Pages).

Caso prefira realizar o processo manualmente, rode `npm run build` e publique o conteúdo de `dist/` no branch escolhido.

> **Dica:** o `vite.config.js` está configurado com `base: "./"`, o que permite hospedar o build em subdiretórios, como acontece no GitHub Pages (`https://usuario.github.io/repositorio/`).
