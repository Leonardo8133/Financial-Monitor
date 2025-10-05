import { useState, useMemo } from "react";
import { CalculatorIcon, CurrencyDollarIcon, CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { fmtBRL } from "../../utils/formatters.js";

export function FinancingCalculator() {
  const [formData, setFormData] = useState({
    principal: 0,
    monthlyPayment: 0,
    interestRate: 0,
    termMonths: 0,
  });

  function formatCurrency(value) {
    if (!value || value === '0') return 'R$ 0,00';
    const numValue = Number(value);
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const [results, setResults] = useState(null);

  const calculateFinancing = () => {
    const { principal, monthlyPayment, interestRate, termMonths } = formData;
    
    if (!principal || !monthlyPayment || !interestRate || !termMonths) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termMonths;
    
    // Calcular o valor total pago
    const totalPaid = monthlyPayment * totalPayments;
    
    // Calcular o total de juros
    const totalInterest = totalPaid - principal;
    
    // Calcular o tempo restante baseado no valor principal e pagamento mensal
    const remainingMonths = Math.ceil(principal / monthlyPayment);
    
    // Calcular projeções mensais
    const monthlyProjections = [];
    let remainingBalance = principal;
    
    for (let month = 1; month <= Math.min(totalPayments, 12); month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      
      monthlyProjections.push({
        month,
        payment: monthlyPayment,
        principalPayment,
        interestPayment,
        remainingBalance,
      });
    }

    setResults({
      totalPaid,
      totalInterest,
      remainingMonths,
      monthlyProjections,
      monthlyRate,
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <CalculatorIcon className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Calculadora de Financiamentos</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 group">
                <CurrencyDollarIcon className="inline h-4 w-4 mr-1" />
                Valor Principal (R$)
                <button
                  type="button"
                  className="ml-2 w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Valor total do financiamento"
                >
                  ?
                </button>
              </label>
              <input
                type="text"
                value={formatCurrency(formData.principal)}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                  handleInputChange('principal', value || '0');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: R$ 100.000,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 group">
                <CurrencyDollarIcon className="inline h-4 w-4 mr-1" />
                Pagamento Mensal (R$)
                <button
                  type="button"
                  className="ml-2 w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Valor fixo pago mensalmente"
                >
                  ?
                </button>
              </label>
              <input
                type="text"
                value={formatCurrency(formData.monthlyPayment)}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                  handleInputChange('monthlyPayment', value || '0');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: R$ 1.500,00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 group">
                <ChartBarIcon className="inline h-4 w-4 mr-1" />
                Taxa de Juros Anual (%)
                <button
                  type="button"
                  className="ml-2 w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Taxa de juros anual em percentual"
                >
                  ?
                </button>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: 12.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 group">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                Prazo Total (meses)
                <button
                  type="button"
                  className="ml-2 w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Número total de meses para quitar o financiamento"
                >
                  ?
                </button>
              </label>
              <input
                type="number"
                value={formData.termMonths}
                onChange={(e) => handleInputChange('termMonths', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: 60"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={calculateFinancing}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Calcular Financiamento
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          {/* Resumo dos Resultados */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <div className="text-sm font-medium text-green-800">Total Pago</div>
              <div className="text-2xl font-bold text-green-900">{fmtBRL(results.totalPaid)}</div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="text-sm font-medium text-red-800">Total de Juros</div>
              <div className="text-2xl font-bold text-red-900">{fmtBRL(results.totalInterest)}</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="text-sm font-medium text-blue-800">Meses Restantes</div>
              <div className="text-2xl font-bold text-blue-900">{results.remainingMonths}</div>
            </div>
          </div>

          {/* Projeções Mensais */}
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Projeções dos Primeiros 12 Meses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-medium text-slate-600">Mês</th>
                    <th className="text-right py-2 font-medium text-slate-600">Pagamento</th>
                    <th className="text-right py-2 font-medium text-slate-600">Principal</th>
                    <th className="text-right py-2 font-medium text-slate-600">Juros</th>
                    <th className="text-right py-2 font-medium text-slate-600">Saldo Devedor</th>
                  </tr>
                </thead>
                <tbody>
                  {results.monthlyProjections.map((projection) => (
                    <tr key={projection.month} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">{projection.month}</td>
                      <td className="py-2 text-right font-medium text-slate-900">{fmtBRL(projection.payment)}</td>
                      <td className="py-2 text-right text-green-600">{fmtBRL(projection.principalPayment)}</td>
                      <td className="py-2 text-right text-red-600">{fmtBRL(projection.interestPayment)}</td>
                      <td className="py-2 text-right text-slate-700">{fmtBRL(projection.remainingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análise de Cenários */}
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Análise de Cenários</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Cenário Atual</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>Pagamento mensal: {fmtBRL(formData.monthlyPayment)}</div>
                  <div>Prazo total: {formData.termMonths} meses</div>
                  <div>Total de juros: {fmtBRL(results.totalInterest)}</div>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Dicas de Otimização</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>• Considere pagamentos extras para reduzir juros</div>
                  <div>• Avalie refinanciamento se as taxas caírem</div>
                  <div>• Mantenha um fundo de emergência</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}