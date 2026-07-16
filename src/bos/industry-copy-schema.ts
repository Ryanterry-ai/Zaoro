/**
 * Industry Copy Schema
 *
 * Every content string that currently defaults to SaaS language must come
 * from here instead. Add an entry for every industry the platform supports.
 * The content resolver reads this file — nowhere else.
 *
 * Design rule: every string here must pass the "would a real [industry] owner
 * put this on their website?" test. If not, rewrite it.
 */

export interface IndustryCopySchema {
  // Business name
  nameFromPrompt: boolean       // always true — extract explicit name first
  nameFallbackPatterns: string[]  // used only if no name found in prompt
                                  // [City], [Adj], [Domain] = template vars

  // Hero section
  heroPrimaryHeading: string    // "{appName}" or a template with vars
  heroSubheading: string        // Value proposition, NOT the raw prompt
  heroPrimaryButton: string     // "Reserve Your Table" not "Get Started"
  heroSecondaryButton: string   // "View Our Menu" not "Learn More"
  heroTrustBadges: string[]     // ["Farm-to-Table", "Open Daily"] not ["No credit card required"]
  heroImageKeywords: string[]   // For Unsplash query

  // Feature / Why Choose Us section
  featuresHeading: string       // "Why Guests Love Us" not "Capabilities"
  featuresSubheading: string
  featureItems: Array<{
    title: string
    description: string
    icon: string                // lucide-react icon name
  }>

  // Testimonials section
  testimonialsHeading: string   // "What Our Guests Say" not "Trusted by thousands"
  testimonialsSubheading: string
  testimonialTemplates: Array<{
    text: string
    author: string
    role: string                // "Regular guest" not "Operations Manager"
    rating: number
  }>

  // CTA section
  ctaHeading: string            // "Ready to dine with us?" not "Start your free trial"
  ctaPrimaryButton: string      // "Make a Reservation" not "Sign Up Free"
  ctaTrustLine: string          // "No reservation fee · Cancel anytime" not "No credit card required"

  // Pricing / Menu section heading
  pricingHeading: string        // "Our Menu" / "Membership Plans" / "Our Services"
  pricingSubheading: string

  // Stats section
  stats: Array<{
    value: string               // "500+"
    label: string               // "Happy diners per week" not "API calls per second"
  }>

  // Footer tagline
  footerTagline: string         // "Serving Austin since 2018" not "Powering modern teams"

  // Content guard patterns (NEVER let these appear in output)
  // If detected in any generated string → replace with industry alternative
  forbiddenPhrases: string[]
}

// ─── Schema Registry ──────────────────────────────────────────────────────────

export const INDUSTRY_COPY: Record<string, IndustryCopySchema> = {

  restaurant: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Kitchen', 'The [Adj] Table', '[City] Grill', '[Adj] Bistro'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Fresh ingredients, bold flavours — dine in or order online',
    heroPrimaryButton: 'Reserve Your Table',
    heroSecondaryButton: 'View Our Menu',
    heroTrustBadges: ['Farm-to-Table', 'Open Daily', 'Online Reservations'],
    heroImageKeywords: ['restaurant interior elegant', 'fine dining table setting', 'gourmet food plating'],

    featuresHeading: 'Why Guests Come Back',
    featuresSubheading: 'Every detail crafted for an unforgettable experience',
    featureItems: [
      { title: 'Seasonal Menu', description: 'Our menu changes with the seasons, sourced from local farms within 100 miles.', icon: 'Leaf' },
      { title: 'Expert Chefs', description: 'Our culinary team brings decades of fine dining experience to every plate.', icon: 'ChefHat' },
      { title: 'Private Dining', description: 'Intimate private rooms for celebrations, corporate events, and special occasions.', icon: 'UtensilsCrossed' },
      { title: 'Online Ordering', description: 'Order your favourites for pickup or delivery, directly from our kitchen.', icon: 'ShoppingBag' },
      { title: 'Curated Wine List', description: 'Over 80 labels hand-selected to complement every dish on our menu.', icon: 'Wine' },
      { title: 'Easy Reservations', description: 'Book your table online in seconds — no phone hold times, instant confirmation.', icon: 'Calendar' },
    ],

    testimonialsHeading: 'What Our Guests Say',
    testimonialsSubheading: 'Real reviews from real diners',
    testimonialTemplates: [
      { text: 'Absolutely incredible meal. The seasonal tasting menu was a journey — every course was a surprise. We\'ve already booked our next visit.', author: 'Sarah M.', role: 'Regular guest', rating: 5 },
      { text: 'Perfect spot for a special occasion. The service was attentive without being intrusive, and the food was genuinely outstanding.', author: 'James & Linda K.', role: 'Anniversary dinner', rating: 5 },
      { text: 'The best restaurant in Austin, full stop. We bring every out-of-town guest here. Never had a bad meal in three years of coming.', author: 'Michael T.', role: 'Austin local', rating: 5 },
    ],

    ctaHeading: 'Ready for an Unforgettable Meal?',
    ctaPrimaryButton: 'Reserve Your Table',
    ctaTrustLine: 'No reservation fee · Instant confirmation · Cancel up to 2 hours before',

    pricingHeading: 'Our Menu',
    pricingSubheading: 'Fresh, seasonal dishes crafted with local ingredients',

    stats: [
      { value: '500+', label: 'Covers served weekly' },
      { value: '12', label: 'Years serving Austin' },
      { value: '4.9★', label: 'Average guest rating' },
      { value: '100%', label: 'Locally sourced produce' },
    ],

    footerTagline: 'Good food, great company — dine with us tonight.',

    forbiddenPhrases: [
      'get started', 'sign up free', 'no credit card required', 'instant setup',
      'capabilities', 'trusted by thousands', 'roi', 'productivity', 'workflow',
      'saas', 'platform', 'dashboard', 'analytics', 'api', 'integration',
      'free trial', 'upgrade', 'subscription plan', 'per user per month',
    ],
  },

  coffee: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Brew', '[City] Roast', 'The [Adj] Bean', '[Adj] Press Coffee'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Specialty coffee roasted in-house — order for pickup, delivery, or dine in',
    heroPrimaryButton: 'Order Online',
    heroSecondaryButton: 'View Our Menu',
    heroTrustBadges: ['Single-Origin Beans', 'Ethically Sourced', 'Roasted Fresh Daily'],
    heroImageKeywords: ['coffee shop interior cozy', 'barista espresso art', 'coffee beans roasting'],

    featuresHeading: 'Crafted With Care',
    featuresSubheading: 'From bean to cup, every detail matters',
    featureItems: [
      { title: 'Single-Origin Roasts', description: 'We source beans direct from farms in Ethiopia, Colombia, and Guatemala — traceable to the farm.', icon: 'Coffee' },
      { title: 'Expert Baristas', description: 'Our team trains for months before their first solo shot. Your latte is in skilled hands.', icon: 'Star' },
      { title: 'Cozy Workspace', description: 'Fast WiFi, ample power outlets, and a quiet space — perfect for working or studying.', icon: 'Wifi' },
      { title: 'Seasonal Drinks', description: 'Our seasonal specials rotate monthly, inspired by the best ingredients of each season.', icon: 'Leaf' },
      { title: 'Online Ordering', description: 'Skip the queue — order ahead for pickup and it\'ll be ready when you walk in.', icon: 'Smartphone' },
      { title: 'Loyalty Rewards', description: 'Every cup earns points. Your tenth coffee is always on us.', icon: 'Heart' },
    ],

    testimonialsHeading: 'From Our Regulars',
    testimonialsSubheading: 'People who start their morning with us',
    testimonialTemplates: [
      { text: 'Best cortado in the city, no contest. I\'ve tried every coffee shop in Austin and nothing comes close to the consistency here.', author: 'Alex R.', role: 'Daily regular', rating: 5 },
      { text: 'I work here three days a week. The WiFi is reliable, the coffee is excellent, and the staff actually remember your order.', author: 'Priya S.', role: 'Remote worker', rating: 5 },
      { text: 'The seasonal menu is fantastic. Their autumn spiced latte is something I look forward to all year.', author: 'Tom & Anna B.', role: 'Weekend visitors', rating: 5 },
    ],

    ctaHeading: 'Your Morning Starts Here',
    ctaPrimaryButton: 'Order Online',
    ctaTrustLine: 'Ready in 5 minutes · Free WiFi · Rewards on every order',

    pricingHeading: 'Our Coffee Menu',
    pricingSubheading: 'Espresso-based drinks, pour-overs, and seasonal specials',

    stats: [
      { value: '200+', label: 'Cups crafted daily' },
      { value: '8', label: 'Single-origin roasts' },
      { value: '4.8★', label: 'Average customer rating' },
      { value: '6am', label: 'Open every morning' },
    ],

    footerTagline: 'Specialty coffee, served with care.',

    forbiddenPhrases: [
      'get started', 'sign up free', 'no credit card required', 'capabilities',
      'saas', 'workflow', 'roi', 'platform', 'subscription plan', 'per user',
      'trusted by thousands of teams',
    ],
  },

  gym: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Fitness', '[City] Forge', '[Adj] Gym', 'Peak [City]'],

    heroPrimaryHeading: 'Transform at {appName}',
    heroSubheading: 'Expert trainers, state-of-the-art equipment, flexible memberships — your fitness journey starts here',
    heroPrimaryButton: 'Start Your Free Trial',
    heroSecondaryButton: 'View Memberships',
    heroTrustBadges: ['Free 7-Day Trial', 'No Lock-in Contracts', 'Open 5am–11pm'],
    heroImageKeywords: ['modern gym interior', 'fitness training weights', 'gym workout class'],

    featuresHeading: 'Everything You Need to Reach Your Goals',
    featuresSubheading: 'World-class facilities, expert guidance, supportive community',
    featureItems: [
      { title: 'Expert Personal Trainers', description: 'Certified trainers design personalised programs based on your specific goals, fitness level, and schedule.', icon: 'Users' },
      { title: 'State-of-the-Art Equipment', description: '500+ pieces of equipment across strength, cardio, and functional training areas — always maintained.', icon: 'Dumbbell' },
      { title: 'Group Fitness Classes', description: '30+ weekly classes including yoga, HIIT, spinning, and pilates — included with every membership.', icon: 'Calendar' },
      { title: 'Progress Tracking', description: 'Track workouts, body measurements, and milestones with our member app. See exactly how far you\'ve come.', icon: 'TrendingUp' },
      { title: 'Recovery Zone', description: 'Sauna, steam room, and stretch area to maximise recovery and keep you training consistently.', icon: 'Heart' },
      { title: 'Nutrition Guidance', description: 'In-house nutritionist and meal plan templates to complement your training programme.', icon: 'Leaf' },
    ],

    testimonialsHeading: 'Real Results, Real Members',
    testimonialsSubheading: 'Thousands of members have changed their lives here',
    testimonialTemplates: [
      { text: 'Lost 18kg in 6 months with the help of my trainer. I\'ve tried other gyms but the support here is on another level — they actually care about your progress.', author: 'Ravi K.', role: 'Member since 2023', rating: 5 },
      { text: 'The morning HIIT classes are incredible. I\'ve gone from barely lasting 10 minutes to completing every session. The community keeps me accountable.', author: 'Jessica T.', role: '14-month member', rating: 5 },
      { text: 'Best gym I\'ve ever joined. Clean facilities, amazing trainers, and the equipment is always in perfect condition. Worth every rupee.', author: 'Arjun M.', role: 'Personal training client', rating: 5 },
    ],

    ctaHeading: 'Start Your Transformation Today',
    ctaPrimaryButton: 'Claim Your Free Trial',
    ctaTrustLine: '7-day free trial · No credit card needed · Cancel any membership anytime',

    pricingHeading: 'Membership Plans',
    pricingSubheading: 'Flexible options for every goal and schedule',

    stats: [
      { value: '2,500+', label: 'Active members' },
      { value: '30+', label: 'Weekly group classes' },
      { value: '50+', label: 'Certified trainers' },
      { value: '4.9★', label: 'Member satisfaction' },
    ],

    footerTagline: 'Your strongest self is waiting. We\'ll help you get there.',

    forbiddenPhrases: [
      'capabilities', 'saas', 'workflow', 'roi', 'no credit card required for software',
      'api', 'integration', 'subscription plan per user', 'trusted by thousands of businesses',
      'productivity', 'dashboard analytics',
    ],
  },

  'ecommerce-supplement': {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City]Fit', 'Nutri[Adj]', '[Adj]Fuel', 'Peak[Domain]'],

    heroPrimaryHeading: 'Premium Supplements at {appName}',
    heroSubheading: 'Authentic supplements from top brands — lab-tested, FSSAI approved, delivered pan-India',
    heroPrimaryButton: 'Shop Now',
    heroSecondaryButton: 'View All Products',
    heroTrustBadges: ['Lab Tested', 'FSSAI Approved', 'Free Delivery ₹999+', 'COD Available'],
    heroImageKeywords: ['protein powder supplements fitness', 'gym nutrition products', 'fitness supplements whey'],

    featuresHeading: 'Why Athletes Choose Us',
    featuresSubheading: '1 crore+ customers across India trust us for genuine products',
    featureItems: [
      { title: '100% Authentic', description: 'Every product is sourced directly from authorised distributors. QR code verification on every item.', icon: 'ShieldCheck' },
      { title: 'Best Price Guarantee', description: 'Find a lower price anywhere in India — we\'ll match it, no questions asked.', icon: 'Tag' },
      { title: 'Fast Delivery', description: 'Same-day dispatch from Mumbai, Delhi, and Bangalore warehouses. Track your order in real time.', icon: 'Truck' },
      { title: 'Expert Nutrition Advice', description: 'Free consultation with certified nutritionists to help you choose the right stack for your goals.', icon: 'Users' },
      { title: 'EMI Available', description: 'Buy now, pay later in easy installments — 0% EMI on orders above ₹3,000 on most cards.', icon: 'CreditCard' },
      { title: 'Easy Returns', description: '7-day hassle-free returns on sealed products. No questions asked, full refund guaranteed.', icon: 'RotateCcw' },
    ],

    testimonialsHeading: 'What Athletes Are Saying',
    testimonialsSubheading: 'Join 1 crore+ satisfied customers across India',
    testimonialTemplates: [
      { text: 'Been buying my whey from here for 2 years. Always genuine, always fast delivery. Had a bad batch once and they replaced it within 24 hours.', author: 'Arjun S.', role: 'Gym trainer, Mumbai', rating: 5 },
      { text: 'Best prices I\'ve found for MuscleBlaze anywhere online. Delivery was faster than Amazon and the products were sealed properly.', author: 'Priya K.', role: 'Fitness enthusiast, Delhi', rating: 5 },
      { text: 'Love the nutrition consultation feature. Helped me build the right stack for my cutting phase. Saved thousands vs my old supplement plan.', author: 'Vikram R.', role: 'Competitive bodybuilder, Pune', rating: 5 },
    ],

    ctaHeading: 'Ready to Level Up Your Nutrition?',
    ctaPrimaryButton: 'Shop All Products',
    ctaTrustLine: 'Free delivery on ₹999+ · COD available · 7-day returns',

    pricingHeading: 'Shop by Category',
    pricingSubheading: 'Protein, creatine, pre-workout, vitamins, and more — all brands, all goals',

    stats: [
      { value: '1Cr+', label: 'Happy customers' },
      { value: '500+', label: 'Products in stock' },
      { value: '₹999+', label: 'Free delivery threshold' },
      { value: '4.8★', label: 'Average rating' },
    ],

    footerTagline: 'Fuel your ambition. Authentic supplements, delivered fast.',

    forbiddenPhrases: [
      'get started free', 'no credit card required', 'sign up for our platform',
      'capabilities', 'workflow', 'roi measurement', 'b2b dashboard',
      'trusted by thousands of teams', 'productivity', 'integration api',
    ],
  },

  salon: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Adj] [City] Salon', 'Studio [Adj]', '[City] Glow', '[Adj] Beauty Bar'],

    heroPrimaryHeading: 'Welcome to {appName}',
    heroSubheading: 'Expert styling, colour, and treatments — book online in under a minute',
    heroPrimaryButton: 'Book an Appointment',
    heroSecondaryButton: 'View Services',
    heroTrustBadges: ['Online Booking', 'Expert Stylists', 'Premium Products'],
    heroImageKeywords: ['hair salon interior luxury', 'hairstyling professional', 'beauty salon treatment'],

    featuresHeading: 'Your Best Look, Delivered',
    featuresSubheading: 'A full-service salon experience tailored to you',
    featureItems: [
      { title: 'Expert Stylists', description: 'Our team has trained with leading names in fashion and film. Every stylist is certified with 5+ years experience.', icon: 'Scissors' },
      { title: 'Premium Products', description: 'We use only professional-grade products from Kerastase, Olaplex, and L\'Oréal Professionnel.', icon: 'Star' },
      { title: 'Easy Online Booking', description: 'Book any service in under a minute — choose your stylist, pick your time, confirm instantly.', icon: 'Calendar' },
      { title: 'Hair Colour Specialists', description: 'Balayage, highlights, ombre, global colour — our colour specialists keep up with the latest trends.', icon: 'Palette' },
      { title: 'Bridal Packages', description: 'Complete bridal packages including trial, day-of styling, and bridesmaid services at special rates.', icon: 'Heart' },
      { title: 'Loyalty Rewards', description: 'Earn points on every service. Regular clients get priority booking and exclusive member offers.', icon: 'Gift' },
    ],

    testimonialsHeading: 'Loved by Our Clients',
    testimonialsSubheading: 'Hundreds of 5-star reviews from happy clients',
    testimonialTemplates: [
      { text: 'Absolutely obsessed with my balayage. I\'ve been going to salons for 10 years and this is genuinely the best colour I\'ve ever had. Won\'t go anywhere else.', author: 'Sophie L.', role: 'Regular client', rating: 5 },
      { text: 'Booked online last minute and they fit me in the same day. The blow-dry was perfect and lasted four days. The whole experience was so relaxing.', author: 'Ananya R.', role: 'New client', rating: 5 },
      { text: 'They did my hair and makeup for my wedding. I cried when I saw myself — it was exactly what I\'d dreamed of. The whole team was so professional.', author: 'Meera K.', role: 'Bridal client', rating: 5 },
    ],

    ctaHeading: 'Ready to Love Your Hair?',
    ctaPrimaryButton: 'Book Now',
    ctaTrustLine: 'Instant confirmation · Free cancellation 24h before · No booking fee',

    pricingHeading: 'Our Services',
    pricingSubheading: 'From quick blow-dries to full colour transformations',

    stats: [
      { value: '800+', label: 'Happy clients monthly' },
      { value: '4.9★', label: 'Average review score' },
      { value: '15+', label: 'Years of experience' },
      { value: '200+', label: 'Five-star reviews' },
    ],

    footerTagline: 'Your hair, your confidence, our craft.',

    forbiddenPhrases: [
      'get started free', 'no credit card required', 'saas capabilities',
      'workflow automation', 'roi', 'b2b', 'trusted by thousands of businesses',
      'sign up for the platform', 'api integration', 'subscription plan per user',
    ],
  },

  wholesale: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Supply Co', '[Domain] Wholesale', '[Adj] Trading', '[City] Distribution'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Trusted wholesale supplier — bulk pricing, NET-30 terms, and reliable delivery for your business',
    heroPrimaryButton: 'Request a Quote',
    heroSecondaryButton: 'View Product Catalog',
    heroTrustBadges: ['NET-30 Terms', 'Volume Discounts', 'Same-Day Dispatch', 'Dedicated Account Manager'],
    heroImageKeywords: ['warehouse wholesale distribution', 'bulk inventory supply chain', 'business-to-business logistics'],

    featuresHeading: 'Built for Your Business',
    featuresSubheading: 'Everything you need to source smarter and scale faster',
    featureItems: [
      { title: 'Bulk Pricing', description: 'Volume-based pricing that rewards larger orders. Request a custom quote for your business needs.', icon: 'TrendingDown' },
      { title: 'NET-30 Payment Terms', description: 'Qualified businesses get 30-day payment terms. Apply during checkout — approval in 24 hours.', icon: 'CreditCard' },
      { title: 'Quote Request System', description: 'Submit your requirements and get a detailed quote within 4 hours during business hours.', icon: 'FileText' },
      { title: 'Reliable Delivery', description: 'Same-day dispatch for orders placed before 2pm. Tracking on every shipment, guaranteed delivery windows.', icon: 'Truck' },
      { title: 'Dedicated Account Manager', description: 'A single point of contact who knows your business, your orders, and your preferences.', icon: 'Users' },
      { title: 'Easy Reordering', description: 'One-click reorder from your order history. Set up automatic recurring orders for frequently purchased items.', icon: 'RotateCcw' },
    ],

    testimonialsHeading: 'Trusted by Businesses Nationwide',
    testimonialsSubheading: 'Over 5,000 companies source from us',
    testimonialTemplates: [
      { text: 'We\'ve been ordering from them for 3 years. Consistent quality, competitive bulk pricing, and our account manager always resolves issues within the hour.', author: 'Mark R.', role: 'Procurement Manager, TechFlow Inc.', rating: 5 },
      { text: 'Switched from our old supplier and saved 18% on our annual spend. The NET-30 terms were a game-changer for our cash flow.', author: 'Sarah K.', role: 'Operations Director, BuildRight Co.', rating: 5 },
      { text: 'Reliable, professional, and always in stock. They handle our entire office supply chain so we can focus on our core business.', author: 'David L.', role: 'Office Manager, Meridian Group', rating: 5 },
    ],

    ctaHeading: 'Ready to Source Smarter?',
    ctaPrimaryButton: 'Request a Quote',
    ctaTrustLine: 'Quotes within 4 hours · NET-30 available · Free shipping on orders over $500',

    pricingHeading: 'Product Catalog',
    pricingSubheading: 'Browse our full range — volume discounts applied at checkout',

    stats: [
      { value: '5,000+', label: 'Businesses served' },
      { value: '10K+', label: 'Products in stock' },
      { value: '98%', label: 'On-time delivery rate' },
      { value: '18%', label: 'Avg savings vs retail' },
    ],

    footerTagline: 'Your trusted wholesale partner. Supplying businesses since 2015.',

    forbiddenPhrases: [
      'get started free', 'no credit card required', 'sign up for our platform',
      'dine in', 'reservation', 'menu', 'chef', 'kitchen', 'table',
      'members', 'workout', 'gym', 'class', 'trainer',
      'saas', 'workflow automation', 'roi', 'api integration',
    ],
  },

  legal: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Name] & Associates', '[City] Law Group', '[Adj] Legal'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Experienced legal counsel across civil, corporate, and criminal law — trusted by clients across the region',
    heroPrimaryButton: 'Schedule a Consultation',
    heroSecondaryButton: 'Our Practice Areas',
    heroTrustBadges: ['Free Initial Consultation', '20+ Years Experience', 'Rated "AV Preeminent"'],
    heroImageKeywords: ['law firm office professional', 'legal counsel meeting', 'courtroom justice scales'],

    featuresHeading: 'Why Clients Choose Us',
    featuresSubheading: 'Trusted legal expertise with a commitment to your outcome',
    featureItems: [
      { title: 'Experienced Attorneys', description: 'Our team brings decades of courtroom and negotiation experience across all major practice areas.', icon: 'Award' },
      { title: 'Client-First Approach', description: 'You receive direct access to your attorney — not a paralegal — throughout your case.', icon: 'Users' },
      { title: 'Transparent Billing', description: 'Clear fee structures with no hidden charges. Fixed fees for standard matters, hourly for complex litigation.', icon: 'FileText' },
      { title: 'Proven Track Record', description: '95% success rate across 2,000+ cases handled over 20 years of practice.', icon: 'TrendingUp' },
      { title: 'Secure Document Portal', description: 'Share documents, track case status, and communicate securely through our client portal.', icon: 'Lock' },
      { title: 'Free Initial Consultation', description: '45-minute no-obligation consultation to understand your situation before any commitment.', icon: 'Phone' },
    ],

    testimonialsHeading: 'Client Testimonials',
    testimonialsSubheading: 'Outcomes that speak for themselves',
    testimonialTemplates: [
      { text: 'They handled my business acquisition with complete professionalism. Every deadline was met, every question answered same day. I wouldn\'t use anyone else.', author: 'David M.', role: 'Business owner, acquisition matter', rating: 5 },
      { text: 'Outstanding representation in a complex employment dispute. The team was calm, strategic, and genuinely fought for my interests. Excellent outcome.', author: 'Rachel T.', role: 'Employment law client', rating: 5 },
      { text: 'Recommended by a trusted colleague and they exceeded expectations. Clear communication, fair fees, and a result I didn\'t think was possible.', author: 'James H.', role: 'Civil litigation client', rating: 5 },
    ],

    ctaHeading: 'Get the Legal Counsel You Deserve',
    ctaPrimaryButton: 'Schedule a Free Consultation',
    ctaTrustLine: 'Free 45-minute consultation · Confidential · No obligation to proceed',

    pricingHeading: 'Our Practice Areas',
    pricingSubheading: 'Expert representation across the areas that matter most',

    stats: [
      { value: '2,000+', label: 'Cases handled' },
      { value: '95%', label: 'Success rate' },
      { value: '20+', label: 'Years of practice' },
      { value: 'AV', label: 'Martindale-Hubbell rating' },
    ],

    footerTagline: 'Experienced counsel. Proven results. Your interests, first.',

    forbiddenPhrases: [
      'get started', 'sign up free', 'no credit card required', 'instant setup',
      'saas', 'capabilities', 'workflow', 'dashboard', 'api', 'integration',
      'subscription plan', 'per user per month', 'productivity suite',
    ],
  },

  saas: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Domain][Suffix]', '[Adj][Domain]', '[City][Domain]'],
    // SaaS IS the one case where "TasteHub" style names are appropriate

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'The [industry] platform built for modern teams — launch faster, scale smarter',
    heroPrimaryButton: 'Start Free Trial',
    heroSecondaryButton: 'Watch Demo',
    heroTrustBadges: ['Free 14-day trial', 'No credit card required', 'Cancel anytime'],
    heroImageKeywords: ['saas dashboard ui', 'software team collaboration', 'product analytics dashboard'],

    featuresHeading: 'Everything Your Team Needs',
    featuresSubheading: 'Built for teams of all sizes, from startups to enterprise',
    featureItems: [
      { title: 'Intuitive Dashboard', description: 'A single view of everything that matters. Real-time data, actionable insights, zero noise.', icon: 'LayoutDashboard' },
      { title: 'Team Collaboration', description: 'Work together in real time. Comments, assignments, notifications — built into every workflow.', icon: 'Users' },
      { title: 'Powerful Integrations', description: 'Connect your existing tools. Slack, GitHub, Jira, Salesforce and 100+ more out of the box.', icon: 'Zap' },
      { title: 'Advanced Analytics', description: 'Understand what\'s working and what isn\'t. Track the metrics that move your business forward.', icon: 'BarChart3' },
      { title: 'Enterprise Security', description: 'SOC 2 Type II certified. SSO, MFA, audit logs, and role-based permissions built in.', icon: 'Shield' },
      { title: 'API-First Design', description: 'Automate anything. Full REST and GraphQL APIs with detailed docs and SDKs for every language.', icon: 'Code' },
    ],

    testimonialsHeading: 'Trusted by 10,000+ Teams',
    testimonialsSubheading: 'From startups to Fortune 500',
    testimonialTemplates: [
      { text: 'We cut our project delivery time by 40% in the first month. The automation features alone saved our team 10 hours per week.', author: 'Sarah L.', role: 'Head of Operations, TechCorp', rating: 5 },
      { text: 'The best platform in its category. We\'ve tried five competitors — nothing comes close to the depth of features here.', author: 'Marcus D.', role: 'CTO, Scale-up', rating: 5 },
      { text: 'Onboarded our 200-person team in a day. The migration tools were seamless and support was available whenever we needed it.', author: 'Priya M.', role: 'IT Director, Enterprise', rating: 5 },
    ],

    ctaHeading: 'Start Building Today',
    ctaPrimaryButton: 'Start Free Trial',
    ctaTrustLine: 'Free 14 days · No credit card required · Cancel anytime',

    pricingHeading: 'Simple, Transparent Pricing',
    pricingSubheading: 'Scale as you grow — no surprises',

    stats: [
      { value: '10K+', label: 'Teams worldwide' },
      { value: '99.9%', label: 'Uptime SLA' },
      { value: '40%', label: 'Avg productivity increase' },
      { value: '<2hr', label: 'Average onboarding time' },
    ],

    footerTagline: 'Built for teams that move fast.',

    forbiddenPhrases: [],  // SaaS copy is appropriate for SaaS industry
  },

  realestate: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Realty', '[Adj] Estates', '[City] Properties', 'Key [City] Homes'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Find your next home with confidence — expert agents, verified listings, and transparent pricing',
    heroPrimaryButton: 'Search Properties',
    heroSecondaryButton: 'Meet Our Agents',
    heroTrustBadges: ['500+ Verified Listings', 'Licensed Agents', 'Free Property Valuation', 'No Hidden Fees'],
    heroImageKeywords: ['modern luxury home exterior', 'real estate property aerial', 'house family neighborhood'],

    featuresHeading: 'Why Buyers Choose Us',
    featuresSubheading: 'Trusted expertise, transparent process, and homes you will love',
    featureItems: [
      { title: 'Verified Listings', description: 'Every property is inspected and verified by our team. What you see is what you get.', icon: 'ShieldCheck' },
      { title: 'Expert Agents', description: 'Local agents who know every neighbourhood — school ratings, commute times, and hidden gems.', icon: 'Users' },
      { title: 'Virtual Tours', description: 'Walk through properties from your couch. 3D tours and video walkthroughs on every listing.', icon: 'Video' },
      { title: 'Mortgage Calculator', description: 'Instant mortgage estimates with current rates. Compare scenarios before you commit.', icon: 'Calculator' },
      { title: 'Saved Searches', description: 'Save your favourite properties and get instant alerts when similar homes hit the market.', icon: 'Heart' },
      { title: 'Free Valuation', description: 'Curious what your home is worth? Get a free, no-obligation market valuation from our experts.', icon: 'TrendingUp' },
    ],

    testimonialsHeading: 'Happy Homeowners',
    testimonialsSubheading: 'Real stories from people who found their dream home',
    testimonialTemplates: [
      { text: 'Found our dream home in 3 weeks. The agent knew exactly what we were looking for and the virtual tours saved us hours of driving around.', author: 'David & Lisa M.', role: 'First-time buyers', rating: 5 },
      { text: 'Sold our house above asking price in 10 days. The marketing and professional photos made all the difference. Incredible experience.', author: 'Rajesh K.', role: 'Home seller', rating: 5 },
      { text: 'Best real estate experience we have ever had. Transparent pricing, responsive agents, and no hidden fees. Highly recommend.', author: 'Sarah & Tom W.', role: 'Relocating family', rating: 5 },
    ],

    ctaHeading: 'Find Your Dream Home Today',
    ctaPrimaryButton: 'Start Searching',
    ctaTrustLine: 'No buyer fees · Free property valuation · Cancel anytime',

    pricingHeading: 'Browse Properties',
    pricingSubheading: 'Residential, commercial, and investment properties across the region',

    stats: [
      { value: '500+', label: 'Properties listed' },
      { value: '98%', label: 'Client satisfaction rate' },
      { value: '14', label: 'Days average time to sell' },
      { value: '15+', label: 'Years of experience' },
    ],

    footerTagline: 'Helping families find their perfect home since 2010.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
    ],
  },

  education: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Academy', '[Adj] Learning', 'Skill [Domain]', '[Domain] Academy'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Industry-leading courses with live mentorship, hands-on projects, and job placement support',
    heroPrimaryButton: 'Enroll Now',
    heroSecondaryButton: 'View Courses',
    heroTrustBadges: ['Job-Guaranteed', '10,000+ Graduates', 'Live Mentorship', 'Flexible Schedule'],
    heroImageKeywords: ['online learning platform modern', 'student classroom focused', 'education technology modern'],

    featuresHeading: 'Why Students Choose Us',
    featuresSubheading: 'Practical skills, real projects, and career support that actually works',
    featureItems: [
      { title: 'Industry Experts', description: 'Learn from practitioners who work at top companies — not just理论 textbook professors.', icon: 'GraduationCap' },
      { title: 'Hands-on Projects', description: 'Build real projects for your portfolio, not toy exercises. Every course ends with a capstone.', icon: 'Code' },
      { title: 'Live Mentorship', description: 'Weekly live sessions with your mentor. Get unstuck fast and stay on track.', icon: 'Users' },
      { title: 'Job Placement', description: 'Dedicated career services: resume reviews, interview prep, and employer connections.', icon: 'Briefcase' },
      { title: 'Flexible Schedule', description: 'Study at your own pace with lifetime access. Revisit any lesson, any time.', icon: 'Clock' },
      { title: 'Community', description: 'Join 10,000+ alumni network. Peer support, job referrals, and study groups.', icon: 'MessageCircle' },
    ],

    testimonialsHeading: 'Student Success Stories',
    testimonialsSubheading: 'Graduates who transformed their careers',
    testimonialTemplates: [
      { text: 'Went from zero coding knowledge to a junior developer role in 4 months. The hands-on projects made my portfolio stand out.', author: 'Priya S.', role: 'Software Developer, now at Google', rating: 5 },
      { text: 'The mentorship sessions were game-changing. My mentor helped me navigate career decisions and prep for interviews. Worth every penny.', author: 'Alex R.', role: 'Data Analyst, transitioned from teaching', rating: 5 },
      { text: 'Best investment in my career. The curriculum is current, the projects are real, and the community is incredibly supportive.', author: 'Marcus T.', role: 'UX Designer, freelance to full-time', rating: 5 },
    ],

    ctaHeading: 'Start Your Learning Journey',
    ctaPrimaryButton: 'Apply Now',
    ctaTrustLine: 'Job placement guarantee · Free intro course · Cancel anytime before week 2',

    pricingHeading: 'Course Catalog',
    pricingSubheading: 'Explore our programmes — from beginner to advanced',

    stats: [
      { value: '10K+', label: 'Graduates worldwide' },
      { value: '94%', label: 'Job placement rate' },
      { value: '50+', label: 'Expert instructors' },
      { value: '4.9★', label: 'Average student rating' },
    ],

    footerTagline: 'Learn the skills that matter. Get the career you deserve.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
    ],
  },

  travel: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Travels', 'Voyage [City]', '[Adj] Getaways', 'Wander [Domain]'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Curated travel experiences — handpicked destinations, local expertise, and unforgettable journeys',
    heroPrimaryButton: 'Explore Destinations',
    heroSecondaryButton: 'Plan Your Trip',
    heroTrustBadges: ['Expert Local Guides', 'Best Price Guarantee', 'Flexible Cancellation', '24/7 Support'],
    heroImageKeywords: ['stunning travel destination landscape', 'luxury resort pool ocean view', 'adventure travel mountain hiking'],

    featuresHeading: 'Why Travellers Choose Us',
    featuresSubheading: 'Authentic experiences, expert planning, and memories that last a lifetime',
    featureItems: [
      { title: 'Handpicked Destinations', description: 'Every destination is personally vetted by our travel experts. No generic tourist traps.', icon: 'MapPin' },
      { title: 'Local Expertise', description: 'Our guides are locals who know the hidden gems — the best restaurants, secret spots, and cultural must-sees.', icon: 'Compass' },
      { title: 'Custom Itineraries', description: 'No cookie-cutter trips. We build itineraries around your interests, pace, and budget.', icon: 'Route' },
      { title: 'Flexible Booking', description: 'Free cancellation up to 30 days before departure. Change dates, change destinations — we adapt.', icon: 'Calendar' },
      { title: '24/7 Support', description: 'From booking to boarding to coming home, our team is available around the clock.', icon: 'Headphones' },
      { title: 'Sustainable Travel', description: 'We partner with eco-certified hotels and support local communities on every trip.', icon: 'Leaf' },
    ],

    testimonialsHeading: 'Traveller Stories',
    testimonialsSubheading: 'Real experiences from real travellers',
    testimonialTemplates: [
      { text: 'The Bali trip was beyond our expectations. The local guide showed us places we never would have found on our own. Truly magical.', author: 'Emily & Jake R.', role: 'Honeymoon trip to Bali', rating: 5 },
      { text: 'Third trip with them and each one gets better. The attention to detail — from restaurant reservations to surprise experiences — is unmatched.', author: 'Michael T.', role: 'Repeat traveller, 3 trips', rating: 5 },
      { text: 'Booked a last-minute family trip to Costa Rica. Everything was seamless — flights, hotels, activities. The kids had the time of their lives.', author: 'Priya & Arjun K.', role: 'Family vacation', rating: 5 },
    ],

    ctaHeading: 'Ready for Your Next Adventure?',
    ctaPrimaryButton: 'Start Planning',
    ctaTrustLine: 'Free cancellation · Best price guarantee · Flexible payment plans',

    pricingHeading: 'Popular Destinations',
    pricingSubheading: 'Explore our most-loved trips — or let us build a custom one',

    stats: [
      { value: '50+', label: 'Destinations covered' },
      { value: '2,000+', label: 'Happy travellers' },
      { value: '4.9★', label: 'Average trip rating' },
      { value: '98%', label: 'Would book again' },
    ],

    footerTagline: 'Your next adventure starts here. Travel with confidence.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
    ],
  },

  event: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Events', '[Domain] Hub', 'Event [City]', '[Adj] Gatherings'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Discover and host unforgettable events — conferences, concerts, weddings, and more',
    heroPrimaryButton: 'Browse Events',
    heroSecondaryButton: 'Host an Event',
    heroTrustBadges: ['10,000+ Attendees', 'Verified Venues', 'Instant Tickets', 'Event Insurance'],
    heroImageKeywords: ['modern event venue lights', 'conference audience stage', 'outdoor festival crowd'],

    featuresHeading: 'Why Event Organisers Trust Us',
    featuresSubheading: 'Everything you need to plan, promote, and execute flawless events',
    featureItems: [
      { title: 'Venue Discovery', description: 'Browse 500+ verified venues with real photos, capacity charts, and instant availability.', icon: 'MapPin' },
      { title: 'Ticketing System', description: 'Sell tickets online with multiple tiers, early-bird pricing, and group discounts. Real-time sales dashboard.', icon: 'Ticket' },
      { title: 'Event Promotion', description: 'Built-in marketing tools: email campaigns, social sharing, and featured listings.', icon: 'Megaphone' },
      { title: 'Attendee Management', description: 'Guest lists, check-in, seating arrangements, and real-time attendance tracking.', icon: 'Users' },
      { title: 'Vendor Marketplace', description: 'Connect with caterers, photographers, AV teams, and decorators — all vetted and reviewed.', icon: 'Store' },
      { title: 'Analytics Dashboard', description: 'Track ticket sales, attendee engagement, and event ROI in real time.', icon: 'BarChart' },
    ],

    testimonialsHeading: 'Event Success Stories',
    testimonialsSubheading: 'From intimate gatherings to large-scale conferences',
    testimonialTemplates: [
      { text: 'Hosted our annual tech conference through the platform. Sold out 500 tickets in 3 weeks. The attendee management tools saved us hundreds of hours.', author: 'David L.', role: 'Conference organiser, TechSummit', rating: 5 },
      { text: 'Found the perfect wedding venue through this site. The virtual tour sealed the deal. Booking was seamless and the vendor recommendations were spot-on.', author: 'Priya & Vikram S.', role: 'Wedding venue booking', rating: 5 },
      { text: 'Our music festival sold 2,000 tickets online. The analytics dashboard gave us real-time data on sales trends and marketing performance. Game-changer.', author: 'Alex M.', role: 'Festival organiser', rating: 5 },
    ],

    ctaHeading: 'Ready to Host Your Next Event?',
    ctaPrimaryButton: 'Get Started Free',
    ctaTrustLine: 'No platform fees on free events · Cancel anytime · Dedicated support',

    pricingHeading: 'Upcoming Events',
    pricingSubheading: 'Browse by category — conferences, concerts, workshops, and more',

    stats: [
      { value: '500+', label: 'Events hosted' },
      { value: '10K+', label: 'Tickets sold monthly' },
      { value: '500+', label: 'Verified venues' },
      { value: '4.8★', label: 'Average event rating' },
    ],

    footerTagline: 'Where events come to life. Plan, promote, and execute with confidence.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
    ],
  },

  luxury: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Adj] Collection', '[Brand] Atelier', 'The [Adj] House', '[City] Exclusive'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Curated luxury experiences for the discerning few — by appointment only',
    heroPrimaryButton: 'Explore Collection',
    heroSecondaryButton: 'Request a Viewing',
    heroTrustBadges: ['By Invitation Only', 'Lifetime Warranty', 'Personal Concierge', 'Private Showroom'],
    heroImageKeywords: ['luxury brand minimalist interior', 'premium product elegant display', 'high-end fashion editorial'],

    featuresHeading: 'The Experience',
    featuresSubheading: 'Uncompromising quality, timeless design, and service beyond expectation',
    featureItems: [
      { title: 'Exclusive Collections', description: 'Limited-edition pieces and bespoke creations available only to our clientele.', icon: 'Crown' },
      { title: 'Personal Concierge', description: 'Dedicated advisor who understands your taste, anticipates your needs, and curates for you.', icon: 'UserCheck' },
      { title: 'Private Viewings', description: 'Visit our showroom by appointment. Private consultations, champagne, and zero pressure.', icon: 'Eye' },
      { title: 'Bespoke Creations', description: 'Work with our artisans to create one-of-a-kind pieces tailored to your exact specifications.', icon: 'Gem' },
      { title: 'Global Delivery', description: 'White-glove delivery worldwide. Insured, tracked, and presented in signature packaging.', icon: 'Globe' },
      { title: 'Lifetime Care', description: 'Every piece comes with complimentary maintenance, cleaning, and restoration services.', icon: 'Shield' },
    ],

    testimonialsHeading: 'From Our Clients',
    testimonialsSubheading: 'Trusted by collectors and connoisseurs worldwide',
    testimonialTemplates: [
      { text: 'The attention to detail is extraordinary. Every piece tells a story and the craftsmanship is museum-quality. This is what luxury should be.', author: 'Victoria L.', role: 'Art collector, London', rating: 5 },
      { text: 'My concierge found exactly what I was looking for within 24 hours. The personal service and discretion are unmatched in this industry.', author: 'Hassan A.', role: 'Private collector, Dubai', rating: 5 },
      { text: 'Third purchase and each one exceeds expectations. The bespoke experience is truly one-of-a-kind. Worth every moment of the wait.', author: 'James W.', role: 'Long-term client', rating: 5 },
    ],

    ctaHeading: 'Experience the Extraordinary',
    ctaPrimaryButton: 'Request a Private Viewing',
    ctaTrustLine: 'By appointment only · Complimentary consultation · No obligation',

    pricingHeading: 'The Collection',
    pricingSubheading: 'Hand-selected pieces — each one exceptional',

    stats: [
      { value: '500+', label: 'Exclusive pieces' },
      { value: '50+', label: 'Master artisans' },
      { value: '40+', label: 'Countries served' },
      { value: '100%', label: 'Client retention rate' },
    ],

    footerTagline: 'Where exceptional is the standard.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
      'affordable', 'budget', 'cheap', 'discount',
    ],
  },

  media: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Media', '[Domain] Press', '[Adj] Studios', 'The [Domain] Journal'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Compelling stories, stunning visuals, and expert journalism — delivered fresh daily',
    heroPrimaryButton: 'Read Latest',
    heroSecondaryButton: 'Subscribe Now',
    heroTrustBadges: ['Award-Winning', '100K+ Readers', 'Independent Journalism', 'Ad-Free Option'],
    heroImageKeywords: ['modern newsroom editorial', 'podcast studio professional', 'magazine layout editorial'],

    featuresHeading: 'Why Readers Trust Us',
    featuresSubheading: 'Quality journalism, authentic stories, and a community that matters',
    featureItems: [
      { title: 'In-Depth Reporting', description: 'Long-form investigations and analysis that go beyond headlines. The stories that shape our world.', icon: 'BookOpen' },
      { title: 'Expert Contributors', description: 'Industry experts and seasoned journalists who bring depth and credibility to every piece.', icon: 'Users' },
      { title: 'Multimedia Content', description: 'Articles, podcasts, video documentaries, and photo essays — stories told in every medium.', icon: 'Video' },
      { title: 'Community Forums', description: 'Join the conversation. Comment sections, Q&A with authors, and reader discussions.', icon: 'MessageCircle' },
      { title: 'Newsletter', description: 'Weekly curated digest delivered to your inbox. The best stories, no noise.', icon: 'Mail' },
      { title: 'Ad-Free Reading', description: 'Premium members get a clean, distraction-free reading experience. No banners, no pop-ups.', icon: 'Shield' },
    ],

    testimonialsHeading: 'Reader Voices',
    testimonialsSubheading: 'What our community says',
    testimonialTemplates: [
      { text: 'The investigative piece on supply chains was the best journalism I have read all year. Subscribed immediately for more.', author: 'Robert K.', role: 'Subscriber since 2022', rating: 5 },
      { text: 'Finally a publication that respects my time and intelligence. No clickbait, no fluff — just quality stories that matter.', author: 'Ananya P.', role: 'Daily reader', rating: 5 },
      { text: 'The podcast series on climate was incredible. Binge-listened in a weekend. The production quality rivals the big networks.', author: 'Chris M.', role: 'Podcast subscriber', rating: 5 },
    ],

    ctaHeading: 'Stay Informed. Stay Ahead.',
    ctaPrimaryButton: 'Subscribe Now',
    ctaTrustLine: 'First month free · Cancel anytime · Ad-free option available',

    pricingHeading: 'Membership Plans',
    pricingSubheading: 'Support independent journalism and get more from every story',

    stats: [
      { value: '100K+', label: 'Monthly readers' },
      { value: '200+', label: 'Published investigations' },
      { value: '4.9★', label: 'Reader satisfaction' },
      { value: '15+', label: 'Industry awards' },
    ],

    footerTagline: 'Independent journalism that matters. Read without limits.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
    ],
  },

  spa: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Spa', '[Adj] Wellness', 'Zen [City]', 'Serenity Spa'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Rejuvenate your body and mind — premium treatments, tranquil spaces, and expert therapists',
    heroPrimaryButton: 'Book a Treatment',
    heroSecondaryButton: 'View Services',
    heroTrustBadges: ['Certified Therapists', 'Premium Products', 'Tranquil Environment', 'Same-Day Booking'],
    heroImageKeywords: ['luxury spa treatment room', 'relaxing massage therapy', 'spa stones candles peaceful'],

    featuresHeading: 'Your Sanctuary',
    featuresSubheading: 'Where stress melts away and wellness begins',
    featureItems: [
      { title: 'Expert Therapists', description: 'Certified professionals with years of experience in massage, aromatherapy, and holistic wellness.', icon: 'Users' },
      { title: 'Premium Products', description: 'Only the finest organic and natural products — no harsh chemicals, no artificial fragrances.', icon: 'Leaf' },
      { title: 'Tranquil Spaces', description: 'Designed for calm. Soft lighting, soothing music, and private treatment rooms.', icon: 'Sun' },
      { title: 'Personalised Treatments', description: 'Every treatment is tailored to your needs. Consultation before every session.', icon: 'Heart' },
      { title: 'Flexible Booking', description: 'Book online in seconds. Same-day appointments available. Cancel up to 4 hours before.', icon: 'Calendar' },
      { title: 'Membership Benefits', description: 'Members get priority booking, exclusive discounts, and complimentary add-ons.', icon: 'Crown' },
    ],

    testimonialsHeading: 'Guest Experiences',
    testimonialsSubheading: 'Real stories from people who found their calm',
    testimonialTemplates: [
      { text: 'The deep tissue massage was exactly what I needed. The therapist was skilled and attentive. I left feeling like a new person.', author: 'Michelle S.', role: 'Regular guest', rating: 5 },
      { text: 'Booked a couples spa day for our anniversary. The private suite was beautiful and the treatments were heavenly. Will definitely return.', author: 'David & Lisa K.', role: 'Anniversary visit', rating: 5 },
      { text: 'Best spa experience I have ever had. The atmosphere, the products, the therapists — everything was perfect. Pure bliss.', author: 'Ananya R.', role: 'First-time visitor', rating: 5 },
    ],

    ctaHeading: 'Treat Yourself to Wellness',
    ctaPrimaryButton: 'Book Your Treatment',
    ctaTrustLine: 'Same-day booking · Free cancellation · Complimentary herbal tea with every visit',

    pricingHeading: 'Treatment Menu',
    pricingSubheading: 'Massages, facials, body treatments, and wellness packages',

    stats: [
      { value: '5,000+', label: 'Happy clients' },
      { value: '30+', label: 'Treatment options' },
      { value: '15+', label: 'Expert therapists' },
      { value: '4.9★', label: 'Average guest rating' },
    ],

    footerTagline: 'Your wellness journey begins here. Breathe deep, relax completely.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'stylist', 'hair', 'cut', 'colour', 'blow-dry',
      'get started free', 'no credit card required', 'saas', 'workflow',
    ],
  },

  healthcare: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[City] Medical Centre', '[Name] Clinic', '[City] Health', '[Adj] Care'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Expert medical care for the whole family — book appointments online, available 6 days a week',
    heroPrimaryButton: 'Book an Appointment',
    heroSecondaryButton: 'Our Services',
    heroTrustBadges: ['Same-day Appointments', 'Board-certified Doctors', 'Insurance Accepted'],
    heroImageKeywords: ['modern medical clinic interior', 'doctor patient consultation', 'healthcare professional'],

    featuresHeading: 'Comprehensive Care You Can Trust',
    featuresSubheading: 'Advanced medicine, compassionate care',
    featureItems: [
      { title: 'Experienced Specialists', description: 'Board-certified doctors with subspecialty training across general medicine, cardiology, and more.', icon: 'Stethoscope' },
      { title: 'Online Appointments', description: 'Book an appointment in minutes — choose your doctor, date, and time. Instant confirmation.', icon: 'Calendar' },
      { title: 'Telemedicine', description: 'Consult with your doctor via video call from anywhere. Same quality care, zero commute.', icon: 'Video' },
      { title: 'Digital Health Records', description: 'Secure patient portal for test results, prescriptions, and appointment history — always accessible.', icon: 'FileText' },
      { title: 'Diagnostic Services', description: 'In-house lab, imaging, and diagnostic services with results typically within 24 hours.', icon: 'Activity' },
      { title: 'Insurance Accepted', description: 'We work with all major insurance providers and offer transparent self-pay pricing.', icon: 'Shield' },
    ],

    testimonialsHeading: 'Patient Stories',
    testimonialsSubheading: 'Thousands of patients trust us with their health',
    testimonialTemplates: [
      { text: 'The doctors here are exceptional — they take the time to actually listen and explain everything clearly. Appointments run on time and the staff are genuinely caring.', author: 'Mary F.', role: 'Patient for 3 years', rating: 5 },
      { text: 'I switched from another clinic and the difference is night and day. Same-day appointments when you\'re unwell, online booking, and results through the portal within hours.', author: 'Suresh K.', role: 'Family patient', rating: 5 },
      { text: 'The telemedicine service has been a game-changer for our family. Genuine, attentive medical advice without the wait or the travel.', author: 'Emma L.', role: 'Telehealth patient', rating: 5 },
    ],

    ctaHeading: 'Your Health Can\'t Wait',
    ctaPrimaryButton: 'Book an Appointment',
    ctaTrustLine: 'Same-day appointments available · Insurance accepted · Online booking 24/7',

    pricingHeading: 'Our Services',
    pricingSubheading: 'Primary care, specialist consultations, and diagnostic services',

    stats: [
      { value: '5,000+', label: 'Patients served' },
      { value: '15+', label: 'Specialist doctors' },
      { value: '6', label: 'Days a week' },
      { value: '24hr', label: 'Average test result turnaround' },
    ],

    footerTagline: 'Your health is our priority — expert care, every visit.',

    forbiddenPhrases: [
      'get started free', 'sign up for the platform', 'no credit card required',
      'saas capabilities', 'workflow roi', 'trusted by thousands of businesses',
      'subscription plan per user', 'api integration', 'instant setup',
    ],
  },

  perfume: {
    nameFromPrompt: true,
    nameFallbackPatterns: ['[Adj] Parfums', '[Brand] Atelier', 'Maison [Adj]', '[City] Scent', 'AETHERIA'],

    heroPrimaryHeading: '{appName}',
    heroSubheading: 'Fragrance as an experience — discover scent through scroll, where every layer reveals a new dimension.',
    heroPrimaryButton: 'Begin the Journey',
    heroSecondaryButton: 'Explore Collection',
    heroTrustBadges: ['Master Perfumers', 'Ethically Sourced', 'Refillable Vessels', 'Carbon-Neutral'],
    heroImageKeywords: ['luxury perfume bottle dark', 'perfume fragrance editorial', 'gold perfume bottle minimalist'],

    featuresHeading: 'The AETHERIA Difference',
    featuresSubheading: 'More than a fragrance — a journey told in scent',
    featureItems: [
      { title: 'Layered Reveals', description: 'Experience each fragrance note unfold as you scroll — top, heart, and base, in perfect sequence.', icon: 'Layers' },
      { title: 'Artisan Crafted', description: 'Every scent composed by master perfumers using rare, ethically sourced ingredients.', icon: 'Sparkles' },
      { title: 'Personalized Discovery', description: 'A guided scent profile that learns your preferences with every interaction.', icon: 'Compass' },
      { title: 'Refillable Vessels', description: 'Sustainable, refillable bottles in weighted glass — luxury that respects the planet.', icon: 'Recycle' },
      { title: 'Bespoke Engraving', description: 'Personalize your bottle with complimentary engraving on every order.', icon: 'PenTool' },
      { title: 'Global Concierge', description: 'White-glove service with complimentary worldwide shipping and returns.', icon: 'Globe' },
    ],

    testimonialsHeading: 'Wearer Voices',
    testimonialsSubheading: 'What our community says',
    testimonialTemplates: [
      { text: 'I have never experienced a fragrance website like this. Scrolling through the notes felt like the scent was unfolding on my skin. Truly transportive.', author: 'Camille R.', role: 'Fragrance enthusiast, Paris', rating: 5 },
      { text: 'The oud is devastatingly good. The way the site reveals each layer made me understand the perfume before it even arrived.', author: 'Yuki T.', role: 'Collector, Tokyo', rating: 5 },
      { text: 'Bought Lumière Dorée after the scroll journey. It is now my signature. The whole experience felt like a maison, not a checkout.', author: 'Daniela M.', role: 'Loyal client', rating: 5 },
    ],

    ctaHeading: 'Find Your Scent',
    ctaPrimaryButton: 'Explore the Collection',
    ctaTrustLine: 'Complimentary samples · Carbon-neutral delivery · Refill for life',

    pricingHeading: 'The Collection',
    pricingSubheading: 'Six signatures — each a world of its own',

    stats: [
      { value: '40+', label: 'Rare ingredients' },
      { value: '6', label: 'Signature scents' },
      { value: '12', label: 'Master perfumers' },
      { value: '100%', label: 'Refillable vessels' },
    ],

    footerTagline: 'Fragrance is memory. Wear yours.',

    forbiddenPhrases: [
      'reserve your table', 'seasonal menu', 'chef', 'dine in', 'menu',
      'get started free', 'no credit card required', 'saas', 'workflow',
      'roi', 'api integration', 'subscription plan per user',
      'affordable', 'budget', 'cheap', 'discount',
    ],
  },
}

// Alias: "fragrance" resolves to the same schema as "perfume".
// (Added after declaration to avoid self-reference TDZ in the const literal.)
INDUSTRY_COPY['fragrance'] = INDUSTRY_COPY['perfume'];

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Get the copy schema for an industry. Falls back gracefully.
 * Never falls back to SaaS for non-SaaS industries.
 */
export function getIndustryCopy(industry: string): IndustryCopySchema {
  const normalized = industry.toLowerCase().replace(/[\s-_]+/g, '-')

  // Direct match
  if (INDUSTRY_COPY[normalized]) return INDUSTRY_COPY[normalized]

  // Sub-industry checks (spa before salon, since spa shares salon keywords)
  if (normalized.includes('spa') || normalized.includes('wellness') || normalized.includes('massage')) {
    return INDUSTRY_COPY['spa'] ?? INDUSTRY_COPY['salon']
  }

  // Fuzzy match
  const fuzzy = Object.keys(INDUSTRY_COPY).find(k =>
    k.includes(normalized) || normalized.includes(k)
  )
  if (fuzzy) return INDUSTRY_COPY[fuzzy]

  // For non-SaaS industries we don't have yet, use restaurant as default
  // (it's neutral enough not to embarrass a real business) until a specific
  // schema is added. Never fall back to SaaS.
  // B2B/wholesale industries should never get restaurant copy.
  const isLikelySaas = ['saas', 'software', 'app', 'platform', 'tech', 'startup'].some(
    kw => normalized.includes(kw)
  )
  const isLikelyB2B = ['wholesale', 'b2b', 'distributor', 'supply', 'procurement', 'trade', 'bulk', 'manufacturing', 'industrial'].some(
    kw => normalized.includes(kw)
  )
  if (isLikelyB2B) return INDUSTRY_COPY['wholesale']
  return INDUSTRY_COPY[isLikelySaas ? 'saas' : 'restaurant']
}

/**
 * Check if a generated string contains forbidden phrases for this industry.
 * Returns the offending phrase if found, null if clean.
 */
export function detectForbiddenPhrase(text: string, industry: string): string | null {
  const schema = getIndustryCopy(industry)
  const lower = text.toLowerCase()
  return schema.forbiddenPhrases.find(phrase => lower.includes(phrase)) ?? null
}
