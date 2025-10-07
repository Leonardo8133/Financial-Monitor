import { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { fmtBRL } from "../../utils/formatters.js";

export function ExpensesDashboard({ monthly, totals, categories = [], sources = [] }) {
  // Inicializar com todas as categorias selecionadas exceto investimentos
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const allCategories = categories.map(cat => cat.name || cat).filter(Boolean);
    return allCategories.filter(cat => 
      !cat.toLowerCase().includes('investimento') && 
      !cat.toLowerCase().includes('investment')
    );
  });
  const [monthsToShow, setMonthsToShow] = useState(6); // Últimos 6 meses por padrão
  const [groupBy, setGroupBy] = useState("category"); // "category" ou "source"
  const [showTotalFor, setShowTotalFor] = useState(new Set()); // Categorias mostrando total ao invés de média
  
  // Filtrar itens por categoria
  const filterItemsByCategory = (items) => {
    if (selectedCategories.length === 0) return items;
    return items.filter(item => {
      const itemCategories = Array.isArray(item.categories) ? item.categories : [];
      return selectedCategories.some(cat => itemCategories.includes(cat));
    });
  };
  
  // Dados filtrados e limitados por período
  const filteredMonthly = useMemo(() => {
    return monthly
      .slice(-monthsToShow) // Últimos N meses
      .map(m => ({
        ...m,
        items: filterItemsByCategory(m.items || [])
      }));
  }, [monthly, monthsToShow, selectedCategories]);
  
  const monthlyChart = filteredMonthly.map((m) => {
    const expenses = m.items?.filter(item => (item.value || 0) < 0).reduce((acc, item) => acc + Math.abs(item.value || 0), 0) || 0;
    const income = m.items?.filter(item => (item.value || 0) > 0).reduce((acc, item) => acc + (item.value || 0), 0) || 0;
    return {
      month: m.label, 
      Despesas: expenses, 
      Receitas: income
    };
  });
  
  // Agregar despesas por categoria ou fonte de todos os meses filtrados
  const groupedData = useMemo(() => {
    const totals = {};
    
    filteredMonthly.forEach(month => {
      // Pegar apenas despesas (valores negativos)
      const expenses = month.items?.filter(item => (item.value || 0) < 0) || [];
      
      expenses.forEach(item => {
        const absValue = Math.abs(item.value || 0);
        
        if (groupBy === "category") {
          const itemCategories = Array.isArray(item.categories) ? item.categories : [];
          
          // Se não tem categoria, adicionar como "Sem categoria"
          if (itemCategories.length === 0) {
            totals["Sem categoria"] = (totals["Sem categoria"] || 0) + absValue;
          } else {
            // Dividir o valor entre as categorias (se houver múltiplas)
            const valuePerItem = absValue / itemCategories.length;
            itemCategories.forEach(cat => {
              totals[cat] = (totals[cat] || 0) + valuePerItem;
            });
          }
        } else {
          // Agrupar por fonte
          const itemSources = Array.isArray(item.sources) ? item.sources : [];
          
          // Se não tem fonte, adicionar como "Sem fonte"
          if (itemSources.length === 0) {
            totals["Sem fonte"] = (totals["Sem fonte"] || 0) + absValue;
          } else {
            // Dividir o valor entre as fontes (se houver múltiplas)
            const valuePerItem = absValue / itemSources.length;
            itemSources.forEach(src => {
              totals[src] = (totals[src] || 0) + valuePerItem;
            });
          }
        }
      });
    });
    
    // Calcular média mensal baseada no período do filtro
    const actualMonthCount = filteredMonthly.length || 1;
    
    return Object.entries(totals)
      .map(([name, value]) => ({ 
        name, 
        value,
        averagePerMonth: value / actualMonthCount
      }))
      .filter(item => item.value > 0)
      .filter(item => groupBy === "category" ? (item.name.toLowerCase() !== "investimento" && item.name.toLowerCase() !== "investimentos") : true)
      .sort((a, b) => b.value - a.value); // Ordenar por valor decrescente
  }, [filteredMonthly, groupBy]);
  
  // Agrupar itens menores que 1% em "Outros"
  const processedData = useMemo(() => {
    if (groupedData.length === 0) return [];
    
    const total = groupedData.reduce((sum, item) => sum + item.value, 0);
    const threshold = total * 0.01; // 1%
    
    const mainItems = [];
    let othersTotal = 0;
    
    groupedData.forEach(item => {
      if (item.value >= threshold) {
        mainItems.push(item);
      } else {
        othersTotal += item.value;
      }
    });
    
    if (othersTotal > 0) {
      mainItems.push({ name: "Outros", value: othersTotal });
    }
    
    return mainItems;
  }, [groupedData]);

  const COLORS = ["#10B981", "#2563EB", "#EF4444", "#8B5CF6", "#F59E0B", "#6B7280", "#1F2937"]; 
  
  const categoryOptions = Array.isArray(categories) 
    ? categories.map(c => c.name).filter(Boolean) 
    : [];
  
  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="space-y-4">
      {/* Controles de Filtro */}
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Período */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Período:</label>
            <div className="flex gap-1">
              {[1, 2, 3, 6, 12, 24].map(months => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setMonthsToShow(months)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    monthsToShow === months
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {months}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMonthsToShow(monthly.length)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  monthsToShow === monthly.length
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tudo
              </button>
            </div>
          </div>
          
          {/* Filtro de Categorias */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs font-medium text-slate-600 flex-shrink-0">Categorias:</label>
            <div className="flex flex-wrap gap-1 overflow-x-auto max-w-full">
              {categoryOptions.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    selectedCategories.includes(category)
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 whitespace-nowrap flex-shrink-0"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-1">
        <h3 className="relative z-50 mb-4 text-sm font-semibold bg-white pb-2 border-b border-slate-100">Despesas e Receitas por mês</h3>
        <div className="relative h-80 z-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Despesas" fill="#EF4444" />
              <Bar dataKey="Receitas" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
        <div className="relative z-50 mb-4 flex items-center justify-between bg-white pb-2 border-b border-slate-100">
          <h3 className="text-sm font-semibold">
            Despesas por {groupBy === "category" ? "categoria" : "fonte"} ({monthsToShow === monthly.length ? "Todo período" : monthsToShow === 1 ? "Último mês" : `Últimos ${monthsToShow} meses`})
          </h3>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setGroupBy("category")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                groupBy === "category"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Categorias
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("source")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                groupBy === "source"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Fontes
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Gráfico */}
          <div className="relative h-80 z-0 md:col-span-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={processedData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ percent }) => {
                    // Mostrar label apenas se for maior que 5%
                    if (percent < 0.05) return "";
                    return `${(percent * 100).toFixed(0)}%`;
                  }}
                  labelLine={false}
                >
                  {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Lista */}
          <div className="md:col-span-2 space-y-2 overflow-y-auto max-h-80">
            {processedData.map((item, index) => {
              const total = processedData.reduce((sum, i) => sum + i.value, 0);
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              const showTotal = showTotalFor.has(item.name);
              
              const handleClick = () => {
                setShowTotalFor(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(item.name)) {
                    newSet.delete(item.name);
                  } else {
                    newSet.add(item.name);
                  }
                  return newSet;
                });
              };
              
              return (
                <div 
                  key={item.name} 
                  className="flex items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={handleClick}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="h-3 w-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs font-medium text-slate-700 truncate min-w-0">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{percent.toFixed(1)}%</span>
                    <span className="text-xs font-bold text-slate-800 whitespace-nowrap min-w-[95px] text-right">
                      {showTotal ? fmtBRL(item.value) : `${fmtBRL(item.averagePerMonth)}/mês`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="text-center">
            <h4 className="mb-1 text-sm font-medium text-slate-600">Total de Despesas</h4>
            <div className="text-2xl font-bold text-red-600">
              {fmtBRL(monthlyChart.reduce((acc, m) => acc + (m.Despesas || 0), 0))}
            </div>
          </div>
          <div className="text-center">
            <h4 className="mb-1 text-sm font-medium text-slate-600">Total de Receitas</h4>
            <div className="text-2xl font-bold text-emerald-600">
              {fmtBRL(monthlyChart.reduce((acc, m) => acc + (m.Receitas || 0), 0))}
            </div>
          </div>
          <div className="text-center">
            <h4 className="mb-1 text-sm font-medium text-slate-600">Saldo Líquido</h4>
            <div className={`text-2xl font-bold ${
              monthlyChart.reduce((acc, m) => acc + (m.Receitas || 0) - (m.Despesas || 0), 0) >= 0
                ? "text-emerald-600" 
                : "text-red-600"
            }`}>
              {fmtBRL(monthlyChart.reduce((acc, m) => acc + (m.Receitas || 0) - (m.Despesas || 0), 0))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
