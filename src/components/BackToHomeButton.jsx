import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "./icons.jsx";

export function BackToHomeButton({ label = "Início" }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
      aria-label="Voltar para a página principal"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
