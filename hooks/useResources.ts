// hooks/useResources.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/constantes";
import { toast } from "sonner";

export interface Resource {
  id: string;
  name: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  permissions?: Array<{
    id: string;
    name: string;
    action: string;
    description?: string;
    createdAt?: string;
  }>;
}

export interface CreateResourceData {
  name: string;
  label: string;
}

export interface UpdateResourceData {
  name?: string;
  label?: string;
}

export const useResources = () => {
  const queryClient = useQueryClient();

  // 🔹 FETCH RESOURCES
  const resourcesQuery = useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: async (): Promise<Resource[]> => {
      const response = await fetch(`${API}/resources`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors du chargement des resources"
        );
      }
      return data;
    },
  });

  // 🔹 CREATE RESOURCE
  const createResource = useMutation<Resource, Error, CreateResourceData>({
    mutationFn: async (data: CreateResourceData): Promise<Resource> => {
      const response = await fetch(`${API}/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(
          res.message || "Erreur lors de la création de la ressource"
        );
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Ressource créée avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // 🔹 UPDATE RESOURCE
  const updateResource = useMutation<
    Resource,
    Error,
    { id: string; data: UpdateResourceData }
  >({
    mutationFn: async ({ id, data }): Promise<Resource> => {
      const response = await fetch(`${API}/resources/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(
          res.message || "Erreur lors de la modification de la ressource"
        );
      }

      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources", variables.id] });
      toast.success("Ressource modifiée avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // 🔹 DELETE RESOURCE
  const deleteResource = useMutation<void, Error, string>({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API}/resources/${id}`, {
        method: "DELETE",
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(
          res.message || "Erreur lors de la suppression de la ressource"
        );
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Ressource supprimée avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Convertir les ressources en options pour les selects
  const resourceOptions =
    resourcesQuery.data?.map((resource) => ({
      value: resource.id,
      label: resource.label,
    })) || [];

  return {
    resourcesQuery,
    createResource,
    updateResource,
    deleteResource,
    resourceOptions,
  };
};
