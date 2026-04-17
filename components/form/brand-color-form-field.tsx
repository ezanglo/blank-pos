"use client"

import * as React from "react"
import { Controller, type FieldValues } from "react-hook-form"
import tailwindColors from "tailwindcss/colors"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BRAND_TAILWIND_FAMILIES,
  BRAND_TAILWIND_SHADES,
  resolveBrandColorToCss,
} from "@/lib/brand-color"
import { cn } from "@/lib/utils"

import type { FormFieldBaseProps } from "./types"

function shadeCss(family: string, shade: string): string | undefined {
  const raw = (tailwindColors as unknown as Record<string, unknown>)[family]
  if (typeof raw !== "object" || raw === null) return undefined
  const v = (raw as Record<string, unknown>)[shade]
  return typeof v === "string" ? v : undefined
}

export function BrandColorFormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: FormFieldBaseProps<T>) {
  const [open, setOpen] = React.useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const preview = resolveBrandColorToCss(field.value)
        const token = typeof field.value === "string" ? field.value.trim() : ""

        return (
          <Popover open={open} onOpenChange={setOpen}>
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
              <FieldContent className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 shrink-0 rounded-md border-2 p-0"
                        aria-expanded={open}
                        aria-haspopup="dialog"
                        aria-label={`${label}: open color palette`}
                      />
                    }
                  >
                    <span
                      className="size-7 rounded-sm border border-black/10 shadow-inner dark:border-white/15"
                      style={{
                        backgroundColor: preview ?? "transparent",
                        backgroundImage: preview
                          ? undefined
                          : "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                        backgroundSize: preview ? undefined : "8px 8px",
                        backgroundPosition: preview
                          ? undefined
                          : "0 0, 0 4px, 4px -4px, -4px 0px",
                      }}
                    />
                  </PopoverTrigger>
                  <Input
                    id={String(name)}
                    {...field}
                    value={field.value ?? ""}
                    placeholder="red-500 or #171717"
                    className="min-w-0 max-w-[220px] flex-1 font-mono text-sm sm:max-w-[260px]"
                    autoComplete="off"
                  />
                  {token ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground"
                      aria-label={`Clear ${label}`}
                      onClick={() => {
                        field.onChange("")
                        setOpen(false)
                      }}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className={cn(
                    "w-[min(22rem,calc(100vw-1.5rem))] max-w-none gap-0 p-2 shadow-md",
                    "data-open:zoom-in-95",
                  )}
                >
                  <PopoverTitle className="sr-only">{label} — Tailwind palette</PopoverTitle>
                  <div
                    role="grid"
                    aria-label={`${label} Tailwind palette`}
                    className="max-h-[min(16rem,45vh)] overflow-auto"
                  >
                    <div
                      className="grid w-max min-w-full gap-px"
                      style={{
                        gridTemplateColumns: `minmax(3.25rem,auto) repeat(${BRAND_TAILWIND_SHADES.length}, minmax(0,1.1rem))`,
                      }}
                    >
                      <div />
                      {BRAND_TAILWIND_SHADES.map((s) => (
                        <div
                          key={s}
                          className="pb-0.5 text-center text-[9px] font-medium leading-none text-muted-foreground"
                        >
                          {s}
                        </div>
                      ))}
                      {BRAND_TAILWIND_FAMILIES.map((family) => (
                        <React.Fragment key={family}>
                          <div className="flex items-center pr-0.5 text-[10px] font-medium capitalize leading-none text-muted-foreground">
                            {family}
                          </div>
                          {BRAND_TAILWIND_SHADES.map((shade) => {
                            const css = shadeCss(family, shade)
                            const t = `${family}-${shade}`
                            const selected = token === t
                            return (
                              <button
                                key={t}
                                type="button"
                                role="gridcell"
                                title={t}
                                aria-label={`${label} ${t}`}
                                aria-selected={selected}
                                disabled={!css}
                                className={cn(
                                  "size-4 shrink-0 rounded-[3px] border transition-transform hover:z-10 hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-20",
                                  selected
                                    ? "border-primary ring-1 ring-primary ring-offset-1 ring-offset-popover"
                                    : "border-transparent hover:border-border",
                                )}
                                style={{ backgroundColor: css ?? "transparent" }}
                                onClick={() => {
                                  field.onChange(t)
                                  setOpen(false)
                                }}
                              />
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </PopoverContent>

                {description ? <FieldDescription>{description}</FieldDescription> : null}
                <FieldError errors={[fieldState.error]} />
              </FieldContent>
            </Field>
          </Popover>
        )
      }}
    />
  )
}
