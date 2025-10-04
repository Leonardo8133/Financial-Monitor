import React from "react";
import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let status = 404;
  let title = "Página não encontrada";
  let description = "O caminho acessado não existe.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = error.statusText || title;
    description = (error.data && (error.data.message || error.data)) || description;
  } else if (error instanceof Error) {
    status = 500;
    title = "Algo deu errado";
    description = error.message;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 pt-24 text-center">
        <div className="text-7xl font-extrabold text-slate-300">{status}</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="max-w-prose text-slate-600">{String(description)}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/investimentos"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            Ir para Investimentos
          </Link>
          <Link
            to="/gastos"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            Ir para Gastos
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}
