/** Llamadas a los endpoints de autenticación y usuarios. */
import { clearToken, request, setToken } from "./api";
import type { AuthResponse, LoginData, User, UserRegisterData, UserUpdateData } from "../types/user";

export const authService = {
  register: (data: UserRegisterData) =>
    request<User>("/auth/register", { method: "POST", body: data }),

  login: async (data: LoginData): Promise<User> => {
    const res = await request<AuthResponse>("/auth/login", { method: "POST", body: data });
    setToken(res.access_token);
    return res.user;
  },

  logout: async (): Promise<void> => {
    try {
      await request("/auth/logout", { method: "POST", auth: true });
    } finally {
      clearToken();
    }
  },

  me: () => request<User>("/auth/me", { auth: true }),

  updateProfile: (data: UserUpdateData) =>
    request<User>("/auth/me", { method: "PUT", body: data, auth: true }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/me/password", {
      method: "PUT",
      body: { current_password, new_password },
      auth: true,
    }),

  requestPasswordRecovery: (email: string) =>
    request<{ message: string; user_found?: boolean; debug_reset_token?: string }>(
      "/auth/password-recovery",
      { method: "POST", body: { email } },
    ),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>("/auth/password-reset", {
      method: "POST",
      body: { token, new_password },
    }),
};
