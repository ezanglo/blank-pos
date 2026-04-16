"use client"

import { Controller, type FieldValues } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { FormFieldBaseProps } from "./types"

export function ColorFormField<T extends FieldValues>({
  control,
  name,
  label,
}: Pick<FormFieldBaseProps<T>, "control" | "name" | "label">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <FieldContent>
            <Input id={String(name)} type="color" className="h-10 px-1 py-1" {...field} />
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}
