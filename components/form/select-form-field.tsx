"use client"

import { Controller, type FieldValues } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import type { FormFieldBaseProps } from "./types"

export type SelectFormFieldOption = { value: string; label: string }

export function SelectFormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder,
  disabled,
  triggerClassName,
}: FormFieldBaseProps<T> & {
  options: SelectFormFieldOption[]
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <FieldContent>
            <Select
              name={field.name}
              value={
                field.value != null && String(field.value) !== "" ? String(field.value) : undefined
              }
              onValueChange={(value) => {
                field.onChange(value ?? "")
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={String(name)}
                ref={field.ref}
                aria-invalid={fieldState.invalid}
                className={cn("w-full min-w-0", triggerClassName)}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder={placeholder}>
                  {field.value != null && String(field.value) !== ""
                    ? (options.find((o) => o.value === String(field.value))?.label ??
                      String(field.value))
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  )
}
