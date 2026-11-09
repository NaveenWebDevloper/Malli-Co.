/**
 * Malli & Co. Luxury Apparel — Size Guide & Measurement Directory
 * Accurate tailoring dimensions for Men's and Kids' clothing.
 */

export type MeasurementUnit = "in" | "cm";

export interface SizeMeasurementValue {
  in: string;
  cm: string;
}

export interface SizeGuideRow {
  size: string;
  aliases?: string[];
  measurements: Record<string, SizeMeasurementValue>;
}

export interface SizeGuideCategory {
  id: string;
  gender: "MEN" | "KIDS";
  title: string;
  subtitle: string;
  columns: { key: string; label: string }[];
  rows: SizeGuideRow[];
  fitTips: string[];
}

export const MEN_SIZE_CATEGORIES: SizeGuideCategory[] = [
  {
    id: "men-shirts",
    gender: "MEN",
    title: "Men's Tailored Shirts",
    subtitle: "Formal, Linen, and Casual Oxford Shirts with classic atelier tailoring.",
    columns: [
      { key: "size", label: "Size (Collar)" },
      { key: "chest", label: "To Fit Chest" },
      { key: "collar", label: "Collar Circumference" },
      { key: "shoulder", label: "Shoulder Width" },
      { key: "sleeve", label: "Sleeve Length" },
      { key: "length", label: "Shirt Length" },
    ],
    rows: [
      {
        size: "S (38)",
        aliases: ["S", "38"],
        measurements: {
          chest: { in: '38" – 40"', cm: "96 – 101 cm" },
          collar: { in: '15.0"', cm: "38.0 cm" },
          shoulder: { in: '17.5"', cm: "44.5 cm" },
          sleeve: { in: '33.0"', cm: "84.0 cm" },
          length: { in: '29.5"', cm: "75.0 cm" },
        },
      },
      {
        size: "M (40)",
        aliases: ["M", "40"],
        measurements: {
          chest: { in: '40" – 42"', cm: "101 – 106 cm" },
          collar: { in: '15.5"', cm: "39.5 cm" },
          shoulder: { in: '18.2"', cm: "46.5 cm" },
          sleeve: { in: '34.0"', cm: "86.5 cm" },
          length: { in: '30.0"', cm: "76.0 cm" },
        },
      },
      {
        size: "L (42)",
        aliases: ["L", "42"],
        measurements: {
          chest: { in: '42" – 44"', cm: "106 – 112 cm" },
          collar: { in: '16.5"', cm: "42.0 cm" },
          shoulder: { in: '19.0"', cm: "48.0 cm" },
          sleeve: { in: '35.0"', cm: "89.0 cm" },
          length: { in: '30.5"', cm: "77.5 cm" },
        },
      },
      {
        size: "XL (44)",
        aliases: ["XL", "44"],
        measurements: {
          chest: { in: '44" – 46"', cm: "112 – 117 cm" },
          collar: { in: '17.5"', cm: "44.5 cm" },
          shoulder: { in: '19.8"', cm: "50.0 cm" },
          sleeve: { in: '36.0"', cm: "91.5 cm" },
          length: { in: '31.0"', cm: "79.0 cm" },
        },
      },
      {
        size: "XXL (46)",
        aliases: ["XXL", "2XL", "46"],
        measurements: {
          chest: { in: '46" – 48"', cm: "117 – 122 cm" },
          collar: { in: '18.0"', cm: "46.0 cm" },
          shoulder: { in: '20.5"', cm: "52.0 cm" },
          sleeve: { in: '36.5"', cm: "93.0 cm" },
          length: { in: '31.5"', cm: "80.0 cm" },
        },
      },
    ],
    fitTips: [
      "Our tailored shirts provide comfortable movement across the chest while remaining clean at the waist.",
      "If you fall between collar sizes, select the larger size for business comfort with a tie.",
    ],
  },
  {
    id: "men-bottoms",
    gender: "MEN",
    title: "Men's Trousers, Chinos & Pants",
    subtitle: "Tailored cotton trousers, luxury chinos, and stretch-infused denim pants.",
    columns: [
      { key: "size", label: "Waist Size" },
      { key: "waist", label: "Actual Waist" },
      { key: "hip", label: "Hip Circumference" },
      { key: "thigh", label: "Thigh Width" },
      { key: "inseam", label: "Inseam Length" },
      { key: "outseam", label: "Total Length" },
    ],
    rows: [
      {
        size: "28",
        aliases: ["28", "28W"],
        measurements: {
          waist: { in: '28" – 29"', cm: "71 – 74 cm" },
          hip: { in: '36.0"', cm: "91.5 cm" },
          thigh: { in: '22.0"', cm: "56.0 cm" },
          inseam: { in: '32.0"', cm: "81.0 cm" },
          outseam: { in: '41.0"', cm: "104.0 cm" },
        },
      },
      {
        size: "30",
        aliases: ["30", "30W"],
        measurements: {
          waist: { in: '30" – 31"', cm: "76 – 79 cm" },
          hip: { in: '38.0"', cm: "96.5 cm" },
          thigh: { in: '23.0"', cm: "58.5 cm" },
          inseam: { in: '32.0"', cm: "81.0 cm" },
          outseam: { in: '41.5"', cm: "105.5 cm" },
        },
      },
      {
        size: "32",
        aliases: ["32", "32W"],
        measurements: {
          waist: { in: '32" – 33"', cm: "81 – 84 cm" },
          hip: { in: '40.0"', cm: "101.5 cm" },
          thigh: { in: '24.0"', cm: "61.0 cm" },
          inseam: { in: '32.0"', cm: "81.0 cm" },
          outseam: { in: '42.0"', cm: "106.5 cm" },
        },
      },
      {
        size: "34",
        aliases: ["34", "34W"],
        measurements: {
          waist: { in: '34" – 35"', cm: "86 – 89 cm" },
          hip: { in: '42.0"', cm: "106.5 cm" },
          thigh: { in: '25.0"', cm: "63.5 cm" },
          inseam: { in: '32.5"', cm: "82.5 cm" },
          outseam: { in: '42.5"', cm: "108.0 cm" },
        },
      },
      {
        size: "36",
        aliases: ["36", "36W"],
        measurements: {
          waist: { in: '36" – 37"', cm: "91 – 94 cm" },
          hip: { in: '44.0"', cm: "112.0 cm" },
          thigh: { in: '26.0"', cm: "66.0 cm" },
          inseam: { in: '32.5"', cm: "82.5 cm" },
          outseam: { in: '43.0"', cm: "109.0 cm" },
        },
      },
      {
        size: "38",
        aliases: ["38", "38W"],
        measurements: {
          waist: { in: '38" – 39"', cm: "96 – 99 cm" },
          hip: { in: '46.0"', cm: "117.0 cm" },
          thigh: { in: '27.0"', cm: "68.5 cm" },
          inseam: { in: '33.0"', cm: "84.0 cm" },
          outseam: { in: '43.5"', cm: "110.5 cm" },
        },
      },
      {
        size: "40",
        aliases: ["40", "40W"],
        measurements: {
          waist: { in: '40" – 41"', cm: "101 – 104 cm" },
          hip: { in: '48.0"', cm: "122.0 cm" },
          thigh: { in: '28.0"', cm: "71.0 cm" },
          inseam: { in: '33.0"', cm: "84.0 cm" },
          outseam: { in: '44.0"', cm: "112.0 cm" },
        },
      },
    ],
    fitTips: [
      "Order your natural waistline size. Trouser hems come pre-finished with a clean 1-inch break over shoes.",
      "Comfort stretch waistbands expand up to 1 inch for natural ease during seated dining or driving.",
    ],
  },
  {
    id: "men-tshirts",
    gender: "MEN",
    title: "Men's T-Shirts & Polos",
    subtitle: "Pima and Supima cotton crewnecks, textured knits, and tailored polo shirts.",
    columns: [
      { key: "size", label: "Size" },
      { key: "chest", label: "Chest Circumference" },
      { key: "length", label: "Front Body Length" },
      { key: "shoulder", label: "Shoulder Width" },
      { key: "sleeve", label: "Short Sleeve Length" },
    ],
    rows: [
      {
        size: "S",
        aliases: ["S", "Small"],
        measurements: {
          chest: { in: '38.0"', cm: "96.5 cm" },
          length: { in: '27.0"', cm: "68.5 cm" },
          shoulder: { in: '17.0"', cm: "43.0 cm" },
          sleeve: { in: '8.0"', cm: "20.5 cm" },
        },
      },
      {
        size: "M",
        aliases: ["M", "Medium"],
        measurements: {
          chest: { in: '40.0"', cm: "101.5 cm" },
          length: { in: '28.0"', cm: "71.0 cm" },
          shoulder: { in: '18.0"', cm: "45.5 cm" },
          sleeve: { in: '8.5"', cm: "21.5 cm" },
        },
      },
      {
        size: "L",
        aliases: ["L", "Large"],
        measurements: {
          chest: { in: '42.0"', cm: "106.5 cm" },
          length: { in: '29.0"', cm: "73.5 cm" },
          shoulder: { in: '19.0"', cm: "48.0 cm" },
          sleeve: { in: '9.0"', cm: "23.0 cm" },
        },
      },
      {
        size: "XL",
        aliases: ["XL", "Extra Large"],
        measurements: {
          chest: { in: '44.0"', cm: "112.0 cm" },
          length: { in: '30.0"', cm: "76.0 cm" },
          shoulder: { in: '20.0"', cm: "51.0 cm" },
          sleeve: { in: '9.5"', cm: "24.0 cm" },
        },
      },
      {
        size: "XXL",
        aliases: ["XXL", "2XL"],
        measurements: {
          chest: { in: '46.0"', cm: "117.0 cm" },
          length: { in: '31.0"', cm: "78.5 cm" },
          shoulder: { in: '21.0"', cm: "53.5 cm" },
          sleeve: { in: '10.0"', cm: "25.5 cm" },
        },
      },
    ],
    fitTips: [
      "Cut in a refined European modern fit. If you prefer a relaxed or streetwear drape, size up one notch.",
    ],
  },
  {
    id: "men-ethnic",
    gender: "MEN",
    title: "Men's Festive Kurtas & Ethnic Wear",
    subtitle: "Handcrafted pure silk, mulberry blend, and artisanal cotton celebratory kurtas.",
    columns: [
      { key: "size", label: "Size" },
      { key: "chest", label: "To Fit Chest" },
      { key: "length", label: "Kurta Length" },
      { key: "shoulder", label: "Shoulder" },
      { key: "sleeve", label: "Sleeve Length" },
    ],
    rows: [
      {
        size: "S (38)",
        aliases: ["S", "38"],
        measurements: {
          chest: { in: '38" – 40"', cm: "96 – 101 cm" },
          length: { in: '40.0"', cm: "101.5 cm" },
          shoulder: { in: '18.0"', cm: "45.5 cm" },
          sleeve: { in: '24.5"', cm: "62.0 cm" },
        },
      },
      {
        size: "M (40)",
        aliases: ["M", "40"],
        measurements: {
          chest: { in: '40" – 42"', cm: "101 – 106 cm" },
          length: { in: '42.0"', cm: "106.5 cm" },
          shoulder: { in: '18.5"', cm: "47.0 cm" },
          sleeve: { in: '25.0"', cm: "63.5 cm" },
        },
      },
      {
        size: "L (42)",
        aliases: ["L", "42"],
        measurements: {
          chest: { in: '42" – 44"', cm: "106 – 112 cm" },
          length: { in: '44.0"', cm: "112.0 cm" },
          shoulder: { in: '19.5"', cm: "49.5 cm" },
          sleeve: { in: '25.5"', cm: "65.0 cm" },
        },
      },
      {
        size: "XL (44)",
        aliases: ["XL", "44"],
        measurements: {
          chest: { in: '44" – 46"', cm: "112 – 117 cm" },
          length: { in: '45.0"', cm: "114.0 cm" },
          shoulder: { in: '20.0"', cm: "51.0 cm" },
          sleeve: { in: '26.0"', cm: "66.0 cm" },
        },
      },
      {
        size: "XXL (46)",
        aliases: ["XXL", "46"],
        measurements: {
          chest: { in: '46" – 48"', cm: "117 – 122 cm" },
          length: { in: '46.0"', cm: "117.0 cm" },
          shoulder: { in: '21.0"', cm: "53.5 cm" },
          sleeve: { in: '26.5"', cm: "67.5 cm" },
        },
      },
    ],
    fitTips: [
      "Ethnic kurtas feature traditional ease allowance (4 inches above actual chest measurement) for natural draping.",
    ],
  },
];

export const KIDS_SIZE_CATEGORIES: SizeGuideCategory[] = [
  {
    id: "kids-bottoms",
    gender: "KIDS",
    title: "Kids' Jeans, Joggers & Pants",
    subtitle: "Tailored denim jogger pants, trousers, and pull-on bottoms with comfort elastic.",
    columns: [
      { key: "size", label: "Size / Age" },
      { key: "height", label: "Child Height" },
      { key: "waist", label: "Waist (Relaxed - Stretch)" },
      { key: "hip", label: "Hip" },
      { key: "outseam", label: "Pant Length" },
    ],
    rows: [
      {
        size: "3-6M",
        aliases: ["3-6M", "3-6", "0-6M"],
        measurements: {
          height: { in: '24" – 27"', cm: "61 – 68 cm" },
          waist: { in: '17" – 18.5"', cm: "43 – 47 cm" },
          hip: { in: '19.0"', cm: "48.0 cm" },
          outseam: { in: '14.5"', cm: "37.0 cm" },
        },
      },
      {
        size: "6-9M",
        aliases: ["6-9M", "6-9"],
        measurements: {
          height: { in: '27" – 29"', cm: "68 – 74 cm" },
          waist: { in: '18" – 19.5"', cm: "46 – 49 cm" },
          hip: { in: '20.0"', cm: "51.0 cm" },
          outseam: { in: '16.0"', cm: "40.5 cm" },
        },
      },
      {
        size: "9-12M",
        aliases: ["9-12M", "9-12", "6-12M"],
        measurements: {
          height: { in: '29" – 31"', cm: "74 – 79 cm" },
          waist: { in: '18.5" – 20"', cm: "47 – 51 cm" },
          hip: { in: '21.0"', cm: "53.5 cm" },
          outseam: { in: '17.5"', cm: "44.5 cm" },
        },
      },
      {
        size: "1-2",
        aliases: ["1-2", "1-2Y", "12-18M", "18-24M", "1-2 Yrs"],
        measurements: {
          height: { in: '31" – 35"', cm: "79 – 89 cm" },
          waist: { in: '19" – 21"', cm: "48 – 53 cm" },
          hip: { in: '22.0"', cm: "56.0 cm" },
          outseam: { in: '19.5"', cm: "49.5 cm" },
        },
      },
      {
        size: "2-3",
        aliases: ["2-3", "2-3Y", "2-3 Yrs", "2T"],
        measurements: {
          height: { in: '35" – 38"', cm: "89 – 96 cm" },
          waist: { in: '20" – 22"', cm: "51 – 56 cm" },
          hip: { in: '23.0"', cm: "58.5 cm" },
          outseam: { in: '21.5"', cm: "54.5 cm" },
        },
      },
      {
        size: "3-4",
        aliases: ["3-4", "3-4Y", "3-4 Yrs", "3T"],
        measurements: {
          height: { in: '38" – 41"', cm: "96 – 104 cm" },
          waist: { in: '21" – 23"', cm: "53.5 – 58 cm" },
          hip: { in: '24.0"', cm: "61.0 cm" },
          outseam: { in: '23.5"', cm: "59.5 cm" },
        },
      },
      {
        size: "4-5",
        aliases: ["4-5", "4-5Y", "4-5 Yrs", "4T"],
        measurements: {
          height: { in: '41" – 44"', cm: "104 – 112 cm" },
          waist: { in: '21.5" – 23.5"', cm: "55 – 60 cm" },
          hip: { in: '25.0"', cm: "63.5 cm" },
          outseam: { in: '25.5"', cm: "65.0 cm" },
        },
      },
      {
        size: "5-6",
        aliases: ["5-6", "5-6Y", "5-6 Yrs", "5T"],
        measurements: {
          height: { in: '44" – 47"', cm: "112 – 119 cm" },
          waist: { in: '22" – 24"', cm: "56 – 61 cm" },
          hip: { in: '26.0"', cm: "66.0 cm" },
          outseam: { in: '27.5"', cm: "70.0 cm" },
        },
      },
      {
        size: "7-8",
        aliases: ["7-8", "7-8Y", "7-8 Yrs"],
        measurements: {
          height: { in: '48" – 51"', cm: "122 – 130 cm" },
          waist: { in: '23" – 25.5"', cm: "58.5 – 65 cm" },
          hip: { in: '28.0"', cm: "71.0 cm" },
          outseam: { in: '30.5"', cm: "77.5 cm" },
        },
      },
    ],
    fitTips: [
      "All kids' joggers and jeans feature ribbed or hidden inner elastic waistbands to easily accommodate diapers or growth spurts.",
      "If your child is between sizes or tall for their age, we recommend selecting the next size up for longer wear.",
    ],
  },
  {
    id: "kids-tops",
    gender: "KIDS",
    title: "Kids' Shirts, T-Shirts & Polos",
    subtitle: "Breathable pure cotton tees, tailored button-ups, and playful casual tops.",
    columns: [
      { key: "size", label: "Size / Age" },
      { key: "height", label: "Child Height" },
      { key: "chest", label: "Chest" },
      { key: "shoulder", label: "Shoulder" },
      { key: "length", label: "Top Length" },
    ],
    rows: [
      {
        size: "3-6M",
        aliases: ["3-6M", "3-6"],
        measurements: {
          height: { in: '24" – 27"', cm: "61 – 68 cm" },
          chest: { in: '18.0"', cm: "46.0 cm" },
          shoulder: { in: '7.5"', cm: "19.0 cm" },
          length: { in: '11.5"', cm: "29.0 cm" },
        },
      },
      {
        size: "6-9M",
        aliases: ["6-9M", "6-9"],
        measurements: {
          height: { in: '27" – 29"', cm: "68 – 74 cm" },
          chest: { in: '19.0"', cm: "48.0 cm" },
          shoulder: { in: '8.0"', cm: "20.0 cm" },
          length: { in: '12.5"', cm: "32.0 cm" },
        },
      },
      {
        size: "9-12M",
        aliases: ["9-12M", "9-12"],
        measurements: {
          height: { in: '29" – 31"', cm: "74 – 79 cm" },
          chest: { in: '20.0"', cm: "51.0 cm" },
          shoulder: { in: '8.5"', cm: "21.5 cm" },
          length: { in: '13.5"', cm: "34.0 cm" },
        },
      },
      {
        size: "1-2",
        aliases: ["1-2", "1-2Y", "12-24M"],
        measurements: {
          height: { in: '31" – 35"', cm: "79 – 89 cm" },
          chest: { in: '21.0"', cm: "53.5 cm" },
          shoulder: { in: '9.0"', cm: "23.0 cm" },
          length: { in: '15.0"', cm: "38.0 cm" },
        },
      },
      {
        size: "2-3",
        aliases: ["2-3", "2-3Y"],
        measurements: {
          height: { in: '35" – 38"', cm: "89 – 96 cm" },
          chest: { in: '22.0"', cm: "56.0 cm" },
          shoulder: { in: '9.5"', cm: "24.0 cm" },
          length: { in: '16.0"', cm: "40.5 cm" },
        },
      },
      {
        size: "3-4",
        aliases: ["3-4", "3-4Y"],
        measurements: {
          height: { in: '38" – 41"', cm: "96 – 104 cm" },
          chest: { in: '23.0"', cm: "58.5 cm" },
          shoulder: { in: '10.0"', cm: "25.5 cm" },
          length: { in: '17.0"', cm: "43.0 cm" },
        },
      },
      {
        size: "4-5",
        aliases: ["4-5", "4-5Y"],
        measurements: {
          height: { in: '41" – 44"', cm: "104 – 112 cm" },
          chest: { in: '24.0"', cm: "61.0 cm" },
          shoulder: { in: '10.5"', cm: "26.5 cm" },
          length: { in: '18.0"', cm: "45.5 cm" },
        },
      },
      {
        size: "5-6",
        aliases: ["5-6", "5-6Y"],
        measurements: {
          height: { in: '44" – 47"', cm: "112 – 119 cm" },
          chest: { in: '25.0"', cm: "63.5 cm" },
          shoulder: { in: '11.0"', cm: "28.0 cm" },
          length: { in: '19.0"', cm: "48.0 cm" },
        },
      },
      {
        size: "7-8",
        aliases: ["7-8", "7-8Y"],
        measurements: {
          height: { in: '48" – 51"', cm: "122 – 130 cm" },
          chest: { in: '27.0"', cm: "68.5 cm" },
          shoulder: { in: '12.0"', cm: "30.5 cm" },
          length: { in: '21.0"', cm: "53.0 cm" },
        },
      },
    ],
    fitTips: [
      "Top length is designed to sit comfortably at the hip for easy tucking or casual layering.",
    ],
  },
  {
    id: "kids-ethnic",
    gender: "KIDS",
    title: "Kids' Festive Wear & Kurtas",
    subtitle: "Celebratory kurta sets, festive jackets, and ethnic silhouettes for boys.",
    columns: [
      { key: "size", label: "Size / Age" },
      { key: "height", label: "Child Height" },
      { key: "chest", label: "Kurta Chest" },
      { key: "kurtaLength", label: "Kurta Length" },
      { key: "pajamaLength", label: "Pajama / Dhoti Length" },
    ],
    rows: [
      {
        size: "3-6M",
        aliases: ["3-6M", "3-6"],
        measurements: {
          height: { in: '24" – 27"', cm: "61 – 68 cm" },
          chest: { in: '19.0"', cm: "48.0 cm" },
          kurtaLength: { in: '15.0"', cm: "38.0 cm" },
          pajamaLength: { in: '14.0"', cm: "35.5 cm" },
        },
      },
      {
        size: "6-12M",
        aliases: ["6-12M", "6-9M", "9-12M"],
        measurements: {
          height: { in: '27" – 31"', cm: "68 – 79 cm" },
          chest: { in: '21.0"', cm: "53.5 cm" },
          kurtaLength: { in: '17.0"', cm: "43.0 cm" },
          pajamaLength: { in: '16.0"', cm: "40.5 cm" },
        },
      },
      {
        size: "1-2",
        aliases: ["1-2", "1-2Y", "12-24M"],
        measurements: {
          height: { in: '31" – 35"', cm: "79 – 89 cm" },
          chest: { in: '23.0"', cm: "58.5 cm" },
          kurtaLength: { in: '19.0"', cm: "48.0 cm" },
          pajamaLength: { in: '19.0"', cm: "48.0 cm" },
        },
      },
      {
        size: "2-3",
        aliases: ["2-3", "2-3Y"],
        measurements: {
          height: { in: '35" – 38"', cm: "89 – 96 cm" },
          chest: { in: '24.0"', cm: "61.0 cm" },
          kurtaLength: { in: '21.0"', cm: "53.5 cm" },
          pajamaLength: { in: '21.0"', cm: "53.5 cm" },
        },
      },
      {
        size: "3-4",
        aliases: ["3-4", "3-4Y"],
        measurements: {
          height: { in: '38" – 41"', cm: "96 – 104 cm" },
          chest: { in: '25.0"', cm: "63.5 cm" },
          kurtaLength: { in: '23.0"', cm: "58.5 cm" },
          pajamaLength: { in: '23.0"', cm: "58.5 cm" },
        },
      },
      {
        size: "4-5",
        aliases: ["4-5", "4-5Y"],
        measurements: {
          height: { in: '41" – 44"', cm: "104 – 112 cm" },
          chest: { in: '26.0"', cm: "66.0 cm" },
          kurtaLength: { in: '25.0"', cm: "63.5 cm" },
          pajamaLength: { in: '25.0"', cm: "63.5 cm" },
        },
      },
      {
        size: "5-6",
        aliases: ["5-6", "5-6Y"],
        measurements: {
          height: { in: '44" – 47"', cm: "112 – 119 cm" },
          chest: { in: '28.0"', cm: "71.0 cm" },
          kurtaLength: { in: '27.0"', cm: "68.5 cm" },
          pajamaLength: { in: '27.0"', cm: "68.5 cm" },
        },
      },
      {
        size: "7-8",
        aliases: ["7-8", "7-8Y"],
        measurements: {
          height: { in: '48" – 51"', cm: "122 – 130 cm" },
          chest: { in: '30.0"', cm: "76.0 cm" },
          kurtaLength: { in: '29.0"', cm: "73.5 cm" },
          pajamaLength: { in: '30.0"', cm: "76.0 cm" },
        },
      },
    ],
    fitTips: [
      "Festive garments are lined with 100% soft mulmul cotton to prevent itching or irritation against young skin.",
    ],
  },
];

/**
 * Automatically detects the most relevant size chart category based on product details.
 */
export function detectInitialCategory(product: {
  gender?: string;
  name?: string;
  category?: { name?: string; slug?: string };
}): { gender: "MEN" | "KIDS"; categoryId: string } {
  const isKids =
    product.gender === "KIDS" ||
    (product.name && /kids|baby|toddler|boy|infant/i.test(product.name)) ||
    (product.category?.name && /kids/i.test(product.category.name)) ||
    (product.category?.slug && /kids/i.test(product.category.slug));

  const text = `${product.name || ""} ${product.category?.name || ""} ${product.category?.slug || ""}`.toLowerCase();

  if (isKids) {
    if (
      /pant|jean|jogger|bottom|trouser|short|denim/i.test(text)
    ) {
      return { gender: "KIDS", categoryId: "kids-bottoms" };
    }
    if (/festive|kurta|ethnic|dhoti|pajama|sherwani/i.test(text)) {
      return { gender: "KIDS", categoryId: "kids-ethnic" };
    }
    return { gender: "KIDS", categoryId: "kids-tops" };
  } else {
    if (
      /pant|jean|trouser|chino|bottom|cotton pants|formal pant/i.test(text)
    ) {
      return { gender: "MEN", categoryId: "men-bottoms" };
    }
    if (/t-shirt|tshirt|tee|polo|crewneck/i.test(text)) {
      return { gender: "MEN", categoryId: "men-tshirts" };
    }
    if (/kurta|festive|ethnic|sherwani|bandhgala/i.test(text)) {
      return { gender: "MEN", categoryId: "men-ethnic" };
    }
    return { gender: "MEN", categoryId: "men-shirts" };
  }
}
