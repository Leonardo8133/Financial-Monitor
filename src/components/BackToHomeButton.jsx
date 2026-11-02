import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "./icons.jsx";

export function BackToHomeButton({ label = "Início", to = "/" }) {
  return (
    <Link to={to} className="btn btn-sm rounded-full" aria-label="Voltar para a página principal">
      <ArrowLeftIcon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
