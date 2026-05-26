export type TenantSettings = {
  id: number;
  companyName: string;
  logoUrl: string | null;
  billingEmail: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  taxId: string | null;
  vatNumber: string | null;
  defaultCurrency: string;
  paymentTerms: number;
  invoiceFooter: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateTenantSettingsRequest = {
  companyName: string;
  logoUrl?: string;
  billingEmail: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  taxId?: string;
  vatNumber?: string;
  defaultCurrency: string;
  paymentTerms: number;
  invoiceFooter?: string;
};
