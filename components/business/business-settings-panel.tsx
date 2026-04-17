"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { BrandingLogoUpload } from "@/components/branding/branding-logo-upload"
import { patchBusinessDetails } from "@/lib/actions/branding"
import { updateOrganizationStoreName } from "@/lib/actions/organization"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { BrandColorFormField, TextareaFormField, TextFormField } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import {
  type BrandingSettingsFormValues,
  type BusinessSettingsBrandFormValues,
  businessSettingsBrandSchema,
  type BusinessSettingsIdentityFormValues,
  businessSettingsIdentitySchema,
  type BusinessSettingsOperationsFormValues,
  businessSettingsOperationsSchema,
  type BusinessSettingsReceiptFormValues,
  businessSettingsReceiptSchema,
  type BusinessSettingsSocialFormValues,
  businessSettingsSocialSchema,
  type BusinessSettingsWebContactFormValues,
  businessSettingsWebContactSchema,
  type OrganizationStoreNameFormValues,
  organizationStoreNameSchema,
} from "@/lib/schemas/app-forms"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

function trimOrNull(s: string | undefined) {
  const t = s?.trim()
  return t === "" || t == null ? null : t
}

function pickIdentity(i: BrandingSettingsFormValues): BusinessSettingsIdentityFormValues {
  return {
    displayName: i.displayName,
    tagline: i.tagline,
    legalName: i.legalName,
    taxIdentifier: i.taxIdentifier,
  }
}

function pickOperations(i: BrandingSettingsFormValues): BusinessSettingsOperationsFormValues {
  return {
    businessCategory: i.businessCategory,
    teamScaleBand: i.teamScaleBand,
    expectedGoLive: i.expectedGoLive,
  }
}

function pickBrand(i: BrandingSettingsFormValues): BusinessSettingsBrandFormValues {
  return {
    logoImageUrl: i.logoImageUrl,
    primaryColor: i.primaryColor,
    accentColor: i.accentColor,
  }
}

function pickReceipt(i: BrandingSettingsFormValues): BusinessSettingsReceiptFormValues {
  return {
    receiptHeaderText: i.receiptHeaderText,
    receiptFooterText: i.receiptFooterText,
  }
}

function pickWebContact(i: BrandingSettingsFormValues): BusinessSettingsWebContactFormValues {
  return {
    websiteUrl: i.websiteUrl,
    menuUrl: i.menuUrl,
    contactEmail: i.contactEmail,
    publicPhone: i.publicPhone,
  }
}

function pickSocial(i: BrandingSettingsFormValues): BusinessSettingsSocialFormValues {
  return {
    instagramUrl: i.instagramUrl,
    facebookUrl: i.facebookUrl,
    operatingHoursText: i.operatingHoursText,
  }
}

export function BusinessSettingsPanel({
  businessSlug,
  organizationName,
  initial,
}: {
  businessSlug: string
  organizationName: string
  initial: BrandingSettingsFormValues
}) {
  const router = useRouter()

  const orgForm = useForm<OrganizationStoreNameFormValues>({
    resolver: standardSchemaResolver(organizationStoreNameSchema),
    defaultValues: { organizationName },
  })

  const identityForm = useForm<BusinessSettingsIdentityFormValues>({
    resolver: standardSchemaResolver(businessSettingsIdentitySchema),
    defaultValues: pickIdentity(initial),
  })

  const operationsForm = useForm<BusinessSettingsOperationsFormValues>({
    resolver: standardSchemaResolver(businessSettingsOperationsSchema),
    defaultValues: pickOperations(initial),
  })

  const brandForm = useForm<BusinessSettingsBrandFormValues>({
    resolver: standardSchemaResolver(businessSettingsBrandSchema),
    defaultValues: pickBrand(initial),
  })

  const receiptForm = useForm<BusinessSettingsReceiptFormValues>({
    resolver: standardSchemaResolver(businessSettingsReceiptSchema),
    defaultValues: pickReceipt(initial),
  })

  const webContactForm = useForm<BusinessSettingsWebContactFormValues>({
    resolver: standardSchemaResolver(businessSettingsWebContactSchema),
    defaultValues: pickWebContact(initial),
  })

  const socialForm = useForm<BusinessSettingsSocialFormValues>({
    resolver: standardSchemaResolver(businessSettingsSocialSchema),
    defaultValues: pickSocial(initial),
  })

  return (
    <div className="space-y-6">
      <form
        onSubmit={orgForm.handleSubmit(async (values) => {
          try {
            await updateOrganizationStoreName(businessSlug, values.organizationName)
            router.refresh()
          } catch (err) {
            orgForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Store register</CardTitle>
            <CardDescription>Legal store name used across the business (better-auth organization name).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={orgForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={orgForm.control} name="organizationName" label="Store name" />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={orgForm.formState.isSubmitting}>
              {orgForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={identityForm.handleSubmit(async (v) => {
          try {
            await patchBusinessDetails(businessSlug, {
              displayName: trimOrNull(v.displayName),
              tagline: trimOrNull(v.tagline),
              legalName: trimOrNull(v.legalName),
              taxIdentifier: trimOrNull(v.taxIdentifier),
            })
            router.refresh()
          } catch (err) {
            identityForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Public identity and legal</CardTitle>
            <CardDescription>How you present the business and optional legal lines for tickets or forms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={identityForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField
                control={identityForm.control}
                name="displayName"
                label="Display name"
                description="Shown in the app shell and customer-facing surfaces."
              />
              <TextFormField control={identityForm.control} name="tagline" label="Tagline" />
              <TextFormField control={identityForm.control} name="legalName" label="Legal business name" />
              <TextFormField control={identityForm.control} name="taxIdentifier" label="Tax / VAT ID" />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={identityForm.formState.isSubmitting}>
              {identityForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={operationsForm.handleSubmit(async (v) => {
          try {
            await patchBusinessDetails(businessSlug, {
              businessCategory: trimOrNull(v.businessCategory),
              teamScaleBand: trimOrNull(v.teamScaleBand),
              expectedGoLive: trimOrNull(v.expectedGoLive),
            })
            router.refresh()
          } catch (err) {
            operationsForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Lightweight onboarding-style fields for your own planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={operationsForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={operationsForm.control} name="businessCategory" label="Business category" />
              <TextFormField control={operationsForm.control} name="teamScaleBand" label="Team scale" />
              <TextFormField control={operationsForm.control} name="expectedGoLive" label="Expected go-live" />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={operationsForm.formState.isSubmitting}>
              {operationsForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={brandForm.handleSubmit(async () => {
          try {
            await flushPendingImageUploads((_id, url) => {
              brandForm.setValue("logoImageUrl", url, { shouldValidate: true, shouldDirty: true })
            })
            const v = brandForm.getValues()
            await patchBusinessDetails(businessSlug, {
              logoImageUrl: trimOrNull(v.logoImageUrl),
              primaryColor: trimOrNull(v.primaryColor),
              accentColor: trimOrNull(v.accentColor),
            })
            router.refresh()
          } catch (err) {
            brandForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
            <CardDescription>Logo and theme colors for this organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={brandForm.formState.errors.root?.message} />
            <FieldGroup>
              <BrandingLogoUpload control={brandForm.control} setValue={brandForm.setValue} />
              <TextFormField
                control={brandForm.control}
                name="logoImageUrl"
                label="Logo image URL (optional)"
                type="text"
                placeholder="https://… or /uploads/…"
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <BrandColorFormField control={brandForm.control} name="primaryColor" label="Primary color" />
                <BrandColorFormField control={brandForm.control} name="accentColor" label="Accent color" />
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={brandForm.formState.isSubmitting}>
              {brandForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={receiptForm.handleSubmit(async (v) => {
          try {
            await patchBusinessDetails(businessSlug, {
              receiptHeaderText: trimOrNull(v.receiptHeaderText),
              receiptFooterText: trimOrNull(v.receiptFooterText),
            })
            router.refresh()
          } catch (err) {
            receiptForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>Optional extra copy for printed tickets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={receiptForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextareaFormField
                control={receiptForm.control}
                name="receiptHeaderText"
                label="Extra text at the top"
                className="min-h-[72px]"
              />
              <TextareaFormField
                control={receiptForm.control}
                name="receiptFooterText"
                label="Extra text at the bottom"
                className="min-h-[72px]"
              />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={receiptForm.formState.isSubmitting}>
              {receiptForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={webContactForm.handleSubmit(async (v) => {
          try {
            await patchBusinessDetails(businessSlug, {
              websiteUrl: trimOrNull(v.websiteUrl),
              menuUrl: trimOrNull(v.menuUrl),
              contactEmail: trimOrNull(v.contactEmail),
              publicPhone: trimOrNull(v.publicPhone),
            })
            router.refresh()
          } catch (err) {
            webContactForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Website and contact</CardTitle>
            <CardDescription>Public-facing links and contact lines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={webContactForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={webContactForm.control} name="websiteUrl" label="Website URL" type="url" />
              <TextFormField control={webContactForm.control} name="menuUrl" label="Menu URL" type="url" />
              <TextFormField control={webContactForm.control} name="contactEmail" label="Public contact email" type="email" />
              <TextFormField control={webContactForm.control} name="publicPhone" label="Public phone" />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={webContactForm.formState.isSubmitting}>
              {webContactForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form
        onSubmit={socialForm.handleSubmit(async (v) => {
          try {
            await patchBusinessDetails(businessSlug, {
              instagramUrl: trimOrNull(v.instagramUrl),
              facebookUrl: trimOrNull(v.facebookUrl),
              operatingHoursText: trimOrNull(v.operatingHoursText),
            })
            router.refresh()
          } catch (err) {
            socialForm.setError("root", {
              message: err instanceof Error ? err.message : "Could not save",
            })
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Social and hours</CardTitle>
            <CardDescription>Social profiles and opening hours text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={socialForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={socialForm.control} name="instagramUrl" label="Instagram URL" type="url" />
              <TextFormField control={socialForm.control} name="facebookUrl" label="Facebook URL" type="url" />
              <TextareaFormField
                control={socialForm.control}
                name="operatingHoursText"
                label="Opening hours"
                className="min-h-[72px]"
              />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={socialForm.formState.isSubmitting}>
              {socialForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
