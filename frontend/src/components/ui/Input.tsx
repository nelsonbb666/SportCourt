import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, error, id, ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} {...rest} />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
