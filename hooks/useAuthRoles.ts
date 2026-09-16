// hooks/useAuthRoles.ts
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/constantes";

export const useAuthRoles = () => {
  return useQuery({
    queryKey: ["auth-roles"],
    queryFn: async (): Promise<{
      isAdmin: boolean;
      isSuperAdmin: boolean;
      isAdminOrSuperAdmin: boolean;
    }> => {
      const response = await fetch(`${API}/auth/roles`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des rôles utilisateur");
      }

      const data = await response.json();
      return data;
    },
  });
};
