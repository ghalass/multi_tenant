"use client";

import { API, apiFetch, methods } from "@/lib/api";
import { UserDetail } from "@/lib/types";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Type pour l'utilisateur avec conversion vers UserDetail
type User = UserDetail | null;

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Utiliser UserDetail comme type pour l'état
  const [user, setUser] = useState<UserDetail | null>(null);

  // Fonction pour rafraîchir les données utilisateur
  async function refreshUser() {
    try {
      const res = await apiFetch(API.AUTH.ME, {
        method: methods.GET,
      });
      if (!res.ok) {
        throw new Error(res.data.message);
      } else {
        setUser(res.data);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  }

  // Initialiser l'utilisateur au montage du composant
  useEffect(() => {
    let isMounted = true;

    const initUser = async () => {
      try {
        const res = await apiFetch(API.AUTH.ME, {
          method: methods.GET,
        });
        if (!isMounted) return;

        if (!res.ok) {
          setUser(null);
          return;
        }

        if (!res.ok) {
          throw new Error(res.data.message);
        } else {
          setUser(res.data);
          return true;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        if (isMounted) {
          setUser(null);
        }
      }
    };

    initUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
