export class TenantSettingsResponseDto {
  id!: number;
  companyName!: string;
  logoUrl!: string | null;
  billingEmail!: string;
  phone!: string | null;
  addressLine1!: string;
  addressLine2!: string | null;
  city!: string;
  postalCode!: string;
  country!: string;
  taxId!: string | null;
  vatNumber!: string | null;
  defaultCurrency!: string;
  paymentTerms!: number;
  invoiceFooter!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
