/**
 * Central brand + behaviour configuration for the Auto Glass Quote Wizard.
 * Edit this file to rebrand or re-scope the wizard — no component changes needed.
 */

export interface QuoteConfig {
  businessName: string;
  shortName: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: {
    line1: string;
    city: string;
    province: string;
    postalCode: string;
    full: string;
    mapUrl: string;
  };
  primaryServiceArea: string;
  insurerName: string;
  responseExpectation: string;
  /** Optional. Leave empty to avoid promising a response time. */
  responseTime: string;
  features: {
    inShopService: boolean;
    mobileService: boolean;
    appointmentRequests: boolean;
    instantPricing: boolean;
  };
  uploads: {
    maxFiles: number;
    maxFileSizeMb: number;
    acceptedTypes: string[];
    acceptAttribute: string;
  };
  /** Communities covered by mobile service. Used for a soft advisory only. */
  mobileServiceArea: string[];
  storageKey: string;
  websiteUrl: string;
}

export const quoteConfig: QuoteConfig = {
  businessName: "Riverbend Autoglass Inc.",
  shortName: "Riverbend Autoglass",
  phone: "+1 639-525-9707",
  phoneHref: "tel:+16395259707",
  email: "sales@riverbendautoglass.ca",
  address: {
    line1: "118 Barnes Ave #203",
    city: "Saskatoon",
    province: "SK",
    postalCode: "S7M 5T2",
    full: "118 Barnes Ave #203, Saskatoon, SK S7M 5T2",
    mapUrl: "https://maps.google.com/?q=118+Barnes+Ave+%23203+Saskatoon+SK+S7M+5T2",
  },
  primaryServiceArea: "Saskatoon, Saskatchewan",
  insurerName: "SGI",
  responseExpectation: "Our team will review your request and contact you shortly.",
  responseTime: "",
  features: {
    inShopService: true,
    mobileService: true,
    appointmentRequests: true,
    instantPricing: false,
  },
  uploads: {
    maxFiles: 6,
    maxFileSizeMb: 10,
    acceptedTypes: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
    acceptAttribute: "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif",
  },
  mobileServiceArea: [
    "Saskatoon",
    "Warman",
    "Martensville",
    "Osler",
    "Dalmeny",
    "Clavet",
    "Delisle",
    "Vanscoy",
    "Langham",
    "Allan",
    "Aberdeen",
    "Hague",
    "Rosthern",
  ],
  storageKey: "riverbend.quote.wizard.v1",
  websiteUrl: "/",
};

export const isInMobileArea = (city?: string) =>
  !!city && quoteConfig.mobileServiceArea.some((c) => c.toLowerCase() === city.trim().toLowerCase());
