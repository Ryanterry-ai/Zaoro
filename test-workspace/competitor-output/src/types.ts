export enum Category {
  PROTEIN = "Protein",
  PERFORMANCE = "Performance",
  WELLNESS = "Health & Wellness",
  AYURVEDA = "Ayurveda",
  WEIGHT_MGMT = "Weight Management"
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number; // in INR (₹)
  originalPrice: number; // in INR (₹)
  rating: number;
  reviewsCount: number;
  image: string; // URL or CSS/SVG-based visualization
  description: string;
  isVeg: boolean; // Vegetarian vs Non-Vegetarian is a key factor in India
  servings: number;
  size: string; // e.g., "1 kg (2.2 lbs)", "60 Capsules"
  flavors?: string[];
  benefits: string[];
  authenticityDetails: string;
  isBestseller?: boolean;
  isNew?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  origin: "India" | "USA" | "UK";
  specialty: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedFlavor?: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface Order {
  id: string;
  items: {
    productId: string;
    productName: string;
    brand: string;
    price: number;
    quantity: number;
    flavor?: string;
    image: string;
  }[];
  subtotal: number;
  gst: number;
  shipping: number;
  total: number;
  date: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
  address: Address;
  paymentMethod: string;
  trackingId: string;
}
