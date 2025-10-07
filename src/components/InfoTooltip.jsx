import { useId, useState } from "react";
import { Transition } from "@headlessui/react";

/**
 * InfoTooltip exibe um painel rico ao pairar ou focar em um conteúdo qualquer.
 * É utilizado para explicar indicadores financeiros mostrando o propósito do valor
 * e como ele é calculado.
 */
export function InfoTooltip({
  title,
  purpose,
  calculation,
  extraDetails,
  children,
  side = "top",
  className = "",
  panelClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const positionClass = (() => {
    switch (side) {
      case "bottom":
        return "left-1/2 top-full mt-2 -translate-x-1/2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 -mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      case "top":
      default:
        return "left-1/2 bottom-full -mb-2 -translate-x-1/2";
    }
  })();

  return (
    <div
      className={`relative inline-flex min-w-0 items-stretch ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
    >
      <div aria-describedby={tooltipId} className="flex-1">
        {children}
      </div>
      <Transition
        show={open}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <div
          role="tooltip"
          id={tooltipId}
          className={`pointer-events-none absolute z-30 w-64 max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-left text-xs text-slate-600 shadow-xl ${positionClass} ${panelClassName}`}
        >
          {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
          {purpose && (
            <div className="mt-2">
              <p className="font-semibold text-slate-800">Por que importa</p>
              <p className="mt-1 leading-relaxed">{purpose}</p>
            </div>
          )}
          {calculation && (
            <div className="mt-2">
              <p className="font-semibold text-slate-800">Como calculamos</p>
              <p className="mt-1 leading-relaxed">{calculation}</p>
            </div>
          )}
          {Array.isArray(extraDetails) && extraDetails.length > 0 && (
            <ul className="mt-2 space-y-1 text-[0.7rem] text-slate-500">
              {extraDetails.map((detail) => (
                <li key={detail.label} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-slate-700">{detail.label}: </span>
                    {detail.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Transition>
    </div>
  );
}
