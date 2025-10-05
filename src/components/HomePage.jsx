import { Link } from "react-router-dom";
import { ChartBarIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

export function HomePage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <div className="mb-8">
              <h1 className="mb-4 text-4xl font-bold text-slate-900">
                Monitor Financeiro
              </h1>
              <p className="text-lg text-slate-600">
                Gerencie seus investimentos e controle seus gastos de forma inteligente
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Link
                to="/investimentos"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative z-10">
                  <ChartBarIcon className="mx-auto mb-4 h-16 w-16" />
                  <h2 className="mb-2 text-2xl font-bold">Investimentos</h2>
                  <p className="text-blue-100">
                    Acompanhe seus investimentos, visualize gráficos e projeções futuras
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>

              <Link
                to="/gastos"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-8 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative z-10">
                  <CurrencyDollarIcon className="mx-auto mb-4 h-16 w-16" />
                  <h2 className="mb-2 text-2xl font-bold">Gastos</h2>
                  <p className="text-green-100">
                    Controle seus gastos, categorize despesas e calcule financiamentos
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            </div>

            <div className="mt-12 rounded-xl bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">
                Funcionalidades Principais
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-left">
                  <h4 className="font-semibold text-blue-600">Investimentos</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li>• Dashboard com indicadores</li>
                    <li>• Histórico de lançamentos</li>
                    <li>• Projeções futuras</li>
                    <li>• Relatórios em PDF</li>
                  </ul>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-green-600">Gastos</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li>• Categorização de despesas</li>
                    <li>• Análise por período</li>
                    <li>• Calculadora de financiamentos</li>
                    <li>• Importação de dados</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}