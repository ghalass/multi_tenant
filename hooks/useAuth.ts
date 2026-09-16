import { useUser } from "@/context/UserContext";
import { API, apiFetch, methods } from "@/lib/api";
import { ROUTE } from "@/lib/routes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const { refreshUser } = useUser();
  const router = useRouter();

  // Fonction pour extraire le message d'erreur de la réponse
  const extractErrorMessage = (data: any): string => {
    if (typeof data?.error === "string") {
      return data.error;
    } else if (data?.details && Array.isArray(data.details)) {
      // Si c'est une erreur de validation avec des détails
      return data.details.join(", ");
    } else if (data?.message) {
      return data.message;
    }
    return "Une erreur est survenue";
  };

  // 🔹 LOGIN USER
  const login = async (email: string, password: string, tenantName: string) => {
    const res = await apiFetch(API.AUTH.LOGIN, {
      method: methods.POST,
      body: JSON.stringify({ email, password, tenantName }),
    });
    if (!res.ok) {
      throw new Error(res.data.message);
    } else {
      await refreshUser();
      return true;
    }
  };

  // 🔹 REGISTER
  const register = async (
    name: string,
    email: string,
    password: string,
    tenantName: string
  ) => {
    const res = await apiFetch(API.AUTH.REGISTER, {
      method: methods.POST,
      body: JSON.stringify({ name, email, password, tenantName }),
    });
    if (!res.ok) {
      throw new Error(res.data.message);
    } else {
      await refreshUser();
      return true;
    }
  };

  // 🔹 LOGOUT
  const logout = async () => {
    try {
      const res = await apiFetch(API.AUTH.LOGOUT, {
        method: methods.POST,
      });
      if (!res.ok) {
        throw new Error(res.data.message);
      }
      await refreshUser();
      router.push(ROUTE.AUTH.LOGIN);
      toast.success("Déconnecté avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la déconnexion");
    }
  };

  return { logout, login, register };
}
