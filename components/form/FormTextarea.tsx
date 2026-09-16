import { Field, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";
import { ObjectSchema } from "yup";

type FormTextareaProps = {
  form: any;
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  validationSchema?: ObjectSchema<any>;
  customValidator?: (value: any) => string | undefined;
  rows?: number;
  minLength?: number;
  maxLength?: number;
};

export function FormTextarea({
  form,
  name,
  label,
  placeholder,
  autoComplete,
  disabled = false,
  validationSchema,
  customValidator,
  rows = 4,
  minLength,
  maxLength,
}: FormTextareaProps) {
  const getValidators = () => {
    const validators: any = {};

    // 🔹 Validation personnalisée
    if (customValidator) {
      validators.onChange = ({ value }: { value: any }) => {
        const error = customValidator(value);
        return error ? error : undefined;
      };
    }
    // 🔹 Validation Yup
    else if (validationSchema) {
      validators.onChange = ({ value }: { value: any }) => {
        try {
          const validationObj = { [name]: value };
          validationSchema.validateSyncAt(name, validationObj);
          return undefined;
        } catch (err: any) {
          return err.message || "Erreur de validation";
        }
      };
    }

    // 🔹 Validation au blur
    if (validationSchema || customValidator) {
      validators.onBlur = validators.onChange;
    }

    return validators;
  };

  return (
    <form.Field name={name} validators={getValidators()}>
      {(field: any) => {
        const error =
          field.state.meta.errors.length > 0
            ? field.state.meta.errors[0]
            : undefined;

        const isTouched = field.state.meta.isTouched;
        const showError = isTouched && error;
        const fieldName = field.name as string;

        return (
          <Field className="gap-0.5">
            <FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
            <Textarea
              id={fieldName}
              name={fieldName}
              value={field.state.value}
              placeholder={placeholder}
              rows={rows}
              onChange={(e) => {
                field.handleChange(e.target.value);
                field.handleBlur();
              }}
              onBlur={field.handleBlur}
              className={showError ? "border-red-500" : ""}
              autoComplete={autoComplete}
              disabled={disabled}
              minLength={minLength}
              maxLength={maxLength}
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
