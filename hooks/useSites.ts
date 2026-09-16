// hooks/useSites.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/constantes";

export interface Site {
  id: string;
  name: string;
  active: boolean;
  _count?: { engins: number };
}

export interface SiteFormData {
  name: string;
  active?: boolean;
}

export const useSites = () => {
  const queryClient = useQueryClient();

  const sitesQuery = useQuery<Site[]>({
    queryKey: ["sites"],
    queryFn: async (): Promise<Site[]> => {
      const response = await fetch(`${API}/sites`);
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du chargement");
      }
      return dataRes;
    },
  });

  const createSite = useMutation<Site, Error, SiteFormData>({
    mutationFn: async (data: SiteFormData): Promise<Site> => {
      const response = await fetch(`${API}/sites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du création");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const updateSite = useMutation<
    Site,
    Error,
    { id: string; data: SiteFormData }
  >({
    mutationFn: async ({ id, data }): Promise<Site> => {
      const response = await fetch(`${API}/sites/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du modification");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const deleteSite = useMutation<void, Error, string>({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API}/sites/${id}`, {
        method: "DELETE",
      });
      const dataRes = await response.json();
      if (!response.ok) {
        throw new Error(dataRes.message || "Erreur lors du suppression");
      }
      return dataRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  return {
    sitesQuery,
    createSite,
    updateSite,
    deleteSite,
  };
};
