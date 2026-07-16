# Build Task: NutriMart
**Industry:** ecommerce
**App Type:** industry-specific/generic

## Business Context
**Name:** NutriMart
**Industry:** ecommerce
**Description:** Build me a Multi brands e-commerce supplement store for Indian customers

## Data Model (entities)
- **Product:** name, price, description, image, stock, sku, category, userId
- **Order:** items, total, status, customerId, shippingAddress, createdAt, userId
- **Category:** name, slug, image, parent, userId
- **User:** id, email, name, role, createdAt

## Business Workflows
- **Add to Cart:** transform
- **Checkout:** transform
- **Return Request:** transform

## Industry Vocabulary (use these terms, NOT generic filler)
- "buyer" → use "customer"
- "listing" → use "product"
- "cart" → use "shopping bag"

## Design System
**Colors:** primary=#D4AF37, secondary=#1A1A1A, accent=#C9B037
**Fonts:** heading=Playfair Display, body=Inter

## Pages to Generate

### Page: `/shop` (Shop)
**Type:** page
**Components:**
- `ProductGrid`
  - Content fields: title, subtitle, entity
- `FilterSidebar`
  - Content fields: title
  - Items: Category, Price Range, Rating, Availability
- `CategoryGrid`
  - Content fields: title, subtitle
  - Items: All, Featured, New Arrivals, Sale

### Page: `/cart` (Cart)
**Type:** page
**Components:**
- `CartItems`
  - Content fields: title, entity
- `OrderSummary`
  - Content fields: title
  - Items: Subtotal, Shipping, Tax, Total
- `CheckoutForm`
  - Content fields: title, subtitle

### Page: `/product/:handle` (Product Detail)
**Type:** page
**Components:**
- `ProductInfo`
  - Content fields: title, entity
- `ProductGallery`
  - Content fields: title, entity
- `RecommendedProducts`
  - Content fields: title, entity
  - Items: Featured Item, Popular Choice, New Arrival

### Page: `/login` (Login)
**Type:** auth
**Components:**
- `AuthForm`
  - Content fields: title, subtitle

### Page: `/register` (Register)
**Type:** auth
**Components:**
- `AuthForm`
  - Content fields: title, subtitle

### Page: `/profile` (Profile)
**Type:** page
**Components:**
- `ProfileSection`
  - Content fields: title, subtitle
- `OrderHistory`
  - Content fields: title
- `Wishlist`
  - Content fields: title, entity
  - Items: Saved Item

### Page: `/` (Home)
**Type:** home
**Components:**
- `HeroBanner`
  - Content fields: title, subtitle, badge
  - Items: Add to Cart, Checkout, Return Request
- `FeatureGrid`
  - Content fields: title, subtitle
  - Items: Lab Tested, Free Delivery, Easy Returns, 100% Genuine, Expert Guidance, Track Orders
- `Testimonials`
  - Content fields: title, subtitle
  - Items: Alex Rivera, Jordan Lee, Sam Patel
- `CTASection`
  - Content fields: title, subtitle
  - Items: No credit card required, Instant setup

### Page: `/about` (About)
**Type:** page
**Components:**
- `AboutSection`
  - Content fields: title, subtitle
  - Items: Our Domain, Our Process
- `TeamSection`
  - Content fields: title, subtitle
  - Items: Operations, Technology, Customer Success
- `MissionSection`
  - Content fields: title, subtitle
  - Items: Inventory, Order Processing, Marketing

### Page: `/contact` (Contact)
**Type:** page
**Components:**
- `ContactForm`
  - Content fields: title, subtitle

### Page: `/product/:id` (Product Detail)
**Type:** detail
**Components:**
- `ProductGallery`
  - Content fields: title, entity
- `ProductInfo`
  - Content fields: title, entity
- `Testimonials`
  - Content fields: title, subtitle
  - Items: Alex Rivera, Jordan Lee, Sam Patel
- `RecommendedProducts`
  - Content fields: title, entity
  - Items: Featured Item, Popular Choice, New Arrival

### Page: `/checkout` (Checkout)
**Type:** page
**Components:**
- `CheckoutForm`
  - Content fields: title, subtitle
- `PaymentForm`
  - Content fields: title, subtitle
- `OrderReview`
  - Content fields: title

### Page: `/orders` (Orders)
**Type:** page
**Components:**
- `FilterSidebar`
  - Content fields: title
  - Items: Category, Price Range, Rating, Availability
- `DataTable`
  - Content fields: title, entity
  - Items: Record #001, Record #002, Record #003
- `OrderStatus`
  - Content fields: title, subtitle
  - Items: Order Placed, Processing, Shipped, Delivered

### Page: `/account` (My Account)
**Type:** page
**Components:**
- `OrderHistory`
  - Content fields: title
- `AddressBook`
  - Content fields: title
  - Items: Home
- `Wishlist`
  - Content fields: title, entity
  - Items: Saved Item

### Page: `/account/orders/:id` (Order Detail)
**Type:** detail
**Components:**
- `OrderStatus`
  - Content fields: title, subtitle
  - Items: Order Placed, Processing, Shipped, Delivered
- `CartItems`
  - Content fields: title, entity
- `OrderTracking`
  - Content fields: title, subtitle

## Content Generation Rules

1. **NEVER use generic filler text** like "Features", "Everything you need", "Product Management".
2. **Use REAL business terms** for ecommerce. Mention actual products, services, features.
3. **Hero section** must state a clear value proposition specific to NutriMart.
4. **Feature descriptions** must describe actual capabilities, not abstract categories.
5. **Testimonials** must sound like real customers in the ecommerce industry.
6. **CTA text** must be action-oriented and specific (e.g., "Order Fresh Coffee", not "Get Started").
7. **Pricing** must use realistic numbers for ecommerce (not $9.99 / $19.99 / $29.99 defaults).

## Technical Requirements

- Every component file: `"use client";` at top
- Import React, useState, useEffect as needed
- Import icons from `lucide-react`
- Import motion from `framer-motion`
- Use Tailwind CSS classes — NO inline styles
- Export as `export default function ComponentName()`
- Use `Link` from `next/link` for all internal navigation
- Apply design tokens from the design system (colors, fonts, spacing)
