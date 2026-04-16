"use client"

import * as React from "react"
import { Controller, type FieldValues } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { FormFieldBaseProps } from "./types"

export function TextFormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...rest
}: FormFieldBaseProps<T> &
  Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "value" | "onChange">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <FieldContent>
            <Input id={String(name)} {...field} {...rest} />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}
