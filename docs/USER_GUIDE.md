# Guia do Usuário e Operação

Este guia explica como instalar, utilizar e manter o Financial Monitor após as melhorias recentes. Ele complementa o arquivo [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md), que descreve os componentes internos do projeto.

## Sumário

1. [Visão geral](#visão-geral)
2. [Instalação e execução](#instalação-e-execução)
3. [Importação, exportação e modelos](#importação-exportação-e-modelos)
4. [Dashboards interativos](#dashboards-interativos)
5. [Biblioteca de tabelas inteligentes](#biblioteca-de-tabelas-inteligentes)
6. [Cartões explicativos e tooltips](#cartões-explicativos-e-tooltips)
7. [Animações e usabilidade](#animações-e-usabilidade)
8. [Ajustes e personalizações](#ajustes-e-personalizações)
9. [Testes e qualidade](#testes-e-qualidade)

## Visão geral

O Financial Monitor é uma aplicação React (Vite) que ajuda a acompanhar investimentos, projeções e gastos. Os dados permanecem no navegador (LocalStorage) e podem ser importados/exportados em JSON. A versão atual introduz:

- **Dashboards interativos** com filtros de período, seleção de fontes e ativação/ocultação de gráficos.
- **Tabela inteligente** reutilizável (`SmartDataTable`) com ordenação, filtros por coluna, paginação e busca global.
- **Cartões e resultados com tooltips explicativos**, exibindo metodologia de cálculo e dicas práticas.
- **Animações contextuais** para reforçar feedback visual em filtros, abas, formulários e diálogos.
- Nova documentação de uso e operação.

## Instalação e execução

1. Garanta o Node.js LTS instalado.
2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o modo desenvolvimento:

   ```bash
   npm run dev
   ```

4. Execute a suíte de testes unitários quando necessário:

   ```bash
   npm run test:unit
   ```

5. Para testes de ponta a ponta (Playwright):

   ```bash
   npm run test:e2e
   ```

## Importação, exportação e modelos

- **Exportar dados:** botão "Exportar" na página principal gera um JSON com entradas, configurações e bancos/fontes cadastrados.
- **Importar dados:** botão "Importar" abre um modal com animação `scale-pop`; selecione o arquivo `.json` exportado previamente.
- **Template oficial:** disponível dentro do modal pelo botão "Baixar template". Utilize-o para preparar dados em planilhas ou scripts antes da importação.

## Dashboards interativos

A aba **Dashboard** passou a contar com controles avançados:

- **Período:** selecione janelas de 3, 6, 12, 24 meses ou todo o histórico. Os gráficos reagirão imediatamente.
- **Exibição de gráficos:** habilite ou oculte visualizações (Fluxo, Rendimento, Investimentos, Distribuição) por botão.
- **Filtro por fontes:** selecione rapidamente quais instituições/fundos compõem os gráficos. É possível limpar ou selecionar todas.
- As atualizações são suavizadas com transições e mantêm cores consistentes usando `resolveSourceVisual`.

## Biblioteca de tabelas inteligentes

O componente `SmartDataTable` (`src/components/SmartDataTable.jsx`) encapsula funcionalidades de tabela comuns:

- Busca global opcional, filtros individuais por coluna e ordenação multiestado (asc, desc, neutro).
- Paginação configurável com seleção de tamanho de página.
- Cabeçalhos exibem ícones personalizados (`FunnelIcon`, `ChevronUpDownIcon`) e um painel animado (`Transition`) para filtros.
- A tabela é reutilizada no histórico de investimentos (modo detalhado e resumo diário) e pode ser aplicada a outras áreas.

### Histórico com tabela inteligente

- Barra superior filtra por texto e controla se exibimos lançamentos detalhados ou a consolidação diária.
- Em modo detalhado, a tabela aceita edição inline, remoção e fornece tooltips explicativos para totais mensais.
- Em modo resumo, a agregação por data mostra totais de investido, em conta, fluxo e rendimento.

## Cartões explicativos e tooltips

- O componente `InfoTooltip` centraliza tooltips ricos com título, "Por que importa", "Como calculamos" e lista de detalhes.
- `KPICard` recebeu a propriedade `explanation`, exibindo dados como variação mensal, médias de 6 meses e soma anual.
- Resultados das projeções (`Projecoes.jsx`) utilizam os tooltips para detalhar fórmulas e parâmetros.

## Animações e usabilidade

- `animate-slide-fade-in` e `animate-scale-pop` adicionam micro animações a formulários e modais.
- As abas (`Tabs.jsx`) agora possuem destaque com transição suave.
- Tabelas e filtros usam `@headlessui/react` para animar painéis e preservar acessibilidade (Escape fecha filtros, foco é mantido).
- O modal de importação recebe animação quando aberto e o histórico diário usa transições ao alternar modos.

## Ajustes e personalizações

- **Temas/cores:** o projeto utiliza Tailwind CSS. Para ajustes globais, edite `tailwind.config.js` ou `index.css`.
- **Novas fontes/bancos:** mantenha as configurações em `src/config/banks.js` e `src/config/sources.js` para que os gráficos preservem cores e ícones.
- **Reuso do SmartDataTable:** basta importar o componente, informar colunas (com `accessor`, `cell`, `filterFn`) e dados. A busca global pode ser desativada com `enableGlobalFilter={false}`.

## Testes e qualidade

- **Unit tests:** utilize `npm run test:unit` (Vitest) para checar componentes e utilitários.
- **End-to-end:** `npm run test:e2e` (Playwright) verifica fluxos críticos de cadastro/importação.
- **Acessibilidade:** tooltips possuem atributos ARIA (`role="tooltip"`), botões indicam `aria-pressed` e campos editáveis mantêm foco correto.
- **Boas práticas:** evite manipular diretamente o LocalStorage fora dos hooks (`useLocalStorageState`), mantenha cálculos derivados em `useMemo` e não envolva imports em `try/catch` conforme convenção do projeto.

Para dúvidas adicionais, consulte os comentários nos componentes atualizados ou o arquivo de arquitetura.
