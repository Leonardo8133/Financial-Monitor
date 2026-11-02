# Financial Monitor — plano e histórico

## Feito (out/2026)
- [x] Store unificado em memória (`src/store/unifiedStore.js`) compartilhado por todas as telas; persistência única.
- [x] Correção dos botões Exportar/Importar (import de `UNIFIED_LS_KEY` faltando) e da página de configurações de gastos (`ensureExpensesDefaults` inexistente).
- [x] Importação com pré-visualização e modos mesclar/substituir; aceita backup v3, store puro e formatos antigos.
- [x] Tema claro/escuro/automático + cor de destaque; tokens CSS em `index.css`.
- [x] Campo de dinheiro com dois modos (livre / centavos) e parser robusto (`utils/money.js`).
- [x] Formulários com autopreenchimento: último saldo por banco, memória de descrições (categoria/fonte/valor), duplicados.
- [x] Dashboards reformulados (por banco/fonte, último saldo vs. só o mês, meta mensal, top gastos).
- [x] Relatórios em tela + PDF por download (sem pop-ups).
- [x] Configurações unificadas e compactas (`/configuracoes`).
- [x] Testes unitários atualizados e novos (money, importExport, investmentAnalytics).

## Pendente
- [ ] Revisar a suíte Playwright (`tests/e2e`) para os novos componentes (react-select, novos textos).
- [ ] Rodar um smoke E2E no CI antes do deploy.
- [x] Grafo do graphify reconstruído (use `.venv/bin/python`; pacote `graphifyy`).
