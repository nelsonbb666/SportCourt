/** Tipos y cliente HTTP del módulo de canchas (gestión/consulta). */
import { request } from "./api";

export interface Sport {
  id: number;
  name: string;
}

export interface Court {
  id: number;
  name: string;
  sport_id: number;
  sport?: Sport | null;
  location: string;
  price_per_hour: number;
  capacity: number;
  description?: string | null;
  image_url?: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourtFilters {
  sport_id?: number;
  only_available?: boolean;
  search?: string;
}

export interface AvailabilitySlot {
  hour: number;
  available: boolean;
}

export const courtService = {
  listSports: (): Promise<Sport[]> => request<Sport[]>("/courts/sports"),

  listCourts: (filters: CourtFilters = {}): Promise<Court[]> => {
    const params = new URLSearchParams();
    if (filters.sport_id) params.set("sport_id", String(filters.sport_id));
    if (filters.only_available) params.set("only_available", "true");
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    const qs = params.toString();
    return request<Court[]>(`/courts${qs ? `?${qs}` : ""}`);
  },

  getCourt: (id: number): Promise<Court> => request<Court>(`/courts/${id}`),

  getAvailability: (id: number, day: string): Promise<{ slots: AvailabilitySlot[] }> =>
    request(`/courts/${id}/availability?day=${day}`),
};
