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
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 pt-24 text-center">
        <div className="text-7xl font-extrabold text-faint">{status}</div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="max-w-prose text-muted">{String(description)}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link to="/investimentos" className="btn">
            Ir para Investimentos
          </Link>
          <Link to="/gastos" className="btn">
            Ir para Gastos
          </Link>
          <Link to="/" className="btn-primary">
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}
