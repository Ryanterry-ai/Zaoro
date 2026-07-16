import { Category, Product, Brand, Review } from "./types";

export const BRANDS: Brand[] = [
  {
    id: "on",
    name: "Optimum Nutrition",
    logo: "ON",
    description: "The world's #1 selling whey protein brand, known for uncompromised gold standard quality for over 35 years.",
    origin: "USA",
    specialty: "Premium Whey Proteins & Amino Acids"
  },
  {
    id: "muscleblaze",
    name: "MuscleBlaze",
    logo: "MB",
    description: "India's leading sports nutrition brand, pioneering clinically-tested formulations optimized for the Indian body.",
    origin: "India",
    specialty: "Clinically Tested Biozyme Proteins & Performance Supplements"
  },
  {
    id: "kapiva",
    name: "Kapiva",
    logo: "Kapiva",
    description: "Blending ancient Ayurvedic wisdom with modern food science to create highly authentic, original-source health solutions.",
    origin: "India",
    specialty: "Pure Himalayan Shilajit, Cold-Pressed Juices & Herbal Ghee"
  },
  {
    id: "himalayan_organics",
    name: "Himalayan Organics",
    logo: "HO",
    description: "Pioneering highly effective, certified organic and completely natural plant-based daily vitamins and supplements.",
    origin: "India",
    specialty: "Organic Vitamins, Herb Extracts & Wellness Superfoods"
  },
  {
    id: "asitis",
    name: "Asitis Nutrition",
    logo: "ASITIS",
    description: "Empowering fitness enthusiasts with pure, raw, unflavored, and zero-additive single-ingredient supplements in their natural form.",
    origin: "India",
    specialty: "Raw Unflavored Whey, Creatine & Single Ingredients"
  },
  {
    id: "carbamide_forte",
    name: "Carbamide Forte",
    logo: "CF",
    description: "Providing maximum-potency and highly absorbable vitamins, minerals, and tablets for daily nutrition and specialized health.",
    origin: "India",
    specialty: "High-Strength Daily Multivitamins, Fish Oils & Probiotics"
  }
];

export const PRODUCTS: Product[] = [
  {
    id: "on-gold-whey-2lb",
    name: "Gold Standard 100% Whey Protein",
    brand: "Optimum Nutrition",
    category: Category.PROTEIN,
    price: 3699,
    originalPrice: 4299,
    rating: 4.8,
    reviewsCount: 1420,
    image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&q=80&w=600",
    description: "The world's most trusted whey protein powder. Each serving delivers 24g of high-quality whey protein, primarily from Whey Protein Isolate (WPI), with 5.5g of naturally occurring BCAAs to support muscle recovery and building.",
    isVeg: true,
    servings: 29,
    size: "907 g (2 lbs)",
    flavors: ["Double Rich Chocolate", "Delicious Strawberry", "Vanilla Ice Cream"],
    benefits: [
      "24g Whey Protein per serving to build and maintain muscle",
      "5.5g of naturally occurring Branched Chain Amino Acids (BCAAs) to support endurance and recovery",
      "Gluten-free and certified banned-substance tested for peace of mind"
    ],
    authenticityDetails: "Features a unique 6-digit verification code under the scratch label, verifiable via ON Authenticate app or SMS to 57575.",
    isBestseller: true
  },
  {
    id: "mb-biozyme-whey-2kg",
    name: "Biozyme Performance Whey Protein",
    brand: "MuscleBlaze",
    category: Category.PROTEIN,
    price: 4999,
    originalPrice: 5899,
    rating: 4.7,
    reviewsCount: 940,
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600",
    description: "India's first clinically tested Whey Protein, customized for Indian bodies. Features Enhanced Absorption Formula (EAF®) which delivers 50% higher protein absorption and 60% higher BCAA absorption, significantly reducing bloating.",
    isVeg: true,
    servings: 60,
    size: "2 kg (4.4 lbs)",
    flavors: ["Rich Chocolate", "Cafe Mocha", "Mango Delight"],
    benefits: [
      "Clinical study-proven 50% higher protein absorption",
      "EAF® minimizes digestive discomfort and bloating common in Indian diets",
      "Packs 25g protein, 11.75g EAA, and 5.51g BCAA per serving"
    ],
    authenticityDetails: "Includes a unique 3D hologram and scratch code. Verify via MuscleBlaze website or by sending 'MB <code_here>' to 55454.",
    isBestseller: true
  },
  {
    id: "kapiva-shilajit-resin-20g",
    name: "Pure Himalayan Shilajit Gold Resin",
    brand: "Kapiva",
    category: Category.AYURVEDA,
    price: 1199,
    originalPrice: 1499,
    rating: 4.6,
    reviewsCount: 1180,
    image: "https://images.unsplash.com/photo-1611070973770-b1a672610164?auto=format&fit=crop&q=80&w=600",
    description: "100% pure Ayurvedic Shilajit resin sourced from high-altitude spots in the Himalayas. Purified using traditional Shodhana processes and enriched with 24k Gold Bhasma. Naturally rich in Fulvic Acid (>60%) to dramatically boost stamina, power, and cellular rejuvenation.",
    isVeg: true,
    servings: 40,
    size: "20 g",
    benefits: [
      "Boosts testosterone levels, stamina, and physical strength naturally",
      "Rich in Fulvic acid which improves nutrient absorption in cells",
      "Infused with 24K Gold to enhance metabolic activity and energy"
    ],
    authenticityDetails: "Lab-tested for heavy metals and certified organic. Includes a QR code linking to a batch-specific NABL lab report.",
    isBestseller: true,
    isNew: true
  },
  {
    id: "asitis-creatine-250g",
    name: "Pure Creatine Monohydrate",
    brand: "Asitis Nutrition",
    category: Category.PERFORMANCE,
    price: 649,
    originalPrice: 999,
    rating: 4.6,
    reviewsCount: 2280,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600",
    description: "100% pure micronized creatine monohydrate with zero additives, fillers, colors, or flavors. An ideal supplement for athletes and bodybuilders looking to maximize raw power, high-intensity strength, and cellular hydration.",
    isVeg: true,
    servings: 83,
    size: "250 g",
    flavors: ["Unflavored"],
    benefits: [
      "Increases ATP synthesis to fuel short bursts of heavy power",
      "Micronized for quick and easy solubility in shakes or water",
      "Increases muscle cell volume by retaining water in muscles"
    ],
    authenticityDetails: "Comes in a tamper-proof pouch with a unique verification scratch code. Validate through AS-IT-IS mobile app.",
    isBestseller: true
  },
  {
    id: "himalayan-ashwagandha-60",
    name: "Organic Ashwagandha KSM-66 (1000mg)",
    brand: "Himalayan Organics",
    category: Category.AYURVEDA,
    price: 499,
    originalPrice: 799,
    rating: 4.5,
    reviewsCount: 380,
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=600",
    description: "Premium KSM-66 Ashwagandha extract, the highest concentration full-spectrum root extract. Acts as a powerful adaptogen that helps the body manage physiological stress, anxiety, and boosts physical endurance, muscle recovery, and sleep quality.",
    isVeg: true,
    servings: 60,
    size: "60 Veg Capsules",
    benefits: [
      "Clinically proven to reduce cortisol levels (stress hormone) by up to 27%",
      "Enhances muscle strength and supports natural testosterone synthesis",
      "Promotes deep, restful sleep cycles and improves memory focus"
    ],
    authenticityDetails: "NABL certified lab-tested, non-GMO, and gelatin-free capsules. Unique scan-to-verify code on the bottle label.",
    isNew: true
  },
  {
    id: "cf-multivitamin-men-180",
    name: "Multivitamin For Men - 45 Ingredients",
    brand: "Carbamide Forte",
    category: Category.WELLNESS,
    price: 649,
    originalPrice: 1100,
    rating: 4.4,
    reviewsCount: 860,
    image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=600",
    description: "A supercharged multivitamin complex with 45 critical vitamins, minerals, superfoods, and amino acids custom-built for men's active lifestyle. Meets 100% RDA of most micronutrients to supercharge daily immunity, brain health, joint flexibility, and muscle power.",
    isVeg: true,
    servings: 180,
    size: "180 Tablets",
    benefits: [
      "45 active key ingredients to support complete male vitality",
      "Antioxidant & Superfood blends for optimal daily detox and digestion",
      "Highly bioavailable joint and bone support ingredients"
    ],
    authenticityDetails: "Manufactured in a GMP, ISO & FSSAI certified facility. Scratch-and-verify security code present on the cap seal."
  },
  {
    id: "cf-fishoil-1000",
    name: "Double Strength Omega-3 Fish Oil (1000mg)",
    brand: "Carbamide Forte",
    category: Category.WELLNESS,
    price: 549,
    originalPrice: 899,
    rating: 4.5,
    reviewsCount: 610,
    image: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&q=80&w=600",
    description: "Double strength fish oil softgels containing 600mg of active Omega-3 fatty acids (360mg EPA and 240mg DHA) per softgel. Sourced from deep-sea wild fish, molecularly distilled to remove heavy metals and mercury, featuring an enterically coated shell to prevent fishy aftertaste.",
    isVeg: false, // Gelatin capsule and fish oil derived
    servings: 60,
    size: "60 Softgels",
    benefits: [
      "EPA & DHA support healthy cardiovascular function and blood flow",
      "Reduces joint inflammation and improves flexibility",
      "Enhances cognitive function, memory, and eye wellness"
    ],
    authenticityDetails: "Mercury-free purification tested. Scratch-off authentication code verifiable via Carbamide Forte website."
  },
  {
    id: "mb-gainer-xxl-1kg",
    name: "Super Gainer XXL Mass Gainer",
    brand: "MuscleBlaze",
    category: Category.WEIGHT_MGMT,
    price: 1399,
    originalPrice: 1749,
    rating: 4.5,
    reviewsCount: 420,
    image: "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&q=80&w=600",
    description: "A high-calorie muscle-gaining formula engineered for hardgainers. Delivers a robust 1:5 ratio of proteins to carbs. Enriched with 27 vital vitamins and minerals, and digestive enzymes (DigeZyme®) for maximum absorption without stomach bloating.",
    isVeg: true,
    servings: 10,
    size: "1 kg (2.2 lbs)",
    flavors: ["Chocolate", "Banana Cream", "Kulfi"],
    benefits: [
      "Massive 374 calories and 15g protein per serving (with milk)",
      "Packed with fast and slow carbs to replenish glycogen stores",
      "DigeZyme® digestive enzyme blend prevents indigestion and bloating"
    ],
    authenticityDetails: "Features double-seal caps with verified authentication codes. Validate via MuscleBlaze security app."
  },
  {
    id: "on-creatine-250g",
    name: "Micronized Creatine Powder (Creapure)",
    brand: "Optimum Nutrition",
    category: Category.PERFORMANCE,
    price: 1199,
    originalPrice: 1499,
    rating: 4.8,
    reviewsCount: 780,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600",
    description: "Made with 100% pure, Creapure® micronized creatine monohydrate. Recognized as the gold standard of creatine purity globally. Supports muscle endurance, explosive raw power, lean mass gains, and aids rapid post-workout muscle cell recovery.",
    isVeg: true,
    servings: 83,
    size: "250 g",
    flavors: ["Unflavored"],
    benefits: [
      "100% Creapure® - the purest pharmaceutical grade creatine monohydrate available",
      "Micronized to stay suspended in liquids longer for instant drinking",
      "Supercharges ATP levels to boost short burst strength and performance"
    ],
    authenticityDetails: "Unique scratch coupon inside the pack with ON Authenticate serial code verifiable online."
  },
  {
    id: "kapiva-amla-juice-1l",
    name: "Organic Wild Amla Juice (Cold-Pressed)",
    brand: "Kapiva",
    category: Category.AYURVEDA,
    price: 320,
    originalPrice: 399,
    rating: 4.5,
    reviewsCount: 890,
    image: "https://images.unsplash.com/photo-1610970881699-44a5587caa90?auto=format&fit=crop&q=80&w=600",
    description: "Cold-pressed wild Amla juice made strictly from small, wild amlas sourced from the dense forests of Pratapgarh, UP. Squeezed within 24 hours of harvesting, containing 30% more Vitamin C than cultivated hybrid amlas. Absolute zero added sugar, water, or artificial flavor.",
    isVeg: true,
    servings: 33,
    size: "1 Litre",
    benefits: [
      "Rich source of natural Vitamin C and antioxidants for stellar immunity",
      "Purifies blood and naturally enhances digestive metabolism",
      "Improves hair follicle health and boosts natural skin glow"
    ],
    authenticityDetails: "USDA Organic, GMP, and ISO certified. Lab test reports accessible via batch number printed on the back.",
    isNew: true
  },
  {
    id: "mtech-nitrotech-whey-4lb",
    name: "NitroTech Pure Whey Gold",
    brand: "MuscleTech",
    category: Category.PROTEIN,
    price: 6499,
    originalPrice: 7999,
    rating: 4.7,
    reviewsCount: 530,
    image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&q=80&w=600",
    description: "Features whey protein peptides and isolates to provide rapid digestion, absorption, and highly efficient nitrogen delivery to muscles. Each serving packs 24g of ultra-filtered whey protein, 5.5g of BCAAs, and 4g of glutamine for professional-tier muscle recovery.",
    isVeg: true,
    servings: 55,
    size: "1.8 kg (4 lbs)",
    flavors: ["Double Rich Chocolate", "French Vanilla Cream"],
    benefits: [
      "Micro-filtered whey peptides and isolates for maximum bio-availability",
      "Cold-filtered processing to retain crucial immuno-globulins",
      "Gluten-free formula with no active fillers or spiking agents"
    ],
    authenticityDetails: "Verify using the official MuscleTech 'Verify App' by scanning the unique QR code on the bottle neck."
  },
  {
    id: "himalayan-wheatgrass-200g",
    name: "Organic Wheatgrass Detox Powder",
    brand: "Himalayan Organics",
    category: Category.WELLNESS,
    price: 449,
    originalPrice: 649,
    rating: 4.3,
    reviewsCount: 160,
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=600",
    description: "100% natural and certified organic wheatgrass powder harvested at the peak of nutrient density. Dehydrated slowly at low temperatures to lock in rich levels of chlorophyll, vitamins, minerals, amino acids, and dietary fiber. Superb for daily alkaline detox.",
    isVeg: true,
    servings: 40,
    size: "200 g",
    benefits: [
      "Excellent alkaline detoxifier that helps balance blood pH levels",
      "Rich in Chlorophyll to naturally boost RBC count and iron absorption",
      "Supports daily bowel digestion and natural weight management"
    ],
    authenticityDetails: "Certified organic by USDA and India Organic. Barcode and scratch code on the side of the container."
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    userName: "Amit Sharma",
    rating: 5,
    comment: "Absolutely authentic! Verified the scratch code on the ON website and it checked out perfectly. Delivery was fast, and Double Rich Chocolate is the best flavor hands down.",
    date: "2026-06-28",
    verifiedPurchase: true
  },
  {
    id: "r2",
    userName: "Priya Patel",
    rating: 5,
    comment: "I have been using the Kapiva Shilajit Gold for 2 weeks now. Feel a noticeable change in my daily stamina and recovery after intense workouts. No bloating at all. Recommended!",
    date: "2026-07-02",
    verifiedPurchase: true
  },
  {
    id: "r3",
    userName: "Rohan Malhotra",
    rating: 4,
    comment: "MB Biozyme is very easy on the stomach. Usually whey gives me slight digestion issues, but this formula absorbs really well. Dropping 1 star only because the Cafe Mocha is a bit too sweet for me.",
    date: "2026-07-05",
    verifiedPurchase: true
  },
  {
    id: "r4",
    userName: "Anjali Rao",
    rating: 5,
    comment: "Himalayan Organics Ashwagandha has really helped me manage my work stress and sleep better. Pure vegetarian capsules which is a must for my family. Love the brand!",
    date: "2026-06-15",
    verifiedPurchase: true
  },
  {
    id: "r5",
    userName: "Suresh Kumar",
    rating: 4,
    comment: "Asitis Creatine is pure gold. It is unflavored so it mixes with literally any shake. Solves the purpose at half the price of other premium brands.",
    date: "2026-07-01",
    verifiedPurchase: true
  }
];
