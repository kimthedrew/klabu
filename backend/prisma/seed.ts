import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@klabu.com' },
    update: {},
    create: {
      email: 'admin@klabu.com',
      password: adminPassword,
      role: 'ADMIN'
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample stall owner
  const stallOwnerPassword = await bcrypt.hash('stall123', 12);
  const stallOwnerUser = await prisma.user.upsert({
    where: { email: 'stall@klabu.com' },
    update: {},
    create: {
      email: 'stall@klabu.com',
      password: stallOwnerPassword,
      role: 'STALL_OWNER'
    }
  });

  const stallOwner = await prisma.stallOwner.upsert({
    where: { userId: stallOwnerUser.id },
    update: {},
    create: {
      userId: stallOwnerUser.id,
      fullName: 'John Kamau',
      businessName: 'Kamau\'s Kitchen',
      phoneNumber: '+254712345678'
    }
  });

  // Create sample stall
  const stall = await prisma.stall.upsert({
    where: { stallOwnerId: stallOwner.id },
    update: {},
    create: {
      stallOwnerId: stallOwner.id,
      name: 'Kamau\'s Kitchen',
      description: 'Delicious local food with fresh ingredients'
    }
  });

  // Create sample menu items
  const menuItems = [
    {
      name: 'Ugali & Sukuma Wiki',
      description: 'Traditional Kenyan meal with collard greens',
      price: 80,
      isAvailable: true
    },
    {
      name: 'Chapati & Beans',
      description: 'Soft chapati with well-seasoned beans',
      price: 60,
      isAvailable: true
    },
    {
      name: 'Rice & Stew',
      description: 'White rice with beef stew',
      price: 120,
      isAvailable: true
    },
    {
      name: 'Githeri',
      description: 'Boiled maize and beans with vegetables',
      price: 70,
      isAvailable: true
    },
    {
      name: 'Pilau',
      description: 'Spiced rice with meat',
      price: 150,
      isAvailable: true
    }
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { 
        id: `${stall.id}-${item.name.toLowerCase().replace(/\s+/g, '-')}`
      },
      update: {},
      create: {
        id: `${stall.id}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        stallId: stall.id,
        ...item
      }
    });
  }

  console.log('✅ Sample stall and menu created');

  // Create sample delivery person
  const deliveryPassword = await bcrypt.hash('delivery123', 12);
  const deliveryUser = await prisma.user.upsert({
    where: { email: 'delivery@klabu.com' },
    update: {},
    create: {
      email: 'delivery@klabu.com',
      password: deliveryPassword,
      role: 'DELIVERY_PERSON'
    }
  });

  const deliveryPerson = await prisma.deliveryPerson.upsert({
    where: { userId: deliveryUser.id },
    update: {},
    create: {
      userId: deliveryUser.id,
      fullName: 'Peter Mwangi',
      phoneNumber: '+254723456789',
      idNumber: '12345678',
      isActive: true,
      rating: 4.8,
      totalDeliveries: 25
    }
  });

  console.log('✅ Sample delivery person created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@klabu.com / admin123');
  console.log('Stall Owner: stall@klabu.com / stall123');
  console.log('Delivery Person: delivery@klabu.com / delivery123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
