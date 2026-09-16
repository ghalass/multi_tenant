import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { ObjectSchema } from "yup";

type FormFieldProps = {
  form: any;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  validationSchema?: ObjectSchema<any>;
  customValidator?: (value: any) => string | undefined;
  min?: string | number;
  max?: string | number;
  step?: string | number;
};

export function FormField({
  form,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  disabled = false,
  validationSchema,
  customValidator,
  min,
  max,
  step,
}: FormFieldProps) {
  const getValidators = () => {
    const validators: any = {};

    // Priorité à la validation personnalisée
    if (customValidator) {
      validators.onChange = ({ value }: { value: any }) => {
        const error = customValidator(value);
        return error ? error : undefined;
      };
    }
    // Sinon utiliser le schéma Yup
    else if (validationSchema) {
      validators.onChange = ({ value }: { value: any }) => {
        try {
          // Créer un objet avec la valeur à valider
          const validationObj = { [name]: value };

          // Valider avec le schéma Yup
          validationSchema.validateSyncAt(name, validationObj);
          return undefined; // Pas d'erreur
        } catch (err: any) {
          // Retourner le message d'erreur pour TanStack Form
          return err.message || "Erreur de validation";
        }
      };
    }

    // Ajouter la validation onBlur pour un meilleur UX
    // if (validationSchema || customValidator) {
    //   validators.onBlur = validators.onChange;
    // }

    return validators;
  };

  return (
    <form.Field name={name} validators={getValidators()}>
      {(field: any) => {
        // Récupérer la première erreur
        const error =
          field.state.meta.errors.length > 0
            ? field.state.meta.errors[0]
            : undefined;
        const fieldName = field.name as string;
        const isTouched = field.state.meta.isTouched;

        // Afficher l'erreur seulement si le champ a été touché
        const showError = isTouched && error;

        return (
          <Field className="gap-0.5">
            <FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
            <Input
              id={fieldName}
              name={fieldName}
              type={type}
              value={field.state.value}
              placeholder={placeholder}
              onChange={(e) => {
                field.handleChange(e.target.value);
                // Trigger validation on change
                // field.handleBlur();
              }}
              // onBlur={field.handleBlur}
              className={showError ? "border-red-500" : ""}
              autoComplete={autoComplete}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              aria-invalid={!!showError}
              aria-describedby={showError ? `${fieldName}-error` : undefined}
            />
            {showError && (
              <p
                id={`${fieldName}-error`}
                className="text-sm text-red-500 mt-1"
                role="alert"
              >
                {error}
              </p>
            )}
          </Field>
        );
      }}
    </form.Field>
  );
}
