"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import ModeToggle from "@/components/ModeToggle";
import yup from "@/lib/yupFr";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import manquant ajouté
import { toast } from "sonner";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter(); // Pour la redirection

  // Ajout de messages d'erreur explicites
  const nameSchema = yup
    .string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .required("Le nom est requis")
    .label("Nom complet");

  const emailSchema = yup
    .string()
    .email("Format d'email invalide")
    .required("L'email est requis")
    .label("Adresse Email");

  const passwordSchema = yup
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .required("Le mot de passe est requis")
    .label("Mot de passe");

  const validationSchema = yup.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  });

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      tenantName: "",
    },
    onSubmit: async ({ value }) => {
      try {
        setError("");
        setIsSubmitting(true);
        await validationSchema.validate(value, { abortEarly: false });
        // Appel de la fonction register
        const success = await register(
          value.name,
          value.email,
          value.password,
          value.tenantName
        );
        if (success) {
          router.push("/login"); // Redirige vers la page de connexion
          toast.success("Compte créé avec succès");
        } else {
          setError("Échec de l'inscription. Veuillez réessayer!!.");
        }
      } catch (err: any) {
        console.error("Erreur de connexion:", err);
        // ✅ Gestion des erreurs YUP
        if (err.name === "ValidationError" && err.errors) {
          setError(err.errors.join(", "));
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError(err.message || "Erreur lors de la connexion");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center p-4">
      <div className="self-center">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Créer un compte
          </CardTitle>
          <CardDescription className="text-center">
            Remplissez le formulaire pour créer votre compte.
          </CardDescription>
          {/* Meilleur affichage des erreurs */}
          {error && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form
            id="register-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Empêche la propagation
              form.handleSubmit();
            }}
          >
            <FieldGroup className="space-y-4">
              {/* Nom */}
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    try {
                      nameSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Nom invalide";
                    }
                  },
                  onBlur: ({ value }) => {
                    try {
                      nameSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Nom invalide";
                    }
                  },
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Nom complet
                        <span className="text-red-500"> *</span>
                      </FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Jean Dupont"
                        autoComplete="name"
                        className={isInvalid ? "border-red-500" : ""}
                      />
                      {isInvalid && (
                        <FieldError
                          errors={field.state.meta.errors.map((err) => ({
                            message: err,
                          }))}
                        />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* Email */}
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    try {
                      emailSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Email invalide";
                    }
                  },
                  onBlur: ({ value }) => {
                    try {
                      emailSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Email invalide";
                    }
                  },
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Email
                        <span className="text-red-500"> *</span>
                      </FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="exemple@email.com"
                        autoComplete="email"
                        className={isInvalid ? "border-red-500" : ""}
                      />
                      {isInvalid && (
                        <FieldError
                          errors={field.state.meta.errors.map((err) => ({
                            message: err,
                          }))}
                        />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* Mot de passe */}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    try {
                      passwordSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Mot de passe invalide";
                    }
                  },
                  onBlur: ({ value }) => {
                    try {
                      passwordSchema.validateSync(value);
                      return undefined;
                    } catch (err: any) {
                      return err.message || "Mot de passe invalide";
                    }
                  },
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Mot de passe
                        <span className="text-red-500"> *</span>
                      </FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="********"
                        autoComplete="new-password"
                        className={isInvalid ? "border-red-500" : ""}
                      />
                      {isInvalid && (
                        <FieldError
                          errors={field.state.meta.errors.map((err) => ({
                            message: err,
                          }))}
                        />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              disabled={isSubmitting}
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setError("");
              }}
              className="flex-1"
            >
              Réinitialiser
            </Button>
            <Button
              type="submit"
              form="register-form"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" /> Création...
                </span>
              ) : (
                "S'inscrire"
              )}
            </Button>
          </div>

          <div className="text-center space-y-2 text-sm mt-4">
            <p className="text-gray-600 dark:text-gray-400">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Se connecter
              </Link>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <Link
                href="/"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Retour à la page d'accueil
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
