"use client"

import * as React from "react"

const OPTIONS = ["10", "25", "50", "100"] as const

export function ProductSalesPageSizeForm({
  fromStr,
  toStr,
  pageSize,
}: {
  fromStr: string
  toStr: string
  pageSize: number
}) {
  const formRef = React.useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} method="get" className="flex items-center gap-2">
      <input type="hidden" name="from" value={fromStr} />
      <input type="hidden" name="to" value={toStr} />
      <input type="hidden" name="page" value="1" />
      <label htmlFor="product-sales-page-size" className="text-muted-foreground text-xs">
        Rows per page
      </label>
      <select
        id="product-sales-page-size"
        name="pageSize"
        defaultValue={String(pageSize)}
        className="border-input bg-background h-8 min-w-20 rounded-md border px-2 text-sm"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </form>
  )
}
