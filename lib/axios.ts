import axios from "axios";

// Configuration de base pour axios
export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important pour les cookies de session
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    // Vous pouvez ajouter des logs ou headers supplémentaires ici
    // console.log('Requête envoyée:', config.method, config.url);

    // Ajout d'un token si nécessaire (pour JWT)
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    console.error("Erreur dans la requête:", error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    // Vous pouvez logger les réponses réussies si nécessaire
    // console.log('Réponse reçue:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Log de l'erreur
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Ici, on laisse le service AuthService gérer les erreurs
    // On ne fait que le log, pas de redirection automatique

    return Promise.reject(error);
  }
);

// Export des méthodes HTTP de base (optionnel)
export const apiRequest = api;
