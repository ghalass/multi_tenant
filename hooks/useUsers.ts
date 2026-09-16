// hooks/useUsers.ts
"use client";

import { API } from "@/lib/constantes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Interface User cohérente avec votre schéma
export interface User {
  createdAt: string | number | Date;
  roles: string[];
  id: string;
  email: string;
  name: string;
  active?: boolean;
  // Ajoutez d'autres champs si nécessaire
}

export interface userCreateDto {
  email: string;
  name: string;
  password: string;
  active?: boolean;
  roles?: string[];
}

export function useUsers() {
  const queryClient = useQueryClient();

  // 🔹 FETCH USERS
  const usersQuery = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch(`${API}/users`);
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du chargement");
      }
      return dataRes;
    },
  });

  // 🔹 CREATE USER
  const createUser = useMutation<User, Error, userCreateDto>({
    mutationFn: async ({ email, name, password, roles, active }) => {
      const response = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roles, active }),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du création");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // 🔹 UPDATE USER
  const updateUser = useMutation<
    User,
    Error,
    {
      id: string;
      email: string;
      name: string;
      password: string;
      active?: boolean;
      roles: string[];
    }
  >({
    mutationFn: async ({ id, email, name, password, roles, active }) => {
      const response = await fetch(`${API}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roles, active }),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du modification");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // 🔹 DELETE USER
  const deleteUser = useMutation<User, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const response = await fetch(`${API}/users/${id}`, { method: "DELETE" });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du suppression");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateProfile = useMutation<
    User,
    Error,
    {
      name: string;
      email: string;
      password?: string;
    }
  >({
    mutationFn: async ({ name, email, password }) => {
      const response = await fetch(`${API}/auth/profile`, {
        // Endpoint profil
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(
          dataRes.message || "Erreur lors du mise à jour profile"
        );
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const changePassword = useMutation<
    User,
    Error,
    {
      currentPassword: string;
      newPassword: string;
    }
  >({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await fetch(`${API}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          password: newPassword,
        }),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(
          dataRes.message || "Erreur lors du mise à jour mot de passe"
        );
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    usersQuery,
    createUser,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword,
  };
}
