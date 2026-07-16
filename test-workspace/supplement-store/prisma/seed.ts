import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Products — real supplement products with Unsplash images
  const productsData = [
    {
        id: 'seed-products-1',
        name: 'MuscleBlaze Biozyme Performance Whey',
        price: 2499,
        description: "India's highest-rated whey protein with 25g protein per serving. Lab-tested for purity. Chocolate Supreme flavor.",
        image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2e3c1?w=400&h=400&fit=crop',
        stock: 10,
        sku: 'MB-BIOZIME-1KG',
        category: 'Protein',
        userId: null,
    },
    {
        id: 'seed-products-2',
        name: 'Optimum Nutrition Gold Standard Whey',
        price: 3299,
        description: "The world's best-selling whey protein. 24g protein, low sugar, instantized for easy mixing.",
        image: 'https://images.unsplash.com/photo-1622485831930-34ae8e7074f0?w=400&h=400&fit=crop',
        stock: 25,
        sku: 'ON-GOLD-2KG',
        category: 'Protein',
        userId: null,
    },
    {
        id: 'seed-products-3',
        name: 'HealthKart HK Vitals Multivitamin',
        price: 599,
        description: 'Complete daily multivitamin with 23 essential nutrients. Supports immunity, energy, and overall health.',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop',
        stock: 40,
        sku: 'HK-VITALS-60TAB',
        category: 'Vitamins',
        userId: null,
    },
    {
        id: 'seed-products-4',
        name: 'BSN Nitro-Tech Whey Gold',
        price: 2899,
        description: 'Advanced whey protein isolate with creatine and BCAAs. For serious athletes seeking maximum muscle growth.',
        image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&h=400&fit=crop',
        stock: 55,
        sku: 'BSN-NITRO-1.8KG',
        category: 'Protein',
        userId: null,
    },
    {
        id: 'seed-products-5',
        name: 'TrueBasics Omega 3 Fish Oil',
        price: 449,
        description: 'Triple-strength fish oil with 600mg EPA+DHA. Supports heart, brain, and joint health.',
        image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=400&fit=crop',
        stock: 70,
        sku: 'TB-OMEGA3-90SG',
        category: 'Essentials',
        userId: null,
    },
    {
        id: 'seed-products-6',
        name: 'BigMuscles Nutrition Crude Creatine',
        price: 399,
        description: 'Pure creatine monohydrate for strength and endurance. Unflavored, mix with any beverage.',
        image: 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=400&h=400&fit=crop',
        stock: 80,
        sku: 'BM-CREATINE-200G',
        category: 'Performance',
        userId: null,
    },
    {
        id: 'seed-products-7',
        name: 'GNC Pro Performance Slimvance',
        price: 1299,
        description: 'Clinically studied weight management formula. Supports metabolism and calorie burning.',
        image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
        stock: 30,
        sku: 'GNC-SLIMVANCE-60CAP',
        category: 'Weight Management',
        userId: null,
    },
    {
        id: 'seed-products-8',
        name: 'Dymatize ISO100 Hydrolyzed',
        price: 3599,
        description: '100% hydrolyzed whey protein isolate. Zero sugar, zero fat, fast-absorbing for post-workout recovery.',
        image: 'https://images.unsplash.com/photo-1587049016823-69ef9d68f4af?w=400&h=400&fit=crop',
        stock: 20,
        sku: 'DYM-ISO100-1.4KG',
        category: 'Protein',
        userId: null,
    },
  ];
  for (const data of productsData) {
    await prisma.products.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Products: ${productsData.length} records`);

  // Categories
  const categoriesData = [
    { id: 'seed-categories-1', name: 'Protein', slug: 'protein', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2e3c1?w=200&h=200&fit=crop', parent: null, userId: null },
    { id: 'seed-categories-2', name: 'Pre-Workout', slug: 'pre-workout', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop', parent: null, userId: null },
    { id: 'seed-categories-3', name: 'Vitamins & Minerals', slug: 'vitamins', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', parent: null, userId: null },
    { id: 'seed-categories-4', name: 'Weight Management', slug: 'weight-management', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop', parent: null, userId: null },
    { id: 'seed-categories-5', name: 'Essentials', slug: 'essentials', image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200&h=200&fit=crop', parent: null, userId: null },
    { id: 'seed-categories-6', name: 'Performance', slug: 'performance', image: 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=200&h=200&fit=crop', parent: null, userId: null },
  ];
  for (const data of categoriesData) {
    await prisma.categories.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Categories: ${categoriesData.length} records`);

  // Users
  const usersData = [
    { id: 'seed-users-1', email: 'admin@nutrimart.com', name: 'Vikram Mehta', role: 'admin', password: null },
    { id: 'seed-users-2', email: 'rahul@example.com', name: 'Rahul Sharma', role: 'user', password: null },
    { id: 'seed-users-3', email: 'priya@example.com', name: 'Priya Patel', role: 'user', password: null },
  ];
  for (const data of usersData) {
    await prisma.users.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Users: ${usersData.length} records`);

  // Orders
  const ordersData = [
    { id: 'seed-orders-1', items: 'MuscleBlaze Biozyme Performance Whey x1', total: 2499, status: 'delivered', customerId: null, shippingAddress: 'Mumbai, Maharashtra', userId: 'seed-users-2' },
    { id: 'seed-orders-2', items: 'ON Gold Standard Whey x1, TrueBasics Omega 3 x2', total: 4197, status: 'shipped', customerId: null, shippingAddress: 'Delhi, India', userId: 'seed-users-3' },
    { id: 'seed-orders-3', items: 'HealthKart Multivitamin x3', total: 1797, status: 'processing', customerId: null, shippingAddress: 'Bangalore, Karnataka', userId: 'seed-users-2' },
  ];
  for (const data of ordersData) {
    await prisma.orders.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Orders: ${ordersData.length} records`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
