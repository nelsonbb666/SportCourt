/** Cliente HTTP mínimo para la API de SportCourt (fetch + JWT). */


// En desarrollo se usa el proxy de Vite ("/api"). En build estático (GitHub Pages)
// se puede definir la URL pública de la API con VITE_API_URL antes de compilar
// (p. ej. VITE_API_URL=https://mi-backend.onrender.com/api/v1 npm run build:gh-pages).
// Si no se define, queda vacía y la app funciona en modo demostración sin backend.
const BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;
const TOKEN_KEY = "sportcourt_access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { method = "GET", body, auth = false } = options;

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    let detail = "Ocurrió un error inesperado";
    try {
      const data: unknown = await resp.json();
      if (data && typeof data === "object" && "detail" in data) {
        const d = (data as { detail?: unknown }).detail;
        if (typeof d === "string") detail = d;
        else if (Array.isArray(d) && d.length > 0) {
          const first = d[0] as { msg?: string };
          if (first && typeof first.msg === "string") detail = first.msg;
        }
      }
    } catch {
      /* respuesta sin JSON */
    }
    throw new HttpError(resp.status, detail);
  }

  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}
