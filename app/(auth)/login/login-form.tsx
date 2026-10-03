"use client";

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
import Link from "next/link";
import { useState } from "react";

import * as z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { login } from "@/server/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.string().min(8).describe("Email"),
  password: z.string().min(6).describe("Mot de passe"),
});

export default function LoginForm() {
  const [isSubmitting, setisSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "ghalass@ghalass.com", password: "super@dmin" },
  });
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setisSubmitting(true);
    setError(null);
    try {
      const { success, message } = await login(values.email, values.password);

      if (success) {
        toast.success(message);
        router.push("/");
      } else {
        setError(message);
        // toast.error(message);
      }
    } catch (error) {
    } finally {
      setisSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Se connecter</CardTitle>
        <CardDescription className="text-center">
          Entrez vos identifiants pour accéder à votre compte.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="m@example.com"
                    autoComplete="off"
                    disabled={isSubmitting}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    aria-invalid={fieldState.invalid}
                    placeholder=""
                    autoComplete="off"
                    type="password"
                    disabled={isSubmitting}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        {error && (
          <div className="mt-2 p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="text-center space-y-2 text-sm">
          <p className="text-muted-foreground">
            <Link href="/" className="text-primary hover:underline font-medium">
              Retour à la page d&apos;accueil
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
