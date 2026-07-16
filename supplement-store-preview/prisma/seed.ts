import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Products
  const productsData = [
    {
        "id": "seed-products-1",
        "name": "Premium Essential",
        "price": 89,
        "description": "Our bestselling product. Premium materials with meticulous craftsmanship.",
        "image": "https://picsum.photos/seed/image1/400/300",
        "stock": 10,
        "sku": "NutriMart sku 1",
        "category": "Bestseller",
        "userId": null
    },
    {
        "id": "seed-products-2",
        "name": "Classic Collection",
        "price": 65,
        "description": "Timeless design that never goes out of style. Available in 6 colors.",
        "image": "https://picsum.photos/seed/image2/400/300",
        "stock": 25,
        "sku": "NutriMart sku 2",
        "category": "Popular",
        "userId": null
    },
    {
        "id": "seed-products-3",
        "name": "Pro Series",
        "price": 149,
        "description": "Professional grade for those who demand the best performance.",
        "image": "https://picsum.photos/seed/image3/400/300",
        "stock": 40,
        "sku": "NutriMart sku 3",
        "category": "Premium",
        "userId": null
    },
    {
        "id": "seed-products-4",
        "name": "Starter Bundle",
        "price": 49,
        "description": "Everything you need to get started at an unbeatable value.",
        "image": "https://picsum.photos/seed/image4/400/300",
        "stock": 55,
        "sku": "NutriMart sku 4",
        "category": "Value",
        "userId": null
    }
];
  for (const data of productsData) {
    await prisma.products.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Products: ${productsData.length} records`);

  // Orders
  const ordersData = [
    {
        "id": "seed-orders-1",
        "items": "NutriMart items 1",
        "total": "NutriMart total 1",
        "status": "active",
        "customerId": null,
        "shippingAddress": "NutriMart shippingAddress 1",
        "createdAt": "2026-07-09T14:44:08.557Z",
        "userId": null
    },
    {
        "id": "seed-orders-2",
        "items": "NutriMart items 2",
        "total": "NutriMart total 2",
        "status": "published",
        "customerId": null,
        "shippingAddress": "NutriMart shippingAddress 2",
        "createdAt": "2026-07-02T14:44:08.557Z",
        "userId": null
    },
    {
        "id": "seed-orders-3",
        "items": "NutriMart items 3",
        "total": "NutriMart total 3",
        "status": "approved",
        "customerId": null,
        "shippingAddress": "NutriMart shippingAddress 3",
        "createdAt": "2026-06-25T14:44:08.557Z",
        "userId": null
    },
    {
        "id": "seed-orders-4",
        "items": "NutriMart items 4",
        "total": "NutriMart total 4",
        "status": "in_stock",
        "customerId": null,
        "shippingAddress": "NutriMart shippingAddress 4",
        "createdAt": "2026-06-18T14:44:08.557Z",
        "userId": null
    }
];
  for (const data of ordersData) {
    await prisma.orders.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Orders: ${ordersData.length} records`);

  // Categories
  const categoriesData = [
    {
        "id": "seed-categories-1",
        "name": "Premium Essential",
        "slug": "NutriMart slug 1",
        "image": "https://picsum.photos/seed/image1/400/300",
        "parent": "NutriMart parent 1",
        "userId": null
    },
    {
        "id": "seed-categories-2",
        "name": "Classic Collection",
        "slug": "NutriMart slug 2",
        "image": "https://picsum.photos/seed/image2/400/300",
        "parent": "NutriMart parent 2",
        "userId": null
    },
    {
        "id": "seed-categories-3",
        "name": "Pro Series",
        "slug": "NutriMart slug 3",
        "image": "https://picsum.photos/seed/image3/400/300",
        "parent": "NutriMart parent 3",
        "userId": null
    },
    {
        "id": "seed-categories-4",
        "name": "Starter Bundle",
        "slug": "NutriMart slug 4",
        "image": "https://picsum.photos/seed/image4/400/300",
        "parent": "NutriMart parent 4",
        "userId": null
    }
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
    {
        "id": "seed-users-1",
        "email": "admin@nutrimart.com",
        "name": "Premium Essential",
        "role": "Bestseller",
        "createdAt": "2026-07-09T14:44:08.557Z"
    },
    {
        "id": "seed-users-2",
        "email": "user@nutrimart.com",
        "name": "Classic Collection",
        "role": "Popular",
        "createdAt": "2026-07-02T14:44:08.557Z"
    },
    {
        "id": "seed-users-3",
        "email": "contact@nutrimart.com",
        "name": "Pro Series",
        "role": "Premium",
        "createdAt": "2026-06-25T14:44:08.557Z"
    },
    {
        "id": "seed-users-4",
        "email": "support@nutrimart.com",
        "name": "Starter Bundle",
        "role": "Value",
        "createdAt": "2026-06-18T14:44:08.557Z"
    }
];
  for (const data of usersData) {
    await prisma.users.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(`  ✓ Users: ${usersData.length} records`);

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
