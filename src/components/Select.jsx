import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente Select padrão do Tailwind CSS
 * @param {Object} props - Props do componente
 * @param {string} props.value - Valor selecionado
 * @param {function} props.onChange - Função chamada quando o valor muda
 * @param {Array} props.options - Array de opções {value, label}
 * @param {string} props.placeholder - Placeholder quando não há valor selecionado
 * @param {boolean} props.disabled - Se o select está desabilitado
 * @param {string} props.className - Classes CSS adicionais
 * @param {string} props.size - Tamanho: 'sm', 'md', 'lg'
 * @param {string} props.variant - Variante: 'default', 'outline'
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  disabled = false,
  className = "",
  size = "md",
  variant = "default",
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };

  const variantClasses = {
    default: "bg-white border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400",
    outline: "bg-transparent border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
  };

  const baseClasses = "w-full rounded-lg border outline-none transition-colors duration-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  // Encontrar o label da opção selecionada
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : (placeholder || "");

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handler para seleção de opção
  const handleOptionSelect = (optionValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: optionValue }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={classes}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`${classes} cursor-pointer flex items-center justify-between`}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        <span className={!value ? "text-slate-500" : ""}>
          {displayValue}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {placeholder && (
            <div
              className={`${sizeClasses[size]} px-3 py-2 text-slate-500 cursor-pointer`}
              onClick={() => handleOptionSelect("")}
            >
              {placeholder}
            </div>
          )}
          {options.map((option) => (
            <div
              key={option.value}
              className={`${sizeClasses[size]} px-3 py-2 cursor-pointer text-slate-700`}
              onClick={() => handleOptionSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Select;
