import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  withCredentials: true,
});

// 401 Interceptor: Redirect to /login on unauthorized response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path !== "/login" && path !== "/register") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====
export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  hasProfile: boolean;
  profileId?: number | null;
}

export const authApi = {
  register: (data: { name: string; email: string; password: String; confirmPassword: String }) =>
    api.post<AuthUser>("/auth/register", data),
  login: (data: { email: string; password: String }) =>
    api.post<AuthUser>("/auth/login", data),
  logout: () => api.post<{ message: string }>("/auth/logout"),
  me: () => api.get<AuthUser>("/auth/me"),
};

// ===== User type (used by Profile/Interest) =====
export interface User {
  userId?: number;
  name: string;
  email: string;
}

// ===== Profiles =====
export interface Profile {
  profileId?: number;
  user?: User;
  age: number;
  gender: string;
  city: string;
  education?: string;
  occupation?: string;
  about?: string;
  photoUrl?: string;
}

export const profileApi = {
  create: (userId: number, data: Omit<Profile, "profileId" | "user">) =>
    api.post<Profile>(`/profiles/user/${userId}`, data),
  getAll: () => api.get<Profile[]>("/profiles"),
  getById: (id: number) => api.get<Profile>(`/profiles/${id}`),
  getByUserId: (userId: number) => api.get<Profile>(`/profiles/user/${userId}`),
  search: (params: { gender?: string; city?: string; age?: number }) =>
    api.get<Profile[]>("/profiles/search", { params }),
  update: (id: number, data: Partial<Profile>) =>
    api.put<Profile>(`/profiles/${id}`, data),
  delete: (id: number) => api.delete(`/profiles/${id}`),
};

// ===== Interests =====
export interface Interest {
  interestId?: number;
  sender?: User;
  receiver?: User;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

export const interestApi = {
  send: (senderId: number, receiverId: number) =>
    api.post<Interest>("/interests/send", { senderId, receiverId }),
  getSent: (userId: number) => api.get<Interest[]>(`/interests/sent/${userId}`),
  getReceived: (userId: number) =>
    api.get<Interest[]>(`/interests/received/${userId}`),
  accept: (id: number) => api.put<Interest>(`/interests/${id}/accept`),
  reject: (id: number) => api.put<Interest>(`/interests/${id}/reject`),
  delete: (id: number) => api.delete(`/interests/${id}`),
  checkMatch: (user1: number, user2: number) =>
    api.get<{ matched: boolean }>(`/interests/match`, { params: { user1, user2 } }),
};

export default api;

// ===== File Upload =====
export const uploadApi = {
  profilePhoto: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ url: string; filename: string }>("/upload/profile-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
