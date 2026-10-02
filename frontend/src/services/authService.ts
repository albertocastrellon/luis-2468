import { api } from "./api";
import type { AuthResponse } from "../types";

export const authService = {
  register: async (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => (await api.post<AuthResponse>("/auth/register", payload)).data,
  login: async (payload: { email: string; password: string }) =>
    (await api.post<AuthResponse>("/auth/login", payload)).data,
  me: async () => (await api.get<AuthResponse>("/auth/me")).data,
  logout: async () => api.post("/auth/logout"),
};
