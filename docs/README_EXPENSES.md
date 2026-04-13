# Controle de Gastos – Guia Rápido

Este é um aplicativo SPA (no mesmo repositório) para acompanhar gastos mensais, importar arquivos e gerar gráficos. Ele convive com o app existente de Investimentos.

## Como acessar
- Na aplicação de Investimentos, clique em "Ir para Gastos" no topo. Ou acesse a rota `/gastos`.
- No app de Gastos, use o link "Ir para Investimentos" no topo, ou acesse `/investimentos`.

## Funcionalidades
- Upload de arquivos CSV, XLSX/XLSM e PDF, com mapeamento de colunas para: Data, Descrição, Categoria, Fonte e Valor.
- Criação e edição de despesas manualmente.
- Bibliotecas de Categorias e Fontes com valores padrão; você pode adicionar novas facilmente.
- Dashboard com:
  - Total por mês (gráfico de barras)
  - Distribuição por categoria (gráfico de pizza) do mês mais recente
  - Total acumulado
- Histórico com agrupamento por mês, edição inline e exclusão.
- Exportar JSON (inclui categorias/fontes) e importar JSON do próprio app.
- Persistência local (localStorage), sem backend.

## Dicas de uso
1. Para importar planilhas: na aba "Nova Despesa", use o bloco "Importar CSV/XLSX/PDF". Selecione o arquivo e mapeie as colunas para os campos do sistema, depois clique em "Aplicar mapeamento". As linhas entram como rascunho.
2. Crie novas categorias/fontes no painel "Categorias" e "Fontes" na mesma aba – elas ficam salvas junto com seus dados e são exportadas no JSON.
3. Use "Exportar" para salvar um arquivo `.json` local com tudo; depois importe para continuar.

## Estrutura de dados (JSON)
```json
{
  "version": 1,
  "created_at": "2025-01-01T00:00:00.000Z",
  "exported_at": "2025-01-10T12:34:56.000Z",
  "categories": [{ "name": "Alimentação", "color": "#10B981", "icon": "🍔" }],
  "sources": [{ "name": "Pessoal", "color": "#0EA5E9", "icon": "👤" }],
  "inputs": [
    {
      "summary": { "total_spent": 1234.56 },
      "expenses": [
        { "date": "2025-01-02", "description": "Mercado", "category": "Alimentação", "source": "Pessoal", "value": -123.45 }
      ]
    }
  ]
}
```

## Observações sobre PDFs
- A extração de PDF é básica: o texto é lido por linhas e você pode mapear a coluna "Linha" para os campos desejados. Para PDFs mais complexos, considere exportar para CSV/XLSX antes.

## Problemas conhecidos
- Se o PDF for escaneado (imagem), não há OCR embutido. Converta para texto planilhável primeiro.
- Valores devem conter sinal negativo para despesas; o app contabiliza o módulo em gráficos de gastos.
