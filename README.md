# Monitor Financeiro

Aplicação React (Vite + Tailwind) para acompanhar **investimentos** e **gastos** com armazenamento 100% local (localStorage), importação de extratos/faturas, relatórios em PDF e temas claro/escuro.

## Rodando

```bash
npm install
npm run dev
```

O Vite sobe em `http://localhost:5173/Financial-Monitor/` (o `base` é fixo para o GitHub Pages).

```bash
npm test          # testes unitários (Vitest)
npm run build     # build de produção em dist/
npm run test:e2e  # Playwright (precisa do dev server rodando)
```

## Principais telas

| Rota | O que faz |
| --- | --- |
| `/` | Resumo rápido: patrimônio atual, rendimento, despesas/receitas do mês, meta mensal. |
| `/investimentos` (`/historico`, `/entrada`, `/projecoes`) | Saldo por banco e data; rendimento calculado automaticamente; gráficos por banco ou fonte; projeções. |
| `/gastos` (`/historico`, `/entrada`, `/financiamentos`) | Transações com múltiplas categorias/fontes, importação CSV/XLSX/PDF, mapeamentos automáticos, simulador Price/SAC. |
| `/investimentos/relatorio`, `/gastos/relatorio` | Relatório em tela, impressão e PDF. |
| `/configuracoes` | Perfil, preferências, tema/cor/modo de digitação, bibliotecas (bancos, fontes, categorias), mapeamentos, backup. |

## Como os dados funcionam

- **Investimentos**: cada lançamento é uma foto do saldo de um banco em uma data (`invested`, `inAccount`) mais o aporte/retirada desde o último saldo (`cashFlow`). Rendimento = total atual − (total anterior + aporte).
- **Patrimônio atual** = soma do último saldo de cada banco. No dashboard dá para escolher entre "Último saldo" (bancos sem lançamento no mês mantêm o valor) e "Só o mês".
- **Gastos**: valor negativo = despesa, positivo = receita. Categorias e fontes são listas. Ao categorizar uma descrição, um mapeamento (descrição → categorias) é aprendido e reaplicado em importações futuras.
- Tudo fica em `localStorage` na chave `financial-monitor-unified-v1`. Preferências de interface (tema, cor, modo de digitação) ficam em `fm-ui-prefs` e sobrevivem a resets/importações.

## Backup, importação e exportação

- **Exportar** gera `financial-monitor_<data>.json` com `{ version: 3, type: "unified", data: {...} }`.
- **Importar** aceita esse backup, o store unificado puro, e os formatos antigos (`{ inputs: [{ entries }] }`, `{ inputs: [{ expenses }] }`, arrays). Antes de aplicar mostra um resumo e permite **Mesclar** (só o que é novo) ou **Substituir**.
- CSV: exportação das tabelas filtradas em Histórico e em Configurações → Dados.

## Estrutura

```
src/
  store/unifiedStore.js      # fonte única de verdade (useSyncExternalStore) + persistência
  utils/unifiedStorage.js    # normalização/migração do store
  utils/importExport.js      # detecção de formato, mesclagem, CSV
  utils/investmentAnalytics.js
  utils/money.js             # parse/format de dinheiro
  theme/                     # preferências de UI e temas (CSS variables em index.css)
  components/                # AppShell, Select, CurrencyInput, KPICard, Modal, ImportModal...
  investments/, expenses/    # apps e componentes de cada área
  pages/                     # SettingsPage, ReportPage
```

## Publicação no GitHub Pages

O workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica no Pages a cada push em `master`.
