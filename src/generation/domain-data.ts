export interface DomainMockData {
  hero: { badge: string; headline: string; subtitle: string; cta: string; ctaSecondary?: string };
  stats: Array<{ value: string; label: string }>;
  items: Array<{ name: string; description: string; price?: number; tag?: string; rating?: number; reviews?: number; emoji: string; details?: string[] }>;
  testimonials: Array<{ name: string; role: string; text: string; rating: number }>;
  features: Array<{ icon: string; title: string; description: string; iconKeyword?: string }>;
  services: Array<{ name: string; description: string; icon: string }>;
  team: Array<{ name: string; role: string; bio: string; emoji: string }>;
  cta: { headline: string; subtitle: string; button: string };
  footer: { tagline: string; links: Array<{ label: string; href: string }> };
  imageKeywords: string[];
}

const DOMAIN_DATA: Record<string, DomainMockData> = {
  'real-estate': {
    hero: {
      badge: 'Featured Listings',
      headline: 'Find Your Dream Property',
      subtitle: 'Explore curated luxury homes, apartments, and commercial properties in the most sought-after locations.',
      cta: 'Browse Properties',
      ctaSecondary: 'Schedule a Tour',
    },
    stats: [
      { value: '2,400+', label: 'Properties Listed' },
      { value: '$2.1B', label: 'In Sales Volume' },
      { value: '98%', label: 'Client Satisfaction' },
      { value: '15+', label: 'Years Experience' },
    ],
    items: [
      { name: 'Oceanview Penthouse', description: 'Stunning 3-bed penthouse with panoramic ocean views, modern finishes, and private terrace.', price: 4250000, tag: 'Exclusive', rating: 4.9, reviews: 47, emoji: '🏖️', details: ['3 Bed', '3.5 Bath', '2,800 sqft', 'Ocean View'] },
      { name: 'Downtown Loft', description: 'Industrial-chic loft in the heart of the financial district. Floor-to-ceiling windows.', price: 1850000, tag: 'New', rating: 4.8, reviews: 32, emoji: '🏙️', details: ['2 Bed', '2 Bath', '1,400 sqft', 'City View'] },
      { name: 'Suburban Family Home', description: 'Spacious 4-bed home with updated kitchen, large backyard, and top-rated schools nearby.', price: 975000, tag: 'Popular', rating: 4.7, reviews: 68, emoji: '🏡', details: ['4 Bed', '3 Bath', '2,400 sqft', 'Garden'] },
      { name: 'Modern Studio', description: 'Sleek studio apartment with smart home features and premium building amenities.', price: 485000, tag: 'Value', rating: 4.6, reviews: 91, emoji: '🏢', details: ['Studio', '1 Bath', '550 sqft', 'Rooftop'] },
    ],
    testimonials: [
      { name: 'Sarah Mitchell', role: 'Homeowner', text: 'Found our dream home in just two weeks. The virtual tours saved us so much time. Incredibly professional service.', rating: 5 },
      { name: 'James Rodriguez', role: 'Investor', text: 'Outstanding market knowledge. They helped me close three investment properties below market value.', rating: 5 },
      { name: 'Emily Chen', role: 'First-time Buyer', text: 'Made the entire process stress-free. They walked me through every step and negotiated a great price.', rating: 5 },
    ],
    features: [
      { icon: '🏠', title: 'Virtual Tours', description: 'Explore properties from home with immersive 360° virtual walkthroughs.', iconKeyword: 'virtual tour' },
      { icon: '📍', title: 'Neighborhood Insights', description: 'Detailed area guides with schools, amenities, and commute times.', iconKeyword: 'location' },
      { icon: '💰', title: 'Mortgage Calculator', description: 'Estimate your monthly payments and compare financing options.', iconKeyword: 'dollar' },
      { icon: '📱', title: 'Instant Alerts', description: 'Get notified the moment a property matching your criteria hits the market.', iconKeyword: 'notification' },
      { icon: '🤝', title: 'Expert Agents', description: 'Work with licensed agents who specialize in your target area.', iconKeyword: 'team' },
      { icon: '📊', title: 'Market Analysis', description: 'Real-time pricing trends and comparable sales data.', iconKeyword: 'analytics' },
    ],
    services: [
      { name: 'Buyer Representation', description: 'Dedicated agent to guide you through every step of the purchase.', icon: '🏠' },
      { name: 'Seller Marketing', description: 'Professional photography, staging, and multi-platform listing exposure.', icon: '📸' },
      { name: 'Property Management', description: 'Full-service management for rental properties and investment portfolios.', icon: '🔑' },
      { name: 'Investment Consulting', description: 'Market analysis and ROI projections for real estate investors.', icon: '📈' },
    ],
    team: [
      { name: 'Victoria Sterling', role: 'Lead Agent', bio: '15+ years in luxury real estate. Top 1% agent nationally.', emoji: '👩‍💼' },
      { name: 'Michael Torres', role: 'Buyer Specialist', bio: 'First-time buyer expert with a 98% satisfaction rate.', emoji: '👨‍💼' },
      { name: 'Sarah Kim', role: 'Property Manager', bio: 'Manages 200+ properties with average 97% occupancy.', emoji: '👩‍🔧' },
    ],
    cta: { headline: 'Ready to Find Your Next Property?', subtitle: 'Browse our exclusive listings or schedule a private viewing today.', button: 'Start Searching' },
    footer: { tagline: 'Your trusted partner in finding the perfect property.', links: [{ label: 'Listings', href: '/listings' }, { label: 'Agents', href: '/agents' }, { label: 'Market Report', href: '/market' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['luxury home', 'modern house', 'apartment interior', 'real estate'],
  },
  'restaurant': {
    hero: {
      badge: 'Open Daily',
      headline: 'Experience Culinary Excellence',
      subtitle: 'Farm-to-table cuisine crafted with passion. Reserve your table for an unforgettable dining experience.',
      cta: 'View Menu',
      ctaSecondary: 'Reserve a Table',
    },
    stats: [
      { value: '4.9★', label: 'Yelp Rating' },
      { value: '120+', label: 'Menu Items' },
      { value: '15K+', label: 'Happy Diners' },
      { value: '8', label: 'Years Serving' },
    ],
    items: [
      { name: 'Truffle Risotto', description: 'Creamy arborio rice with black truffle, parmesan, and seasonal mushrooms.', price: 28, tag: 'Chef\'s Pick', rating: 4.9, reviews: 342, emoji: '🍄' },
      { name: 'Grilled Salmon', description: 'Wild-caught salmon with lemon herb butter, roasted vegetables, and quinoa.', price: 32, tag: 'Popular', rating: 4.8, reviews: 289, emoji: '🐟' },
      { name: 'Wagyu Burger', description: 'A5 wagyu patty with caramelized onions, aged cheddar, and house-made pickles.', price: 24, rating: 4.7, reviews: 456, emoji: '🍔' },
      { name: 'Tiramisu', description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.', price: 14, tag: 'Must Try', rating: 4.9, reviews: 567, emoji: '🍰' },
    ],
    testimonials: [
      { name: 'David Park', role: 'Food Critic', text: 'The best dining experience I\'ve had this year. Every dish was a masterpiece. The truffle risotto alone is worth the visit.', rating: 5 },
      { name: 'Lisa Thompson', role: 'Regular Diner', text: 'We celebrate every anniversary here. The service is impeccable and the food never disappoints.', rating: 5 },
      { name: 'Marco Rossi', role: 'Chef', text: 'As a chef myself, I appreciate the attention to detail. The ingredient quality is outstanding.', rating: 5 },
    ],
    features: [
      { icon: '🌿', title: 'Farm-to-Table', description: 'Locally sourced ingredients from partner farms within 50 miles.', iconKeyword: 'refresh' },
      { icon: '🍷', title: 'Curated Wine List', description: 'Over 200 labels from renowned vineyards around the world.', iconKeyword: 'coffee' },
      { icon: '👨‍🍳', title: 'Open Kitchen', description: 'Watch our chefs craft your meal in our state-of-the-art open kitchen.', iconKeyword: 'tool' },
      { icon: '🎵', title: 'Live Music', description: 'Jazz performances every Friday and Saturday evening.', iconKeyword: 'music' },
      { icon: '🚗', title: 'Valet Parking', description: 'Complimentary valet service for all dinner reservations.', iconKeyword: 'car' },
      { icon: '📱', title: 'Online Reservations', description: 'Book your table instantly through our website or app.', iconKeyword: 'reservation' },
    ],
    services: [
      { name: 'Dine-In', description: 'Intimate seating, private rooms, and chef\'s table experiences.', icon: '🍽️' },
      { name: 'Catering', description: 'Full-service catering for events from 20 to 500 guests.', icon: '🎉' },
      { name: 'Private Events', description: 'Exclusive use of our private dining room for special occasions.', icon: '🥂' },
      { name: 'Cooking Classes', description: 'Learn from our executive chef in hands-on cooking workshops.', icon: '👨‍🍳' },
    ],
    team: [
      { name: 'Chef Antoine Dubois', role: 'Executive Chef', bio: 'Michelin-trained chef with 20 years of fine dining experience.', emoji: '👨‍🍳' },
      { name: 'Maria Santos', role: 'General Manager', bio: 'Hospitality expert ensuring every guest has a perfect experience.', emoji: '👩‍💼' },
      { name: 'James Wright', role: 'Sommelier', bio: 'Certified sommelier with expertise in Old and New World wines.', emoji: '🍷' },
    ],
    cta: { headline: 'Your Table Awaits', subtitle: 'Make a reservation and experience the finest dining in town.', button: 'Reserve Now' },
    footer: { tagline: 'Crafting memorable dining experiences since 2018.', links: [{ label: 'Menu', href: '/menu' }, { label: 'Reservations', href: '/reservations' }, { label: 'Events', href: '/events' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['fine dining', 'restaurant interior', 'gourmet food', 'chef cooking'],
  },
  'fitness': {
    hero: {
      badge: 'Start Your Journey',
      headline: 'Transform Your Body & Mind',
      subtitle: 'State-of-the-art equipment, expert trainers, and a supportive community to help you reach your goals.',
      cta: 'Join Now',
      ctaSecondary: 'View Classes',
    },
    stats: [
      { value: '5,000+', label: 'Active Members' },
      { value: '50+', label: 'Weekly Classes' },
      { value: '20', label: 'Expert Trainers' },
      { value: '24/7', label: 'Gym Access' },
    ],
    items: [
      { name: 'Personal Training', description: 'One-on-one sessions with certified trainers tailored to your goals.', price: 89, tag: 'Most Popular', rating: 4.9, reviews: 234, emoji: '💪', details: ['60 min sessions', 'Custom plan', 'Nutrition guidance'] },
      { name: 'Group HIIT', description: 'High-intensity interval training in a motivating group environment.', price: 29, tag: 'Energy', rating: 4.8, reviews: 567, emoji: '🔥', details: ['45 min', 'All levels', '300+ cal burn'] },
      { name: 'Yoga Flow', description: 'Mind-body connection through flowing sequences and breathwork.', price: 25, tag: 'Zen', rating: 4.9, reviews: 432, emoji: '🧘', details: ['60 min', 'Flexibility', 'Stress relief'] },
      { name: 'Strength Camp', description: 'Build muscle and endurance with progressive overload training.', price: 35, rating: 4.7, reviews: 189, emoji: '🏋️', details: ['75 min', 'Muscle building', 'All levels'] },
    ],
    testimonials: [
      { name: 'Mike Johnson', role: 'Member since 2023', text: 'Lost 30 pounds in 4 months. The trainers here actually care about your progress. Best investment in myself.', rating: 5 },
      { name: 'Rachel Green', role: 'Member since 2024', text: 'The group classes are addictive! I\'ve never been so consistent with my fitness. Love the community.', rating: 5 },
      { name: 'Tom Williams', role: 'Member since 2022', text: 'From couch potato to marathon runner. The coaching here made it possible. Forever grateful.', rating: 5 },
    ],
    features: [
      { icon: '🏋️', title: 'Premium Equipment', description: 'Latest Technogym and Rogue equipment across 10,000 sqft.' },
      { icon: '📱', title: 'Fitness App', description: 'Track workouts, book classes, and monitor progress from your phone.' },
      { icon: '🚿', title: 'Luxury Amenities', description: 'Spa, sauna, steam room, and towel service included.' },
      { icon: '🥗', title: 'Juice Bar', description: 'Fresh smoothies and protein shakes post-workout.' },
      { icon: '🅿️', title: 'Free Parking', description: 'Spacious parking lot with EV charging stations.' },
      { icon: '👶', title: 'Childcare', description: 'Free supervised childcare while you train.' },
    ],
    services: [
      { name: 'Personal Training', description: 'Customized 1-on-1 training programs.', icon: '💪' },
      { name: 'Group Fitness', description: '40+ weekly classes from HIIT to yoga.', icon: '🤸' },
      { name: 'Nutrition Coaching', description: 'Meal plans and macro tracking support.', icon: '🥗' },
      { name: 'Corporate Wellness', description: 'Group rates and team building fitness events.', icon: '🏢' },
    ],
    team: [
      { name: 'Coach Alex Rivera', role: 'Head Trainer', bio: 'NASM certified, 12 years experience, specializes in body transformation.', emoji: '💪' },
      { name: 'Sarah Chen', role: 'Yoga Instructor', bio: 'RYT-500 certified, teaches vinyasa and restorative yoga.', emoji: '🧘' },
      { name: 'Marcus Thompson', role: 'Strength Coach', bio: 'CSCS certified, former collegiate athlete, powerlifting specialist.', emoji: '🏋️' },
    ],
    cta: { headline: 'Your Transformation Starts Here', subtitle: 'Join today and get your first week free plus a complimentary assessment.', button: 'Start Free Trial' },
    footer: { tagline: 'Building stronger bodies and minds since 2019.', links: [{ label: 'Classes', href: '/classes' }, { label: 'Trainers', href: '/trainers' }, { label: 'Membership', href: '/membership' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['gym interior', 'personal training', 'yoga class', 'fitness workout'],
  },
  'saas': {
    hero: {
      badge: 'Trusted by 10,000+ Teams',
      headline: 'Ship Faster with Less Complexity',
      subtitle: 'The all-in-one platform that streamlines your workflow, automates repetitive tasks, and gives you real-time insights.',
      cta: 'Start Free Trial',
      ctaSecondary: 'Watch Demo',
    },
    stats: [
      { value: '10K+', label: 'Teams Using It' },
      { value: '99.9%', label: 'Uptime SLA' },
      { value: '4.9★', label: 'G2 Rating' },
      { value: '&lt; 2s', label: 'Avg Response' },
    ],
    items: [
      { name: 'Starter', description: 'Perfect for small teams getting started.', price: 19, tag: 'Popular', rating: 4.7, reviews: 892, emoji: '🚀', details: ['5 users', '10GB storage', 'Email support', 'Basic analytics'] },
      { name: 'Professional', description: 'For growing teams that need more power.', price: 49, tag: 'Best Value', rating: 4.8, reviews: 1234, emoji: '⚡', details: ['25 users', '100GB storage', 'Priority support', 'Advanced analytics', 'API access'] },
      { name: 'Enterprise', description: 'For large organizations with custom needs.', price: 149, tag: 'Scale', rating: 4.9, reviews: 567, emoji: '🏢', details: ['Unlimited users', '1TB storage', '24/7 support', 'Custom integrations', 'SSO', 'SLA'] },
      { name: 'Team Add-on', description: 'Add extra team members to any plan.', price: 12, emoji: '👥', details: ['Per user/month', 'All plan features', 'Shared workspace'] },
    ],
    testimonials: [
      { name: 'Jason Kim', role: 'CTO at StartupCo', text: 'Cut our deployment time by 60%. The automation features alone saved us 20 hours per week.', rating: 5 },
      { name: 'Amanda Foster', role: 'Product Lead', text: 'Finally a tool that does what it promises. Our team adopted it in under a day. Game changer.', rating: 5 },
      { name: 'Carlos Mendez', role: 'DevOps Engineer', text: 'The best developer experience I\'ve used. Clean API, great docs, and the support team is incredibly responsive.', rating: 5 },
    ],
    features: [
      { icon: '⚡', title: 'Lightning Fast', description: 'Sub-second response times with global CDN and edge computing.', iconKeyword: 'lightning' },
      { icon: '🔌', title: '200+ Integrations', description: 'Connect with Slack, GitHub, Jira, and all your favorite tools.', iconKeyword: 'integration' },
      { icon: '🔒', title: 'SOC 2 Compliant', description: 'Enterprise-grade security with end-to-end encryption.', iconKeyword: 'security' },
      { icon: '📊', title: 'Real-time Analytics', description: 'Track usage, performance, and ROI with live dashboards.', iconKeyword: 'analytics' },
      { icon: '🤖', title: 'AI-Powered', description: 'Smart suggestions and automation powered by machine learning.', iconKeyword: 'ai' },
      { icon: '🌍', title: 'Global Scale', description: 'Deploy across 30+ regions with automatic failover.', iconKeyword: 'global' },
    ],
    services: [
      { name: 'Onboarding', description: 'White-glove setup and team training.', icon: '🎓' },
      { name: 'API Platform', description: 'RESTful API with webhooks and SDKs.', icon: '🔌' },
      { name: 'Custom Development', description: 'Bespoke features and integrations.', icon: '🛠️' },
      { name: 'Premium Support', description: 'Dedicated success manager and SLA.', icon: '💬' },
    ],
    team: [
      { name: 'Priya Sharma', role: 'CEO & Co-founder', bio: 'Former Google PM. Built products used by millions.', emoji: '👩‍💻' },
      { name: 'David Park', role: 'CTO & Co-founder', bio: 'Ex-Stripe engineer. Scaled systems to 100M+ requests/day.', emoji: '👨‍💻' },
      { name: 'Lisa Wang', role: 'Head of Design', bio: 'Award-winning designer. Obsessed with user experience.', emoji: '🎨' },
    ],
    cta: { headline: 'Start Building Today', subtitle: 'Free 14-day trial. No credit card required. Set up in under 5 minutes.', button: 'Get Started Free' },
    footer: { tagline: 'Empowering teams to build better software.', links: [{ label: 'Product', href: '/product' }, { label: 'Pricing', href: '/pricing' }, { label: 'Docs', href: '/docs' }, { label: 'Status', href: '/status' }] },
    imageKeywords: ['dashboard', 'software interface', 'analytics', 'team collaboration'],
  },
  'healthcare': {
    hero: {
      badge: 'Accepting New Patients',
      headline: 'Compassionate Care for Every Patient',
      subtitle: 'Board-certified physicians providing personalized treatment plans with state-of-the-art technology.',
      cta: 'Book Appointment',
      ctaSecondary: 'Our Services',
    },
    stats: [
      { value: '15K+', label: 'Patients Served' },
      { value: '20+', label: 'Specialists' },
      { value: '4.9★', label: 'Patient Rating' },
      { value: '15+', label: 'Years Practice' },
    ],
    items: [
      { name: 'General Checkup', description: 'Comprehensive health assessment with blood work and vitals.', price: 150, tag: 'Essential', rating: 4.8, reviews: 892, emoji: '🩺', details: ['30 min', 'Full physical', 'Lab results'] },
      { name: 'Dental Cleaning', description: 'Professional cleaning, exam, and digital x-rays.', price: 120, tag: 'Preventive', rating: 4.9, reviews: 567, emoji: '🦷', details: ['45 min', 'X-rays included', 'Fluoride treat'] },
      { name: 'Physical Therapy', description: 'Personalized rehab program for injury recovery.', price: 95, rating: 4.7, reviews: 345, emoji: '🏥', details: ['60 min', 'Custom plan', 'Progress tracking'] },
      { name: 'Telehealth Visit', description: 'Consult with a doctor from the comfort of your home.', price: 75, tag: 'Convenient', rating: 4.8, reviews: 1234, emoji: '💻', details: ['20 min', 'Video call', 'Prescription ready'] },
    ],
    testimonials: [
      { name: 'Patricia Adams', role: 'Patient', text: 'Dr. Smith took the time to explain everything. I finally feel like my doctor actually listens to me.', rating: 5 },
      { name: 'Robert Chen', role: 'Patient', text: 'The online booking is so convenient. Got an appointment the same day. Staff is incredibly friendly.', rating: 5 },
      { name: 'Angela Davis', role: 'Patient', text: 'Best medical practice I\'ve ever been to. The telehealth option is a lifesaver for busy schedules.', rating: 5 },
    ],
    features: [
      { icon: '🕐', title: 'Same-Day Appointments', description: 'Walk-ins welcome and same-day booking available.', iconKeyword: 'clock' },
      { icon: '💻', title: 'Telehealth', description: 'Virtual visits from anywhere with secure video.', iconKeyword: 'monitor' },
      { icon: '📋', title: 'Patient Portal', description: 'Access records, lab results, and prescriptions online.', iconKeyword: 'book' },
      { icon: '💳', title: 'Insurance Accepted', description: 'We accept most major insurance plans.', iconKeyword: 'creditCard' },
      { icon: '🅿️', title: 'Free Parking', description: 'Ample free parking right at our entrance.', iconKeyword: 'car' },
      { icon: '🌙', title: 'Extended Hours', description: 'Early morning and evening appointments available.', iconKeyword: 'time' },
    ],
    services: [
      { name: 'Primary Care', description: 'Comprehensive health management for all ages.', icon: '🩺' },
      { name: 'Dental Services', description: 'Complete dental care from cleanings to implants.', icon: '🦷' },
      { name: 'Physical Therapy', description: 'Rehab and recovery programs.', icon: '🏥' },
      { name: 'Mental Health', description: 'Counseling and psychiatric services.', icon: '🧠' },
    ],
    team: [
      { name: 'Dr. Sarah Smith', role: 'Medical Director', bio: 'Board-certified internist, 20 years experience.', emoji: '👩‍⚕️' },
      { name: 'Dr. Michael Lee', role: 'Dentist', bio: 'Cosmetic and general dentistry specialist.', emoji: '🦷' },
      { name: 'Dr. Rachel Green', role: 'Physical Therapist', bio: 'Sports rehab and orthopedic specialist.', emoji: '🏥' },
    ],
    cta: { headline: 'Your Health Can\'t Wait', subtitle: 'Schedule your appointment today and experience healthcare that cares.', button: 'Book Now' },
    footer: { tagline: 'Caring for our community since 2009.', links: [{ label: 'Services', href: '/services' }, { label: 'Providers', href: '/providers' }, { label: 'Patient Portal', href: '/portal' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['doctor office', 'medical clinic', 'healthcare professional', 'patient care'],
  },
  'law-firm': {
    hero: {
      badge: 'Free Consultation',
      headline: 'Fiercely Defending Your Rights',
      subtitle: 'Experienced attorneys with a proven track record. We fight for the outcomes you deserve.',
      cta: 'Free Consultation',
      ctaSecondary: 'Our Practice Areas',
    },
    stats: [
      { value: '5,000+', label: 'Cases Won' },
      { value: '95%', label: 'Success Rate' },
      { value: '30+', label: 'Years Experience' },
      { value: '24/7', label: 'Availability' },
    ],
    items: [
      { name: 'Personal Injury', description: 'Car accidents, slip and fall, medical malpractice. We recover what you\'re owed.', tag: 'No Win No Fee', rating: 4.9, reviews: 456, emoji: '⚖️', details: ['Free consultation', 'No upfront costs', 'Max compensation'] },
      { name: 'Family Law', description: 'Divorce, custody, spousal support. Compassionate guidance through difficult times.', rating: 4.8, reviews: 321, emoji: '👨‍👩‍👧', details: ['Mediation available', 'Child custody', 'Asset division'] },
      { name: 'Criminal Defense', description: 'DUI, felony, misdemeanor defense. Protecting your freedom and future.', rating: 4.9, reviews: 234, emoji: '🛡️', details: ['24/7 arrest help', 'Plea negotiations', 'Trial ready'] },
      { name: 'Business Law', description: 'Contracts, incorporation, disputes. Strategic legal counsel for businesses.', rating: 4.7, reviews: 189, emoji: '💼', details: ['Contract review', 'Business formation', 'Dispute resolution'] },
    ],
    testimonials: [
      { name: 'Thomas Brown', role: 'Client', text: 'They got me 3x more than the insurance company offered. The entire process was smooth and professional.', rating: 5 },
      { name: 'Jennifer Martinez', role: 'Client', text: 'During my divorce, they were both aggressive in court and compassionate in person. I couldn\'t have asked for better representation.', rating: 5 },
      { name: 'Robert Lee', role: 'Business Owner', text: 'They set up my entire business legally and handled a complex merger. Worth every penny.', rating: 5 },
    ],
    features: [
      { icon: '💰', title: 'No Win No Fee', description: 'You don\'t pay unless we win your case. Zero financial risk.' },
      { icon: '⏰', title: '24/7 Availability', description: 'Call anytime. We respond within 1 hour, day or night.' },
      { icon: '🏆', title: 'Proven Track Record', description: '$500M+ recovered for our clients over 30 years.' },
      { icon: '🤝', title: 'Free Consultation', description: 'No-obligation case review with experienced attorneys.' },
      { icon: '📱', title: 'Case Updates', description: 'Real-time updates on your case through our client portal.' },
      { icon: '🌍', title: 'Multilingual', description: 'Services available in English, Spanish, and Mandarin.' },
    ],
    services: [
      { name: 'Personal Injury', description: 'Maximum compensation for accident victims.', icon: '⚖️' },
      { name: 'Family Law', description: 'Divorce, custody, and support matters.', icon: '👨‍👩‍👧' },
      { name: 'Criminal Defense', description: 'Protecting your rights and freedom.', icon: '🛡️' },
      { name: 'Business Law', description: 'Legal counsel for businesses of all sizes.', icon: '💼' },
    ],
    team: [
      { name: 'Richard Harrison', role: 'Managing Partner', bio: '30 years trial experience. Super Lawyer 10 years running.', emoji: '⚖️' },
      { name: 'Sarah Mitchell', role: 'Senior Partner', bio: 'Family law specialist. Certified mediator and litigator.', emoji: '👩‍⚖️' },
      { name: 'David Kim', role: 'Associate Attorney', bio: 'Criminal defense expert. Former public defender.', emoji: '🛡️' },
    ],
    cta: { headline: 'Don\'t Face Legal Challenges Alone', subtitle: 'Get a free, no-obligation consultation with an experienced attorney today.', button: 'Call Now' },
    footer: { tagline: 'Fighting for justice since 1994.', links: [{ label: 'Practice Areas', href: '/practice-areas' }, { label: 'Attorneys', href: '/attorneys' }, { label: 'Case Results', href: '/results' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['law office', 'courtroom', 'legal books', 'attorney consultation'],
  },
  'ecommerce': {
    hero: {
      badge: 'New Collection',
      headline: 'Discover What We Offer',
      subtitle: 'Curated products for people who appreciate quality. Browse our collection and find exactly what you need.',
      cta: 'Shop Now',
      ctaSecondary: 'View Collections',
    },
    stats: [
      { value: '1,000+', label: 'Products' },
      { value: '50K+', label: 'Happy Customers' },
      { value: '4.9★', label: 'Average Rating' },
      { value: 'Free', label: 'Shipping 50+' },
    ],
    items: [
      { name: 'Premium Essential', description: 'Our bestselling product. Premium materials with meticulous craftsmanship.', price: 89, tag: 'Bestseller', rating: 4.9, reviews: 1234, emoji: '⭐' },
      { name: 'Classic Collection', description: 'Timeless design that never goes out of style. Available in 6 colors.', price: 65, tag: 'Popular', rating: 4.8, reviews: 892, emoji: '🎨' },
      { name: 'Pro Series', description: 'Professional grade for those who demand the best performance.', price: 149, tag: 'Premium', rating: 4.9, reviews: 567, emoji: '🚀' },
      { name: 'Starter Bundle', description: 'Everything you need to get started at an unbeatable value.', price: 49, tag: 'Value', rating: 4.7, reviews: 2345, emoji: '📦' },
    ],
    testimonials: [
      { name: 'Emily Watson', role: 'Verified Buyer', text: 'The quality exceeded my expectations. I\'ve already recommended this to all my friends. Will definitely order again.', rating: 5 },
      { name: 'James Cooper', role: 'Verified Buyer', text: 'Fast shipping, beautiful packaging, and the product is even better than the photos. Five stars all the way.', rating: 5 },
      { name: 'Sophie Laurent', role: 'Verified Buyer', text: 'I\'ve tried many similar products. This is by far the best quality-to-price ratio. Absolutely worth it.', rating: 5 },
    ],
    features: [
      { icon: '🚚', title: 'Free Shipping', description: 'Free shipping on orders over $50. Express options available.' },
      { icon: '↩️', title: 'Easy Returns', description: '30-day hassle-free returns. No questions asked.' },
      { icon: '🔒', title: 'Secure Checkout', description: 'SSL encrypted payments. We never store your card info.' },
      { icon: '💬', title: '24/7 Support', description: 'Chat with us anytime. Average response time: 2 minutes.' },
      { icon: '🎁', title: 'Gift Wrapping', description: 'Premium gift wrapping available at checkout.' },
      { icon: '📱', title: 'Track Orders', description: 'Real-time tracking from warehouse to your door.' },
    ],
    services: [
      { name: 'Online Shopping', description: 'Browse and buy from our full catalog.', icon: '🛒' },
      { name: 'Subscriptions', description: 'Monthly curated boxes delivered to you.', icon: '📦' },
      { name: 'Gift Cards', description: 'Digital and physical gift cards available.', icon: '🎁' },
      { name: 'Corporate Orders', description: 'Bulk pricing for businesses.', icon: '🏢' },
    ],
    team: [
      { name: 'Alex Morgan', role: 'Founder', bio: 'Started this journey to bring quality products to everyone.', emoji: '👤' },
      { name: 'Jordan Lee', role: 'Head of Operations', bio: 'Ensures every order is perfect from warehouse to doorstep.', emoji: '📦' },
      { name: 'Casey Taylor', role: 'Customer Success', bio: 'Makes sure every customer has an amazing experience.', emoji: '💬' },
    ],
    cta: { headline: 'Ready to Shop?', subtitle: 'Join 50,000+ happy customers and discover your new favorite products.', button: 'Shop the Collection' },
    footer: { tagline: 'Quality products, exceptional service.', links: [{ label: 'Shop', href: '/shop' }, { label: 'About', href: '/about' }, { label: 'FAQ', href: '/faq' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['product photography', 'online store', 'shopping', 'ecommerce'],
  },
  'education': {
    hero: {
      badge: 'Enroll Now',
      headline: 'Master New Skills Today',
      subtitle: 'Industry-leading courses taught by experts. Join 100,000+ learners advancing their careers.',
      cta: 'Browse Courses',
      ctaSecondary: 'Start Free Trial',
    },
    stats: [
      { value: '100K+', label: 'Students Enrolled' },
      { value: '500+', label: 'Courses Available' },
      { value: '95%', label: 'Completion Rate' },
      { value: '4.8★', label: 'Average Rating' },
    ],
    items: [
      { name: 'Web Development Bootcamp', description: 'Complete full-stack bootcamp. HTML, CSS, React, Node.js, databases. Build 10 projects.', price: 499, tag: 'Bestseller', rating: 4.9, reviews: 2341, emoji: '💻', details: ['60 hours', 'Certificate', 'Lifetime access', '10 projects'] },
      { name: 'Data Science Fundamentals', description: 'Python, statistics, machine learning, and real-world data analysis projects.', price: 399, tag: 'Popular', rating: 4.8, reviews: 1876, emoji: '📊', details: ['45 hours', 'Python focus', 'Real datasets', 'Portfolio projects'] },
      { name: 'UX Design Masterclass', description: 'User research, wireframing, prototyping, Figma, and design thinking.', price: 299, tag: 'New', rating: 4.7, reviews: 943, emoji: '🎨', details: ['35 hours', 'Figma included', 'Real clients', 'Certificate'] },
      { name: 'Business Strategy', description: 'MBA-level strategy, financial modeling, and startup fundamentals.', price: 349, tag: 'Advanced', rating: 4.8, reviews: 654, emoji: '📈', details: ['40 hours', 'Case studies', 'Templates', 'Networking'] },
    ],
    testimonials: [
      { name: 'Priya Patel', role: 'Software Engineer', text: 'Got hired at Google after completing the bootcamp. The curriculum is exactly what companies look for. Best investment ever.', rating: 5 },
      { name: 'Marcus Johnson', role: 'Career Switcher', text: 'Went from marketing to data science in 6 months. The instructors are incredible and the community is so supportive.', rating: 5 },
      { name: 'Elena Rodriguez', role: 'Product Designer', text: 'The UX course completely transformed my portfolio. Landed my dream job at a top design agency within weeks.', rating: 5 },
    ],
    features: [
      { icon: '🎓', title: 'Expert Instructors', description: 'Learn from industry professionals with 10+ years experience.' },
      { icon: '📹', title: 'HD Video Content', description: '4K video lessons with downloadable resources and code files.' },
      { icon: '🏆', title: 'Certified', description: 'Industry-recognized certificates upon completion.' },
      { icon: '💬', title: 'Live Support', description: 'Weekly live Q&A sessions and Discord community.' },
      { icon: '🔄', title: 'Lifetime Access', description: 'All course updates included forever. Learn at your pace.' },
      { icon: '💼', title: 'Career Services', description: 'Resume review, mock interviews, and job placement assistance.' },
    ],
    services: [
      { name: 'Online Courses', description: 'Self-paced learning with structured curriculum.', icon: '📹' },
      { name: 'Live Bootcamps', description: 'Intensive 12-week cohort-based programs.', icon: '🎓' },
      { name: 'Corporate Training', description: 'Custom programs for teams and organizations.', icon: '🏢' },
      { name: 'Mentorship', description: '1-on-1 sessions with industry experts.', icon: '🤝' },
    ],
    team: [
      { name: 'Dr. Sarah Chen', role: 'Chief Learning Officer', bio: 'Stanford CS PhD. Previously led curriculum at Coursera.', emoji: '👩‍🏫' },
      { name: 'James Wright', role: 'Lead Instructor', bio: 'Ex-Meta senior engineer. Taught 50,000+ students.', emoji: '👨‍🏫' },
      { name: 'Aisha Patel', role: 'Student Success', bio: 'Ensures every student achieves their learning goals.', emoji: '🎯' },
    ],
    cta: { headline: 'Your Future Starts Today', subtitle: 'Join 100,000+ students. First lesson free, no credit card required.', button: 'Start Learning' },
    footer: { tagline: 'Empowering learners worldwide since 2019.', links: [{ label: 'Courses', href: '/courses' }, { label: 'Pricing', href: '/pricing' }, { label: 'Instructors', href: '/instructors' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['online learning', 'education', 'classroom', 'students studying'],
  },
  'portfolio': {
    hero: {
      badge: 'Available for Work',
      headline: 'Crafting Digital Experiences',
      subtitle: 'Freelance designer & developer creating beautiful, functional websites and apps that users love.',
      cta: 'View My Work',
      ctaSecondary: 'Let\'s Talk',
    },
    stats: [
      { value: '120+', label: 'Projects Delivered' },
      { value: '50+', label: 'Happy Clients' },
      { value: '8+', label: 'Years Experience' },
      { value: '100%', label: 'On Time' },
    ],
    items: [
      { name: 'E-Commerce Redesign', description: 'Complete UX overhaul for a fashion brand. Increased conversions by 40%.', tag: 'Featured', rating: 5, reviews: 12, emoji: '🛍️', details: ['UX Research', 'Figma', 'Shopify', '3 months'] },
      { name: 'Health App UI/UX', description: 'Mobile health tracking app with 50K+ downloads. Designed end-to-end.', tag: 'Featured', rating: 5, reviews: 8, emoji: '📱', details: ['iOS/Android', 'Prototyping', 'User Testing', '6 months'] },
      { name: 'SaaS Dashboard', description: 'Complex analytics dashboard for a fintech startup. Clean data visualization.', tag: 'Featured', rating: 5, reviews: 15, emoji: '📊', details: ['React', 'D3.js', 'Design System', '4 months'] },
      { name: 'Brand Identity', description: 'Complete brand refresh including logo, guidelines, and marketing materials.', tag: 'Featured', rating: 5, reviews: 20, emoji: '✨', details: ['Logo Design', 'Style Guide', 'Print Design', '2 months'] },
    ],
    testimonials: [
      { name: 'Alex Kim', role: 'Startup Founder', text: 'Transformed our entire product experience. The attention to detail is unmatched. Our users love the new design.', rating: 5 },
      { name: 'Nina Torres', role: 'Marketing Director', text: 'Finally found a designer who understands both aesthetics and business. Our conversion rate jumped 35% after the redesign.', rating: 5 },
      { name: 'Ryan Mitchell', role: 'CTO', text: 'Rare talent that bridges design and engineering. Delivered ahead of schedule with pixel-perfect results.', rating: 5 },
    ],
    features: [
      { icon: '🎨', title: 'UI/UX Design', description: 'Beautiful, user-centered interfaces that convert visitors into customers.' },
      { icon: '💻', title: 'Frontend Development', description: 'Clean, performant code with React, Next.js, and modern frameworks.' },
      { icon: '📱', title: 'Mobile Design', description: 'Native-feeling iOS and Android app designs with smooth interactions.' },
      { icon: '🔤', title: 'Brand Identity', description: 'Logo design, typography, color systems, and comprehensive style guides.' },
      { icon: '🚀', title: 'Performance', description: 'Optimized for speed with 95+ Lighthouse scores guaranteed.' },
      { icon: '♿', title: 'Accessibility', description: 'WCAG 2.1 AA compliant designs that work for everyone.' },
    ],
    services: [
      { name: 'UI/UX Design', description: 'End-to-end product design from research to high-fidelity prototypes.', icon: '🎨' },
      { name: 'Web Development', description: 'Full-stack development with React, Next.js, and modern tooling.', icon: '💻' },
      { name: 'Brand Design', description: 'Visual identity systems that tell your brand story.', icon: '✨' },
      { name: 'Consulting', description: 'Design audits and strategic recommendations for existing products.', icon: '💡' },
    ],
    team: [
      { name: 'Alex Rivera', role: 'Designer & Developer', bio: '8+ years crafting digital experiences. Previously at Airbnb and Stripe.', emoji: '👤' },
    ],
    cta: { headline: 'Let\'s Build Something Great', subtitle: 'Currently accepting new projects. Book a free discovery call.', button: 'Get in Touch' },
    footer: { tagline: 'Designing the future, one pixel at a time.', links: [{ label: 'Work', href: '/work' }, { label: 'About', href: '/about' }, { label: 'Blog', href: '/blog' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['design portfolio', 'creative work', 'UI design', 'website mockup'],
  },
  'agency': {
    hero: {
      badge: 'Award-Winning Agency',
      headline: 'Grow Your Brand Digitally',
      subtitle: 'Full-service digital marketing agency. SEO, PPC, social media, and content strategies that drive real results.',
      cta: 'Get a Free Audit',
      ctaSecondary: 'View Case Studies',
    },
    stats: [
      { value: '200+', label: 'Clients Served' },
      { value: '$50M+', label: 'Ad Spend Managed' },
      { value: '340%', label: 'Avg ROI' },
      { value: '15+', label: 'Industry Awards' },
    ],
    items: [
      { name: 'SEO Optimization', description: 'Technical SEO, content strategy, and link building. Get to page 1.', price: 1999, tag: 'Essential', rating: 4.9, reviews: 187, emoji: '🔍', details: ['Technical audit', 'Content plan', 'Link building', 'Monthly reports'] },
      { name: 'PPC Management', description: 'Google Ads, Meta Ads, and LinkedIn campaigns with proven ROI.', price: 2999, tag: 'High ROI', rating: 4.8, reviews: 156, emoji: '📢', details: ['Campaign setup', 'A/B testing', 'Landing pages', 'Weekly optimization'] },
      { name: 'Social Media', description: 'Content creation, scheduling, and community management.', price: 1499, tag: 'Popular', rating: 4.7, reviews: 234, emoji: '📱', details: ['Content calendar', '3 platforms', 'Analytics', 'Engagement'] },
      { name: 'Content Marketing', description: 'Blog posts, whitepapers, and thought leadership content.', price: 2499, tag: 'Growth', rating: 4.8, reviews: 98, emoji: '✍️', details: ['8 posts/month', 'SEO optimized', 'Distribution', 'ROI tracking'] },
    ],
    testimonials: [
      { name: 'Chris Walker', role: 'CEO, TechStart', text: 'They tripled our organic traffic in 6 months. The ROI is incredible. Best marketing investment we\'ve made.', rating: 5 },
      { name: 'Diana Martinez', role: 'CMO, RetailCo', text: 'Our ROAS went from 2x to 8x within the first quarter. They truly understand performance marketing.', rating: 5 },
      { name: 'Tom Anderson', role: 'Founder, SaaS Inc', text: 'Not just another agency. They feel like an extension of our team. Strategic, responsive, and results-driven.', rating: 5 },
    ],
    features: [
      { icon: '📊', title: 'Data-Driven', description: 'Every decision backed by analytics and performance data.' },
      { icon: '🎯', title: 'Targeted Campaigns', description: 'Precision targeting for maximum reach and minimum waste.' },
      { icon: '📈', title: 'Transparent Reporting', description: 'Real-time dashboards showing exactly where your money goes.' },
      { icon: '🤖', title: 'AI-Powered', description: 'Machine learning optimization for better ad performance.' },
      { icon: '🌍', title: 'Global Reach', description: 'Campaigns in 20+ languages across all major markets.' },
      { icon: '🤝', title: 'Dedicated Team', description: 'Your own strategist, designer, and account manager.' },
    ],
    services: [
      { name: 'SEO', description: 'Search engine optimization for organic growth.', icon: '🔍' },
      { name: 'PPC', description: 'Paid advertising across Google, Meta, and LinkedIn.', icon: '📢' },
      { name: 'Social Media', description: 'Content creation and community management.', icon: '📱' },
      { name: 'Analytics', description: 'Tracking, attribution, and performance insights.', icon: '📊' },
    ],
    team: [
      { name: 'Jessica Park', role: 'CEO & Founder', bio: 'Former Google Ads team. Built agency from 0 to $10M ARR.', emoji: '👩‍💼' },
      { name: 'Marcus Chen', role: 'Head of SEO', bio: '15 years SEO experience. Scaled sites from 0 to 1M+ monthly visits.', emoji: '🔍' },
      { name: 'Rachel Kim', role: 'Creative Director', bio: 'Award-winning campaigns for Fortune 500 brands.', emoji: '🎨' },
    ],
    cta: { headline: 'Ready to Scale?', subtitle: 'Free marketing audit. Discover your biggest growth opportunities.', button: 'Get Free Audit' },
    footer: { tagline: 'Driving measurable growth since 2016.', links: [{ label: 'Services', href: '/services' }, { label: 'Case Studies', href: '/case-studies' }, { label: 'Blog', href: '/blog' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['marketing team', 'digital agency', 'analytics dashboard', 'creative workspace'],
  },
  'coffee-shop': {
    hero: {
      badge: 'Freshly Roasted Daily',
      headline: 'Your Morning Starts Here',
      subtitle: 'Artisan coffee, fresh pastries, and a cozy atmosphere. Ethically sourced beans from around the world.',
      cta: 'View Menu',
      ctaSecondary: 'Order Online',
    },
    stats: [
      { value: '12', label: 'Bean Origins' },
      { value: '4.8★', label: 'Yelp Rating' },
      { value: '3K+', label: 'Cups Daily' },
      { value: '2019', label: 'Established' },
    ],
    items: [
      { name: 'Ethiopian Yirgacheffe', description: 'Bright, fruity notes with hints of blueberry and citrus. Our signature single-origin.', price: 5.5, tag: 'Signature', rating: 4.9, reviews: 342, emoji: '☕', details: ['Single origin', 'Pour over', 'Light roast', 'Bright acidity'] },
      { name: 'Colombian Supremo', description: 'Smooth, nutty flavor with caramel sweetness. Perfect for espresso or drip.', price: 4.75, tag: 'Popular', rating: 4.8, reviews: 567, emoji: '🫘', details: ['Medium roast', 'Full body', 'Nutty notes', 'Versatile'] },
      { name: 'Cold Brew Concentrate', description: '24-hour steeped cold brew. Rich, smooth, and less acidic. Take-home bottles.', price: 8, tag: 'Best Seller', rating: 4.9, reviews: 234, emoji: '🧊', details: ['24hr steep', 'Take-home', 'Dilute to taste', 'Week-long'] },
      { name: 'Matcha Latte', description: 'Ceremonial grade matcha with oat milk. Vibrant green and naturally energizing.', price: 6.25, tag: 'Healthy', rating: 4.7, reviews: 189, emoji: '🍵', details: ['Ceremonial grade', 'Oat milk', 'No added sugar', 'Antioxidants'] },
    ],
    testimonials: [
      { name: 'Emma Wilson', role: 'Regular', text: 'Best coffee in the neighborhood. The Ethiopian Yirgacheffe is life-changing. I come here every morning.', rating: 5 },
      { name: 'David Park', role: 'Remote Worker', text: 'My second office. Great WiFi, comfy seats, and the baristas remember my name. Perfect work spot.', rating: 5 },
      { name: 'Lisa Chen', role: 'Coffee Enthusiast', text: 'Finally a shop that cares about sourcing. The single-origin options are incredible and always fresh.', rating: 5 },
    ],
    features: [
      { icon: '☕', title: 'Specialty Coffee', description: 'Single-origin beans roasted in-house weekly for maximum freshness.' },
      { icon: '🥐', title: 'Fresh Pastries', description: 'Baked daily by our in-house pastry chef using local ingredients.' },
      { icon: '📶', title: 'Free WiFi', description: 'High-speed WiFi for remote workers and students.' },
      { icon: '🌱', title: 'Ethical Sourcing', description: 'Direct trade relationships with farmers in 12 countries.' },
      { icon: '♻️', title: 'Sustainable', description: 'Compostable cups, zero-waste policy, and solar-powered roastery.' },
      { icon: '🎵', title: 'Live Music', description: 'Acoustic sessions every Friday and Saturday evening.' },
    ],
    services: [
      { name: 'Coffee Bar', description: 'Espresso drinks, pour-overs, cold brew, and specialty beverages.', icon: '☕' },
      { name: 'Pastries & Food', description: 'Fresh croissants, muffins, sandwiches, and salads.', icon: '🥐' },
      { name: 'Catering', description: 'Coffee service for meetings, events, and weddings.', icon: '🎉' },
      { name: 'Coffee Subscriptions', description: 'Weekly or monthly bean deliveries to your door.', icon: '📦' },
    ],
    team: [
      { name: 'Marco Rossi', role: 'Head Barista', bio: 'Latte art champion. 10 years crafting perfect espresso.', emoji: '👨‍🍳' },
      { name: 'Sophie Laurent', role: 'Roaster', bio: 'Q-certified coffee grader. Sources beans from 12 countries.', emoji: '🫘' },
      { name: 'James Kim', role: 'Pastry Chef', bio: 'Le Cordon Bleu trained. Creates all pastries in-house.', emoji: '🥐' },
    ],
    cta: { headline: 'Come for the Coffee, Stay for the Community', subtitle: 'Visit us today and taste the difference of ethically sourced, freshly roasted coffee.', button: 'Find Us' },
    footer: { tagline: 'Crafting community over coffee since 2019.', links: [{ label: 'Menu', href: '/menu' }, { label: 'Our Story', href: '/story' }, { label: 'Subscriptions', href: '/subscriptions' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['coffee shop', 'latte art', 'cafe interior', 'barista', 'espresso machine'],
  },
  'dental': {
    hero: {
      badge: 'New Patient Special',
      headline: 'Your Smile, Our Priority',
      subtitle: 'Gentle, modern dentistry for the whole family. State-of-the-art technology in a comfortable environment.',
      cta: 'Book Appointment',
      ctaSecondary: 'Virtual Consultation',
    },
    stats: [
      { value: '10K+', label: 'Happy Patients' },
      { value: '15+', label: 'Years Practice' },
      { value: '4.9★', label: 'Google Rating' },
      { value: '2', label: 'Locations' },
    ],
    items: [
      { name: 'Teeth Whitening', description: 'Professional in-office whitening. 8 shades whiter in one visit.', price: 350, tag: 'Popular', rating: 4.9, reviews: 567, emoji: '✨', details: ['60 min', 'Instant results', 'Safe formula', 'Touch-up kit'] },
      { name: 'Dental Implants', description: 'Permanent tooth replacement with titanium implants. Natural look and feel.', price: 3500, tag: 'Premium', rating: 4.9, reviews: 234, emoji: '🦷', details: ['Permanent', 'Titanium', 'Bone grafting', 'Custom crown'] },
      { name: 'Invisalign', description: 'Clear aligner orthodontics. Straighten teeth without metal braces.', price: 4500, tag: 'Transformative', rating: 4.8, reviews: 345, emoji: '😁', details: ['Clear aligners', 'Removable', 'Fast results', 'All ages'] },
      { name: 'General Cleaning', description: 'Professional cleaning, exam, and digital x-rays. Gentle and thorough.', price: 150, tag: 'Essential', rating: 4.8, reviews: 892, emoji: '🪥', details: ['45 min', 'Digital x-rays', 'Fluoride', 'Treatment plan'] },
    ],
    testimonials: [
      { name: 'Michelle Adams', role: 'Patient', text: 'Dr. Nguyen is the gentlest dentist I\'ve ever had. My kids actually look forward to their checkups now.', rating: 5 },
      { name: 'Robert Kim', role: 'Implant Patient', text: 'The implant process was smooth and the result is perfect. Can\'t tell it apart from my real teeth.', rating: 5 },
      { name: 'Jennifer Lee', role: 'Invisalign Patient', text: 'Straightened my teeth in 8 months. No one even noticed I was wearing aligners. Life-changing results.', rating: 5 },
    ],
    features: [
      { icon: '🔬', title: 'Advanced Technology', description: 'Digital X-rays, 3D imaging, and laser dentistry.' },
      { icon: '😴', title: 'Sedation Options', description: 'Nitrous oxide and oral sedation for anxious patients.' },
      { icon: '📱', title: 'Online Booking', description: 'Schedule appointments 24/7 through our patient portal.' },
      { icon: '💳', title: 'Insurance Accepted', description: 'We accept all major insurance plans and offer payment plans.' },
      { icon: '👨‍👩‍👧‍👦', title: 'Family Friendly', description: 'Pediatric dentistry and orthodontics under one roof.' },
      { icon: '⏰', title: 'Evening Hours', description: 'Open until 7pm on weekdays for after-work appointments.' },
    ],
    services: [
      { name: 'General Dentistry', description: 'Checkups, cleanings, fillings, and preventive care.', icon: '🪥' },
      { name: 'Cosmetic Dentistry', description: 'Whitening, veneers, and smile makeovers.', icon: '✨' },
      { name: 'Orthodontics', description: 'Invisalign and traditional braces for all ages.', icon: '😁' },
      { name: 'Oral Surgery', description: 'Implants, extractions, and wisdom teeth removal.', icon: '🦷' },
    ],
    team: [
      { name: 'Dr. Lisa Nguyen', role: 'Lead Dentist', bio: 'USC dental school. 15 years experience. Gentle and thorough.', emoji: '👩‍⚕️' },
      { name: 'Dr. Michael Park', role: 'Orthodontist', bio: 'Invisalign Diamond provider. 500+ cases completed.', emoji: '😁' },
      { name: 'Sarah Johnson', role: 'Office Manager', bio: 'Ensures every visit is smooth from check-in to checkout.', emoji: '📋' },
    ],
    cta: { headline: 'Your Best Smile Awaits', subtitle: 'New patients receive free consultation and digital x-rays. Book today!', button: 'Schedule Visit' },
    footer: { tagline: 'Creating healthy smiles since 2009.', links: [{ label: 'Services', href: '/services' }, { label: 'Providers', href: '/providers' }, { label: 'Insurance', href: '/insurance' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['dental office', 'dentist', 'smile', 'dental equipment', 'patient care'],
  },
  'beauty-salon': {
    hero: {
      badge: 'First Visit 20% Off',
      headline: 'Look Amazing, Feel Confident',
      subtitle: 'Full-service beauty salon with expert stylists. Hair, nails, skin, and body treatments in a luxurious setting.',
      cta: 'Book Now',
      ctaSecondary: 'View Services',
    },
    stats: [
      { value: '8K+', label: 'Happy Clients' },
      { value: '15+', label: 'Expert Stylists' },
      { value: '4.9★', label: 'Yelp Rating' },
      { value: '10', label: 'Years Serving' },
    ],
    items: [
      { name: 'Precision Cut & Style', description: 'Expert cut tailored to your face shape, lifestyle, and hair texture. Includes consultation.', price: 85, tag: 'Popular', rating: 4.9, reviews: 456, emoji: '✂️', details: ['Consultation', 'Shampoo & style', 'Heat protectant', 'Styling tips'] },
      { name: 'Balayage Highlights', description: 'Hand-painted highlights for a natural, sun-kissed look. Low maintenance and stunning.', price: 250, tag: 'Trending', rating: 4.8, reviews: 321, emoji: '🎨', details: ['Custom color', 'Hand-painted', 'Toner included', 'Aftercare kit'] },
      { name: 'Gel Manicure', description: 'Long-lasting gel polish application with cuticle care and hand massage.', price: 45, tag: 'Quick', rating: 4.7, reviews: 678, emoji: '💅', details: ['45 min', 'Cuticle care', 'Hand massage', 'UV cure'] },
      { name: 'HydraFacial', description: 'Deep cleansing, exfoliating, and hydrating facial. Instant glow and radiance.', price: 150, tag: 'Glow Up', rating: 4.9, reviews: 234, emoji: '✨', details: ['60 min', 'Deep clean', 'Hydration', 'LED therapy'] },
    ],
    testimonials: [
      { name: 'Amanda Torres', role: 'Regular Client', text: 'Best balayage I\'ve ever had. My colorist understood exactly what I wanted. The salon is gorgeous.', rating: 5 },
      { name: 'Jessica Park', role: 'Bridal Client', text: 'Did my hair and makeup for my wedding. Absolutely flawless. All my bridesmaids loved their looks too.', rating: 5 },
      { name: 'Nicole Chen', role: 'New Client', text: 'Finally found my forever salon. The attention to detail and customer service is outstanding.', rating: 5 },
    ],
    features: [
      { icon: '✂️', title: 'Expert Stylists', description: 'Certified professionals with ongoing education and competition awards.' },
      { icon: '🧴', title: 'Premium Products', description: 'Olaplex, Kérastase, and Oribe products for best results.' },
      { icon: '💆', title: 'Spa Experience', description: 'Complimentary beverages, aromatherapy, and scalp massage.' },
      { icon: '📱', title: 'Easy Booking', description: 'Online booking with your preferred stylist and time slot.' },
      { icon: '🎓', title: 'Training Academy', description: 'Apprentice program nurturing the next generation of stylists.' },
      { icon: '🅿️', title: 'Free Parking', description: 'Convenient parking lot right at our entrance.' },
    ],
    services: [
      { name: 'Hair Services', description: 'Cuts, color, extensions, and treatments.', icon: '✂️' },
      { name: 'Nail Services', description: 'Manicures, pedicures, gel, and nail art.', icon: '💅' },
      { name: 'Skin Care', description: 'Facials, peels, and dermaplaning.', icon: '✨' },
      { name: 'Makeup', description: 'Bridal, event, and everyday makeup.', icon: '💄' },
    ],
    team: [
      { name: 'Maria Santos', role: 'Salon Owner & Master Stylist', bio: '15 years experience. Vidal Sassoon trained. Color specialist.', emoji: '👩‍🎨' },
      { name: 'Emily Kim', role: 'Senior Colorist', bio: 'Balayage expert. Featured in Allure and Elle magazines.', emoji: '🎨' },
      { name: 'Rachel Lee', role: 'Esthetician', bio: 'Licensed esthetician specializing in Korean skincare techniques.', emoji: '✨' },
    ],
    cta: { headline: 'Treat Yourself Today', subtitle: 'New clients get 20% off any service. Book your appointment now.', button: 'Book Appointment' },
    footer: { tagline: 'Making you look and feel amazing since 2014.', links: [{ label: 'Services', href: '/services' }, { label: 'Stylists', href: '/stylists' }, { label: 'Gallery', href: '/gallery' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['beauty salon', 'hair styling', 'salon interior', 'nail art', 'facial treatment'],
  },
  'auto-dealership': {
    hero: {
      badge: 'New Arrivals Weekly',
      headline: 'Find Your Perfect Drive',
      subtitle: 'Premium pre-owned and certified vehicles. Every car inspected, every customer satisfied. Financing available.',
      cta: 'Browse Inventory',
      ctaSecondary: 'Get Pre-Approved',
    },
    stats: [
      { value: '300+', label: 'Vehicles In Stock' },
      { value: '99%', label: 'Approval Rate' },
      { value: '50K+', label: 'Cars Sold' },
      { value: '4.8★', label: 'Dealer Rating' },
    ],
    items: [
      { name: '2023 BMW X5 xDrive40i', description: 'Low mileage, one owner, fully loaded with panoramic roof, heated seats, and premium sound.', price: 52900, tag: 'Certified', rating: 4.9, reviews: 23, emoji: '🚗', details: ['28K miles', 'One owner', 'Clean title', 'Warranty included'] },
      { name: '2024 Tesla Model 3 Long Range', description: 'Full Self-Driving capability, white interior, aero wheels. Like new condition.', price: 38500, tag: 'Electric', rating: 4.8, reviews: 18, emoji: '⚡', details: ['12K miles', 'FSD included', 'Home charger', 'No accidents'] },
      { name: '2022 Ford F-150 Lariat', description: 'PowerBoost hybrid, loaded with FX4 package, tow package, and bed liner.', price: 45900, tag: 'Truck', rating: 4.7, reviews: 31, emoji: '🛻', details: ['35K miles', 'Hybrid', 'Tow ready', 'FX4 package'] },
      { name: '2024 Honda Civic Touring', description: 'Top trim with Honda Sensing, wireless Apple CarPlay, and premium audio.', price: 28900, tag: 'Value', rating: 4.8, reviews: 42, emoji: '🚙', details: ['8K miles', 'Like new', 'Full warranty', 'Safety suite'] },
    ],
    testimonials: [
      { name: 'Robert Martinez', role: 'BMW Buyer', text: 'Best car buying experience ever. No pressure, transparent pricing, and they even delivered the car to my house.', rating: 5 },
      { name: 'Jennifer Adams', role: 'Tesla Buyer', text: 'They handled all the Tesla paperwork and even helped me set up home charging. Above and beyond service.', rating: 5 },
      { name: 'Michael Lee', role: 'Truck Buyer', text: 'Found exactly what I wanted at a fair price. The inspection report was thorough and honest. Highly recommend.', rating: 5 },
    ],
    features: [
      { icon: '🔍', title: '200-Point Inspection', description: 'Every vehicle undergoes rigorous inspection before listing.' },
      { icon: '🛡️', title: 'Warranty Included', description: '12-month/12K mile powertrain warranty on all certified vehicles.' },
      { icon: '💰', title: 'Best Price Guarantee', description: 'We\'ll match any competitor\'s price on comparable vehicles.' },
      { icon: '🚗', title: 'Home Delivery', description: 'Free delivery within 100 miles. Test drive at your doorstep.' },
      { icon: '💳', title: 'Flexible Financing', description: 'On-site financing with rates as low as 2.9% APR.' },
      { icon: '🔄', title: 'Trade-In Maximizer', description: 'Get top dollar for your trade-in with our valuation tool.' },
    ],
    services: [
      { name: 'Sales', description: 'New and pre-owned vehicles from all major brands.', icon: '🚗' },
      { name: 'Financing', description: 'In-house financing with multiple lender options.', icon: '💳' },
      { name: 'Service Center', description: 'Certified mechanics for maintenance and repairs.', icon: '🔧' },
      { name: 'Trade-Ins', description: 'Fair market value for your current vehicle.', icon: '🔄' },
    ],
    team: [
      { name: 'Tony Russo', role: 'General Manager', bio: '20 years in auto sales. Built reputation on honesty and fairness.', emoji: '👔' },
      { name: 'Sarah Kim', role: 'Finance Director', bio: 'Gets buyers the best rates. 99% approval rate.', emoji: '💰' },
      { name: 'Mike Johnson', role: 'Service Manager', bio: 'ASE certified master mechanic. Keeps every car in peak condition.', emoji: '🔧' },
    ],
    cta: { headline: 'Your Dream Car is Here', subtitle: 'Browse 300+ vehicles or get pre-approved in minutes. No hassle, just great cars.', button: 'Shop Now' },
    footer: { tagline: 'Serving drivers since 2010.', links: [{ label: 'Inventory', href: '/inventory' }, { label: 'Financing', href: '/financing' }, { label: 'Service', href: '/service' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['car dealership', 'luxury car', 'showroom', 'vehicle inspection'],
  },
  'pet-services': {
    hero: {
      badge: 'Now Accepting New Clients',
      headline: 'Loving Care for Your Pets',
      subtitle: 'Full-service veterinary clinic, grooming spa, and boarding facility. Your pet\'s health and happiness are our mission.',
      cta: 'Book Appointment',
      ctaSecondary: 'Virtual Consultation',
    },
    stats: [
      { value: '15K+', label: 'Pets Served' },
      { value: '10+', label: 'Vets on Staff' },
      { value: '4.9★', label: 'Google Rating' },
      { value: '24/7', label: 'Emergency Care' },
    ],
    items: [
      { name: 'Wellness Exam', description: 'Comprehensive physical exam, vaccines, and health assessment. Keeps your pet healthy.', price: 75, tag: 'Essential', rating: 4.9, reviews: 892, emoji: '🩺', details: ['30 min', 'Full exam', 'Vaccine check', 'Health plan'] },
      { name: 'Grooming Spa Package', description: 'Full groom: bath, haircut, nail trim, ear cleaning, and teeth brushing.', price: 65, tag: 'Popular', rating: 4.8, reviews: 567, emoji: '🛁', details: ['2 hours', 'Bath & cut', 'Nail trim', 'Finishing spray'] },
      { name: 'Overnight Boarding', description: 'Spacious suites with climate control, webcam access, and daily play sessions.', price: 55, tag: 'Convenient', rating: 4.7, reviews: 345, emoji: '🏠', details: ['Per night', 'Private suite', 'Webcam', 'Play sessions'] },
      { name: 'Dental Cleaning', description: 'Professional dental cleaning under anesthesia. Prevents periodontal disease.', price: 350, tag: 'Important', rating: 4.9, reviews: 234, emoji: '🦷', details: ['Under anesthesia', 'X-rays', 'Scaling', 'Polish'] },
    ],
    testimonials: [
      { name: 'Patricia Green', role: 'Dog Owner', text: 'Dr. Williams saved our dog\'s life with emergency surgery at 2am. They truly care about animals. Forever grateful.', rating: 5 },
      { name: 'Kevin Adams', role: 'Cat Owner', text: 'The grooming team handles my anxious cat so gently. She actually purrs during her bath now. Amazing.', rating: 5 },
      { name: 'Maria Santos', role: 'Multiple Pet Owner', text: 'Boarding here is like a vacation for my dogs. They get excited when we pull into the parking lot. Best in the city.', rating: 5 },
    ],
    features: [
      { icon: '🏥', title: 'Full-Service Clinic', description: 'Surgery, diagnostics, dentistry, and preventive care under one roof.' },
      { icon: '🛁', title: 'Spa Grooming', description: 'Stress-free grooming with calming techniques and premium products.' },
      { icon: '📹', title: 'Webcam Access', description: 'Watch your pet anytime during boarding through our live webcams.' },
      { icon: '🚨', title: '24/7 Emergency', description: 'Emergency care available around the clock, including holidays.' },
      { icon: '💊', title: 'Online Pharmacy', description: 'Order medications, food, and supplements delivered to your door.' },
      { icon: '📱', title: 'Pet Portal', description: 'Access records, book appointments, and message your vet online.' },
    ],
    services: [
      { name: 'Veterinary Care', description: 'Wellness exams, surgery, and emergency care.', icon: '🩺' },
      { name: 'Grooming', description: 'Full-service grooming spa for dogs and cats.', icon: '🛁' },
      { name: 'Boarding', description: 'Overnight stays with playtime and webcam access.', icon: '🏠' },
      { name: 'Training', description: 'Behavioral training and puppy socialization classes.', icon: '🎓' },
    ],
    team: [
      { name: 'Dr. Amanda Williams', role: 'Lead Veterinarian', bio: 'Cornell DVM. 12 years experience. Specializes in emergency and internal medicine.', emoji: '👩‍⚕️' },
      { name: 'Dr. James Park', role: 'Surgeon', bio: 'Board-certified veterinary surgeon. 5,000+ procedures.', emoji: '🏥' },
      { name: 'Lisa Chen', role: 'Head Groomer', bio: 'Certified master groomer. Gentle handler of even the most anxious pets.', emoji: '✂️' },
    ],
    cta: { headline: 'Your Pet Deserves the Best', subtitle: 'New clients receive free wellness exam. Book your visit today.', button: 'Schedule Visit' },
    footer: { tagline: 'Caring for pets and their families since 2012.', links: [{ label: 'Services', href: '/services' }, { label: 'Providers', href: '/providers' }, { label: 'Boarding', href: '/boarding' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['veterinary clinic', 'pet grooming', 'dog cat', 'animal hospital', 'puppy'],
  },
  'luxury': {
    hero: {
      badge: 'Since 1887',
      headline: 'Timeless Mastery, Infinite Precision',
      subtitle: 'Where centuries of Swiss horological tradition meet avant-garde innovation. Each timepiece is a legacy crafted for the extraordinary.',
      cta: 'Explore Collection',
      ctaSecondary: 'Book Private Viewing',
    },
    stats: [
      { value: '137+', label: 'Years of Heritage' },
      { value: '42', label: 'Master Artisans' },
      { value: '847', label: 'Components Per Movement' },
      { value: '#1', label: 'Swiss Excellence' },
    ],
    items: [
      { name: 'Royal Chronograph', description: 'Hand-wound perpetual calendar with moonphase complication. 18K rose gold case with sapphire crystal.', price: 48500, tag: 'Iconic', rating: 5.0, reviews: 12, emoji: '⌚', details: ['18K Rose Gold', 'Perpetual Calendar', '72hr Power Reserve', 'Limited Edition'] },
      { name: 'Nautical Automatic', description: 'Self-winding dive watch rated to 300m. Titanium case with ceramic bezel.', price: 22800, tag: 'Signature', rating: 4.9, reviews: 34, emoji: '🌊', details: ['Titanium', '300m Water Resist', 'Ceramic Bezel', 'Swiss Movement'] },
      { name: 'Heritage Tourbillon', description: 'Flying tourbillon with 8-day power reserve. Platinum case hand-finished to mirror polish.', price: 125000, tag: 'Grand Complication', rating: 5.0, reviews: 6, emoji: '✨', details: ['Platinum 950', 'Flying Tourbillon', '8-Day Reserve', 'Hand-Finished'] },
      { name: 'Dress Ultra-Thin', description: '7.2mm ultra-thin dress watch in white gold. Guilloché dial hand-engraved by master artisans.', price: 34200, tag: 'Elegant', rating: 4.9, reviews: 21, emoji: '👔', details: ['White Gold', '7.2mm Thin', 'Guilloché Dial', 'Alligator Strap'] },
    ],
    testimonials: [
      { name: 'Richard Sterling', role: 'Collector', text: 'The Royal Chronograph is the finest timepiece in my collection of 200+ watches. The finishing is beyond compare — every surface catches light differently.', rating: 5 },
      { name: 'Isabelle Laurent', role: 'Horologist', text: 'As someone who has spent 30 years studying watches, the Heritage Tourbillon represents the pinnacle of mechanical art. Museum-worthy craftsmanship.', rating: 5 },
      { name: 'James Worthington III', role: 'Patron', text: 'Three generations of my family have worn this maison. The Heritage Tourbillon was passed to my son. It is not a watch — it is a legacy.', rating: 5 },
    ],
    features: [
      { icon: '⚜️', title: 'Swiss Made', description: 'Every movement assembled by hand in our Geneva atelier. COSC-certified precision.', iconKeyword: 'award' },
      { icon: '💎', title: 'Rare Materials', description: 'Sapphire crystal, platinum 950, 18K gold. Only the finest materials grace our cases.', iconKeyword: 'gem' },
      { icon: '🔧', title: '847 Components', description: 'Each movement contains hundreds of hand-finished parts assembled over 600 hours.', iconKeyword: 'tool' },
      { icon: '📜', title: 'Heritage Since 1887', description: 'Five generations of master watchmakers. Each timepiece carries 137 years of tradition.', iconKeyword: 'book' },
      { icon: '🛡️', title: 'Lifetime Service', description: 'Complimentary servicing every 5 years. Our commitment to your timepiece is eternal.', iconKeyword: 'shield' },
      { icon: '🏷️', title: 'Certificate of Origin', description: 'Each watch ships with blockchain-verified provenance and master artisan signature.', iconKeyword: 'tag' },
    ],
    services: [
      { name: 'Bespoke Commissions', description: 'Design your unique timepiece with our master artisans.', icon: '⚜️' },
      { name: 'Heritage Restoration', description: 'Restore vintage pieces to their original glory.', icon: '🔧' },
      { name: 'Private Viewings', description: 'Exclusive appointments in our flagship salon.', icon: '🥂' },
      { name: 'Concierge Service', description: 'White-glove delivery and personal consultation.', icon: '🎩' },
    ],
    team: [
      { name: 'Master Artisan Philippe', role: 'Head Watchmaker', bio: '42 years of horological mastery. Trained under the greatest Swiss masters.', emoji: '⚜️' },
      { name: 'Elena Beaumont', role: 'Creative Director', bio: 'Former Cartier designer. Brings modern elegance to heritage craftsmanship.', emoji: '🎨' },
      { name: 'Thomas Müller', role: 'Master Engraver', bio: 'One of twelve living masters of hand-guilloché dial engraving.', emoji: '✨' },
    ],
    cta: { headline: 'Own a Piece of Eternity', subtitle: 'Schedule a private viewing at our Geneva atelier or flagship salon.', button: 'Request Private Viewing' },
    footer: { tagline: 'Timeless craftsmanship since 1887.', links: [{ label: 'Collections', href: '/collections' }, { label: 'Heritage', href: '/heritage' }, { label: 'Atelier', href: '/atelier' }, { label: 'Contact', href: '/contact' }] },
    imageKeywords: ['luxury watch', 'swiss movement', 'watch dial', 'premium timepiece', 'artisan workshop'],
  },
};

const GENERAL_DATA: DomainMockData = {
  hero: {
    badge: 'Welcome',
    headline: 'Build Something Amazing',
    subtitle: 'We provide innovative solutions tailored to your needs. Get started today and see the difference.',
    cta: 'Get Started',
    ctaSecondary: 'Learn More',
  },
  stats: [
    { value: '1,000+', label: 'Happy Clients' },
    { value: '50+', label: 'Projects Done' },
    { value: '4.9★', label: 'Client Rating' },
    { value: '24/7', label: 'Support' },
  ],
  items: [
    { name: 'Essential Plan', description: 'Everything you need to get started at a great price.', price: 49, tag: 'Popular', rating: 4.7, reviews: 234, emoji: '📦' },
    { name: 'Professional Plan', description: 'Advanced features for power users and growing teams.', price: 99, tag: 'Best Value', rating: 4.8, reviews: 189, emoji: '⚡' },
    { name: 'Enterprise Plan', description: 'Custom solutions for large organizations.', price: 249, tag: 'Premium', rating: 4.9, reviews: 98, emoji: '🏢' },
    { name: 'Starter Plan', description: 'Perfect for individuals and small projects.', price: 29, rating: 4.6, reviews: 567, emoji: '🚀' },
  ],
  testimonials: [
    { name: 'Alex Johnson', role: 'CEO', text: 'Outstanding service. They delivered exactly what we needed on time and within budget.', rating: 5 },
    { name: 'Maria Garcia', role: 'Director', text: 'Professional, responsive, and incredibly skilled. Highly recommend to any business.', rating: 5 },
    { name: 'Chris Williams', role: 'Manager', text: 'The best investment we made this year. ROI was evident within the first month.', rating: 5 },
  ],
  features: [
    { icon: '⚡', title: 'Fast & Reliable', description: 'Lightning-fast performance you can count on.' },
    { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security to protect your data.' },
    { icon: '📱', title: 'Mobile Friendly', description: 'Works beautifully on all devices.' },
    { icon: '🎨', title: 'Beautiful Design', description: 'Crafted with attention to every detail.' },
    { icon: '🔧', title: 'Easy to Use', description: 'Intuitive interface that requires no training.' },
    { icon: '💬', title: 'Great Support', description: 'Our team is here to help whenever you need us.' },
  ],
  services: [
    { name: 'Consulting', description: 'Expert guidance for your business challenges.', icon: '💡' },
    { name: 'Development', description: 'Custom solutions built to your specifications.', icon: '🛠️' },
    { name: 'Design', description: 'Beautiful, functional design that converts.', icon: '🎨' },
    { name: 'Support', description: 'Ongoing maintenance and support.', icon: '💬' },
  ],
  team: [
    { name: 'Jordan Smith', role: 'Founder', bio: 'Passionate about creating solutions that make a difference.', emoji: '👤' },
    { name: 'Taylor Brown', role: 'Lead Developer', bio: 'Full-stack expert with 10+ years of experience.', emoji: '💻' },
    { name: 'Morgan Davis', role: 'Design Director', bio: 'Award-winning designer focused on user experience.', emoji: '🎨' },
  ],
  cta: { headline: 'Ready to Get Started?', subtitle: 'Join hundreds of satisfied clients. Start your journey today.', button: 'Start Now' },
  footer: { tagline: 'Building the future, one project at a time.', links: [{ label: 'About', href: '/about' }, { label: 'Services', href: '/services' }, { label: 'Portfolio', href: '/portfolio' }, { label: 'Contact', href: '/contact' }] },
  imageKeywords: ['business', 'technology', 'office', 'teamwork'],
};

export function getDomainData(industry: string, subIndustry?: string): DomainMockData {
  const data = DOMAIN_DATA[industry];
  if (data) return data;

  for (const [key, val] of Object.entries(DOMAIN_DATA)) {
    if (industry.includes(key) || key.includes(industry)) return val;
  }

  return GENERAL_DATA;
}

export function getSectionData(domain: string, section: string, data: DomainMockData): { label: string; items: typeof data.items } {
  switch (section) {
    case 'hero':
      return { label: 'Hero', items: [] };
    case 'featured-properties':
    case 'product-grid':
    case 'featured-products':
    case 'menu-highlights':
    case 'courses':
    case 'featured-projects':
      return { label: 'Featured', items: data.items };
    case 'services':
    case 'services-grid':
    case 'practice-areas':
      return { label: 'Services', items: data.services.map(s => ({ name: s.name, description: s.description, emoji: s.icon })) };
    case 'team':
    case 'team/doctors':
    case 'trainers':
      return { label: 'Team', items: data.team.map(t => ({ name: t.name, description: t.bio, emoji: t.emoji })) };
    case 'testimonials':
      return { label: 'Testimonials', items: data.testimonials.map(t => ({ name: t.name, description: t.text, emoji: '★'.repeat(t.rating) })) };
    case 'features':
    case 'features-grid':
      return { label: 'Features', items: data.features.map(f => ({ name: f.title, description: f.description, emoji: f.icon })) };
    case 'pricing-table':
    case 'membership-plans':
      return { label: 'Pricing', items: data.items.filter(i => i.price !== undefined).map(i => ({ ...i, emoji: i.emoji || '💰' })) };
    default:
      return { label: section, items: data.items };
  }
}
