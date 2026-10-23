// app/not-found.tsx (version animée)
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Navigation } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          {/* Animated Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Navigation className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium animate-bounce">
                  404
                </div>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3 mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Oups ! Perdu ?
            </h1>
            <p className="text-muted-foreground">
              Cette page semble avoir disparu dans la nature. Revenons sur le
              bon chemin.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button asChild className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              Si le problème persiste, contactez notre support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
