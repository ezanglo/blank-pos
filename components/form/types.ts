import type { Control, FieldPath, FieldValues } from "react-hook-form"

export type FormFieldBaseProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
}
