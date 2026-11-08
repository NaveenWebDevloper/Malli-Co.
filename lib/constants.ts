/**
 * Application-wide constants.
 * Pure constants with zero server/database dependencies (safe for client and server).
 */

export const FREE_SHIPPING_THRESHOLD_PAISE = 200000; // Free shipping on orders >= ₹2,000 (paise)
export const STANDARD_SHIPPING_PAISE = 15000; // Standard shipping ₹150.00 (paise)

export const COMPANY_GST_INFO = {
  legalName: "Malli & Co. Luxury Apparel Private Limited",
  brandName: "Malli & Co.",
  gstin: "36AAECM5544J1Z8",
  state: "Telangana",
  stateCode: "36",
  address: "Near Vikas Pre School, Govt High School Road, Mallampet, Bachupally, Hyderabad, Telangana - 500090",
  cin: "U18101TG2024PTC188990",
  email: "care@malliandco.com",
  phone: "+91 40 2355 8899",
  defaultHsn: "61091000", // Cotton apparel HSN
};

export const INDIAN_STATES = [
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Delhi",
  "Gujarat",
  "Kerala",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
  "Punjab",
  "Haryana",
  "Madhya Pradesh",
  "Goa",
];

export interface HeroSlideItem {
  id?: string;
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  order?: number;
  isActive?: boolean;
}

export const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [
  {
    src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=80&auto=format&fit=max",
    alt: "Handcrafted Italian Linen Suit",
    title: "The Heritage Blazer",
    subtitle: "Italian Linen 340 GSM",
    order: 0,
    isActive: true,
  },
  {
    src: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&q=80&auto=format&fit=max",
    alt: "Royal Raw Silk Bundi Jacket",
    title: "Raw Silk Bundi Jacket",
    subtitle: "Hand-Embroidered Zari",
    order: 1,
    isActive: true,
  },
  {
    src: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80&auto=format&fit=max",
    alt: "Fine Cotton Kurta",
    title: "Classic Ivory Kurta",
    subtitle: "Pure Egyptian Giza Cotton",
    order: 2,
    isActive: true,
  },
  {
    src: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80&auto=format&fit=max",
    alt: "Kids Celebration Sherwani",
    title: "Little Nawab Sherwani",
    subtitle: "Pure Chanderi Silk",
    order: 3,
    isActive: true,
  },
  {
    src: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1200&q=80&auto=format&fit=max",
    alt: "Charcoal Double-Breasted Suit",
    title: "Sartorial Charcoal Suit",
    subtitle: "Super 140s Merino Wool",
    order: 4,
    isActive: true,
  },
  {
    src: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1200&q=80&auto=format&fit=max",
    alt: "Kids Festive Kurta Set",
    title: "Saffron Festive Kurta",
    subtitle: "Mulmul Lined Handloom",
    order: 5,
    isActive: true,
  },
];

