// app/hooks/useImport.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ImportData {
  sheetName: string;
  data: any;
}

interface ImportResult {
  success: boolean;
  message: string;
  data: any;
  summary?: {
    total: number;
    success: number;
    errors: number;
  };
}

const importData = async ({
  sheetName,
  data,
}: ImportData): Promise<ImportResult> => {
  const response = await fetch("/api/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sheetName, data }),
  });

  const responseData = await response.json();

  // Si le statut HTTP n'est pas 200-299
  if (!response.ok) {
    // Utiliser le message de l'API s'il existe
    const errorMessage =
      responseData.message ||
      responseData.error ||
      `Erreur ${response.status} lors de l'importation`;
    throw new Error(errorMessage);
  }

  return responseData;
};

export const useImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["importList"] });
    },
  });
};
