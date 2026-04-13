# Configurações Padrão - Financial Monitor

Este arquivo `configuracoes-padrao.json` é o **modelo inicial** usado pelo Financial Monitor quando um usuário acessa o sistema pela primeira vez.

## 📋 Estrutura do Arquivo

### 🏦 **Investimentos**
- **personalInfo**: Informações pessoais para relatórios
- **settings**: Configurações gerais do módulo
- **banks**: Lista de bancos/corretoras com ícones e cores
- **sources**: Fontes de renda para investimentos

### 💰 **Gastos**
- **personalInfo**: Informações pessoais para relatórios
- **settings**: Configurações gerais do módulo
- **categories**: Categorias de gastos com ícones e cores
- **sources**: Fontes de gastos (pessoal, empresa, família)
- **descriptionCategoryMappings**: Mapeamentos automáticos por descrição (33 mapeamentos padrão incluídos)
- **ignoredDescriptions**: Descrições para ignorar na importação CSV (7 padrões incluídos)

## 🎨 **Personalização de Cores e Ícones**

### Cores
- Use códigos hexadecimais: `#FF0000` (vermelho), `#00FF00` (verde)
- Cores sugeridas: `#1F2937` (cinza escuro), `#10B981` (verde), `#EF4444` (vermelho)

### Ícones
- Use emojis: `🏠` (casa), `🍔` (comida), `🚌` (transporte)
- Ou símbolos: `⚫`, `🟡`, `🔵`

## 📝 **Como Usar**

### **Para Usuários Novos:**
1. **Edite o arquivo** `configuracoes-padrao.json` conforme suas preferências
2. **Personalize** bancos, categorias, cores e ícones
3. **Adicione/remova** itens conforme necessário
4. **Salve o arquivo** com as alterações
5. **Acesse o sistema** - as configurações serão aplicadas automaticamente

### **Para Usuários Existentes:**
- As configurações já estão salvas no navegador
- Para usar novas configurações, limpe o localStorage do navegador

## 🔧 **Exemplos de Personalização**

### Adicionar Novo Banco:
```json
{
  "name": "Meu Banco Personalizado",
  "color": "#FF6B6B",
  "icon": "🏦"
}
```

### Adicionar Nova Categoria de Gasto:
```json
{
  "name": "Viagens",
  "color": "#4ECDC4",
  "icon": "✈️"
}
```

### Configurar Mapeamento Automático:
```json
{
  "keyword": "uber",
  "categories": ["Transporte"],
  "exactMatch": false
}
```

### Mapeamentos Padrão Incluídos:
- **Transporte**: uber, 99, gasolina, posto, estacionamento
- **Alimentação**: ifood, rappi, supermercado, mercado, padaria, restaurante
- **Saúde**: farmacia, drogaria, hospital, clinica, academia
- **Moradia**: aluguel, condominio, energia, agua, gas, internet
- **Assinaturas**: netflix, spotify, youtube, prime, disney
- **Lazer**: cinema, bar, academia, restaurante
- **Educação**: escola, curso, universidade, livro

### Descrições Ignoradas Padrão:
- Pagamento recebido, Transferência enviada/recebida
- PIX enviado/recebido, Estorno, Reembolso

## ⚠️ **Importante**

- **Backup**: Sempre faça backup do arquivo antes de editar
- **Sintaxe**: Mantenha a sintaxe JSON válida (aspas, vírgulas, chaves)
- **Encoding**: Salve o arquivo em UTF-8 para suporte a emojis
- **Localização**: O arquivo deve estar na raiz do projeto (`/configuracoes-padrao.json`)
- **Usuários Novos**: Configurações são aplicadas automaticamente no primeiro acesso

## 📚 **Campos Obrigatórios**

### Para Bancos/Fontes/Categorias:
- `name`: Nome do item (obrigatório)
- `color`: Cor em hexadecimal (opcional, padrão gerado automaticamente)
- `icon`: Ícone emoji (opcional, padrão: 🏦 para bancos, 🏷️ para categorias)

### Para Mapeamentos:
- `keyword`: Palavra-chave para busca (obrigatório)
- `categories`: Array de categorias (obrigatório)
- `exactMatch`: Busca exata ou parcial (opcional, padrão: false)

---

**💡 Dica**: Use um editor com suporte a JSON (VS Code, Sublime Text) para melhor experiência de edição com validação automática.
