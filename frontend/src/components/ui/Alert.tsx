type Kind = "success" | "error" | "info";

export default function Alert({ kind, children }: { kind: Kind; children: React.ReactNode }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`} role="alert">{children}</div>;
}
