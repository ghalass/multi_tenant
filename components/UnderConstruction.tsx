import React from "react";
import { AlertCircle, Construction, Wrench, Clock, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface UnderConstructionProps {
  pageName?: string;
  estimatedCompletion?: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
}

export default function UnderConstruction({
  pageName = "Cette page",
  estimatedCompletion,
  showHomeButton = true,
}: UnderConstructionProps) {
  return (
    <div className="flex items-center justify-center bg-linear-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-xl shadow-lg border bg-card">
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-4">
            {/* Icône principale */}
            <div className="relative inline-block">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
                <Construction className="w-10 h-10 md:w-12 md:h-12 text-amber-600 dark:text-amber-500" />
              </div>
              <Badge className="absolute -top-2 -right-2 bg-amber-500 hover:bg-amber-600 text-amber-50 px-3 py-1">
                En travaux
              </Badge>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                En construction
              </h1>
              <p className="text-muted-foreground">
                {pageName} est actuellement en développement
              </p>
            </div>

            {/* Message */}
            <div className="bg-muted/40 dark:bg-muted/20 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground text-left">
                  Nous travaillons dur pour finaliser cette section. Elle sera
                  bientôt disponible avec des fonctionnalités améliorées.
                </p>
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="space-y-3 pt-2">
              {estimatedCompletion && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Estimation : {estimatedCompletion}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Wrench className="w-4 h-4" />
                <span className="text-sm">Nouveautés à venir</span>
              </div>
            </div>

            {/* Actions */}
            {showHomeButton && (
              <div className="pt-2">
                <Link href={"/"}>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    <Home className="w-4 h-4 mr-2" />
                    Retour à l&apos;accueil
                  </Button>
                </Link>
              </div>
            )}

            {/* Pied de page */}
            <div className="pt-6 border-t">
              <p className="text-xs text-muted-foreground">
                Merci de votre patience pendant que nous améliorons votre
                expérience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
