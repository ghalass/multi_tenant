"use client";

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { User, Role } from "@/lib/types";
import {
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validations/userSchema";

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  createUser: any;
  updateUser: any;
}

export function UserModal({
  open,
  onClose,
  user,
  roles,
  createUser,
  updateUser,
}: UserModalProps) {
  const isEdit = !!user;
  const [backendErrors, setBackendErrors] = useState<{
    email?: string;
    name?: string;
    password?: string;
    roles?: string;
    general?: string;
  }>({});

  const formik = useFormik({
    initialValues: {
      email: "",
      name: "",
      password: "",
      roles: [] as string[],
      active: true,
    },
    validationSchema: isEdit ? userUpdateSchema : userCreateSchema,
    onSubmit: async (values) => {
      // Réinitialiser les erreurs backend
      setBackendErrors({});

      try {
        if (isEdit) {
          // Pour l'édition, on envoie toutes les données sauf password si vide
          const dataToSend: any = {
            email: values.email,
            name: values.name,
            roles: values.roles,
            active: values.active,
          };

          // Ajouter le mot de passe seulement s'il n'est pas vide
          if (values.password && values.password.trim() !== "") {
            dataToSend.password = values.password;
          }

          await updateUser.mutateAsync({
            id: user.id,
            ...dataToSend,
          });
        } else {
          // Pour la création, on envoie toutes les données
          await createUser.mutateAsync(values);
        }
        onClose();
        formik.resetForm();
      } catch (error: any) {
        console.error("Erreur capturée:", error);
        // Gérer les erreurs backend
        handleBackendError(error);
      }
    },
  });

  const handleBackendError = (error: any) => {
    console.log("Erreur reçue dans handleBackendError:", error);

    // Récupérer les données d'erreur depuis la réponse
    const errorData = error?.response?.data || error?.data;

    if (!errorData) {
      // Si pas de données d'erreur structurées, utiliser le message d'erreur
      setBackendErrors({
        general: error?.message || "Une erreur est survenue",
      });
      return;
    }

    // Si c'est une erreur de validation du backend avec des détails
    if (errorData.details && Array.isArray(errorData.details)) {
      const errors: any = {};
      errorData.details.forEach((detail: string) => {
        const lowerDetail = detail.toLowerCase();
        // Parser les erreurs Yup du backend
        if (lowerDetail.includes("email")) {
          errors.email = detail;
        } else if (lowerDetail.includes("nom")) {
          errors.name = detail;
        } else if (
          lowerDetail.includes("mot de passe") ||
          lowerDetail.includes("password")
        ) {
          errors.password = detail;
        } else if (
          lowerDetail.includes("rôle") ||
          lowerDetail.includes("role")
        ) {
          errors.roles = detail;
        } else {
          errors.general = detail;
        }
      });
      setBackendErrors(errors);
    }
    // Si c'est une erreur spécifique (email déjà utilisé, etc.)
    else if (errorData.error || errorData.message) {
      const errorMessage = (errorData.error || errorData.message).toLowerCase();
      if (errorMessage.includes("email") || errorMessage.includes("utilisé")) {
        setBackendErrors({ email: errorData.error || errorData.message });
      } else if (errorMessage.includes("utilisateur introuvable")) {
        setBackendErrors({ general: errorData.error || errorData.message });
      } else {
        setBackendErrors({ general: errorData.error || errorData.message });
      }
    }
    // Erreur générique
    else {
      setBackendErrors({
        general: error.message || "Une erreur est survenue",
      });
    }
  };

  useEffect(() => {
    if (open && user) {
      // Correction: user.roles est un tableau direct de Role
      // Filtrer pour n'inclure que les rôles avec un ID défini
      const roleIds = (user.roles || [])
        .map((role) => role.id)
        .filter((id): id is string => !!id); // Type guard pour filtrer les undefined

      formik.setValues({
        email: user.email || "",
        name: user.name || "",
        password: "",
        roles: roleIds,
        active: user.active !== undefined ? user.active : true,
      });
      setBackendErrors({});
    } else if (open && !user) {
      formik.resetForm();
      setBackendErrors({});
    }
  }, [open, user]);

  const handleClose = () => {
    formik.resetForm();
    setBackendErrors({});
    onClose();
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      formik.setFieldValue("roles", [...formik.values.roles, roleId]);
    } else {
      formik.setFieldValue(
        "roles",
        formik.values.roles.filter((id) => id !== roleId)
      );
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de l'utilisateur"
              : "Créez un nouvel utilisateur en remplissant le formulaire"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Alerte d'erreur générale */}
            {backendErrors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{backendErrors.general}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                disabled={isPending}
                {...formik.getFieldProps("email")}
                className={
                  (formik.touched.email && formik.errors.email) ||
                  backendErrors.email
                    ? "border-destructive"
                    : ""
                }
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-sm text-destructive">
                  {formik.errors.email}
                </p>
              )}
              {backendErrors.email && (
                <p className="text-sm text-destructive">
                  {backendErrors.email}
                </p>
              )}
            </div>

            {/* Nom */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                disabled={isPending}
                {...formik.getFieldProps("name")}
                className={
                  (formik.touched.name && formik.errors.name) ||
                  backendErrors.name
                    ? "border-destructive"
                    : ""
                }
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-sm text-destructive">{formik.errors.name}</p>
              )}
              {backendErrors.name && (
                <p className="text-sm text-destructive">{backendErrors.name}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="grid gap-2">
              <Label htmlFor="password">
                Mot de passe{" "}
                {!isEdit && <span className="text-destructive">*</span>}
                {isEdit && (
                  <span className="text-sm text-muted-foreground">
                    (laisser vide pour ne pas changer)
                  </span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                {...formik.getFieldProps("password")}
                className={
                  (formik.touched.password && formik.errors.password) ||
                  backendErrors.password
                    ? "border-destructive"
                    : ""
                }
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-sm text-destructive">
                  {formik.errors.password}
                </p>
              )}
              {backendErrors.password && (
                <p className="text-sm text-destructive">
                  {backendErrors.password}
                </p>
              )}
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              )}
            </div>

            {/* Statut (actif/inactif) */}
            {isEdit && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formik.values.active}
                  onCheckedChange={(checked) =>
                    formik.setFieldValue("active", checked)
                  }
                  disabled={isPending}
                />
                <Label
                  htmlFor="active"
                  className="text-sm font-normal cursor-pointer"
                >
                  Utilisateur actif
                </Label>
              </div>
            )}

            {/* Rôles */}
            <div className="grid gap-2">
              <Label>
                Rôles <span className="text-destructive">*</span>
              </Label>
              <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun rôle disponible. Veuillez d'abord créer des rôles.
                  </p>
                ) : (
                  roles
                    .filter((role) => !!role.id) // Filtrer les rôles sans ID
                    .map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={formik.values.roles.includes(role.id!)}
                          onCheckedChange={(checked) =>
                            handleRoleChange(role.id!, checked as boolean)
                          }
                          disabled={isPending}
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <div className="text-xs text-muted-foreground">
                              {role.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))
                )}
              </div>
              {formik.touched.roles && formik.errors.roles && (
                <p className="text-sm text-destructive">
                  {formik.errors.roles}
                </p>
              )}
              {backendErrors.roles && (
                <p className="text-sm text-destructive">
                  {backendErrors.roles}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                formik.values.roles.length === 0 ||
                (!isEdit &&
                  (!formik.values.password ||
                    formik.values.password.trim() === ""))
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
