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
import { Textarea } from "@/components/ui/textarea"

import type { FormFieldBaseProps } from "./types"

export function TextareaFormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...rest
}: FormFieldBaseProps<T> &
  Omit<React.ComponentProps<typeof Textarea>, "name" | "defaultValue" | "value" | "onChange">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <FieldContent>
            <Textarea id={String(name)} {...field} {...rest} />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}
