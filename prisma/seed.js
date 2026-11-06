const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial department users...');

  const users = [
    {
      email: 'admin@corporatemart.com',
      passwordHash: 'admin123', // In production, use bcrypt hash
      fullName: 'Master Admin',
      role: 'ADMIN',
      phone: '+919876543210',
    },
    {
      email: 'bdm@corporatemart.com',
      passwordHash: 'bdm123',
      fullName: 'Rahul Sharma (BDM)',
      role: 'BDM',
      phone: '+919876543211',
    },
    {
      email: 'leader@corporatemart.com',
      passwordHash: 'leader123',
      fullName: 'Jayesh Rohit (BDM Leader)',
      role: 'BDM',
      phone: '+919876543230',
    },
    {
      email: 'sarika.bdm@corporatemart.com',
      passwordHash: 'bdm123',
      fullName: 'Sarika Jayesh (BDM)',
      role: 'BDM',
      phone: '+919876543232',
    },
    {
      email: 'leader2@corporatemart.com',
      passwordHash: 'leader123',
      fullName: 'Neel Boda (BDM Leader)',
      role: 'BDM',
      phone: '+919876543231',
    },
    {
      email: 'krishna.bdm@corporatemart.com',
      passwordHash: 'bdm123',
      fullName: 'Krishna Parmar (BDM)',
      role: 'BDM',
      phone: '+919876543233',
    },
    {
      email: 'akash.bdm@corporatemart.com',
      passwordHash: 'bdm123',
      fullName: 'Akash Chauhan (BDM)',
      role: 'BDM',
      phone: '+919876543234',
    },
    {
      email: 'accounts@corporatemart.com',
      passwordHash: 'accounts123',
      fullName: 'Pooja Verma (Accounts Lead)',
      role: 'ACCOUNTS',
      phone: '+919876543212',
    },
    {
      email: 'accounts2@corporatemart.com',
      passwordHash: 'accounts123',
      fullName: 'Manish Gupta (Accounts Executive)',
      role: 'ACCOUNTS',
      phone: '+919876543216',
    },
    {
      email: 'legal@corporatemart.com',
      passwordHash: 'legal123',
      fullName: 'Adv. Ananya Roy (Legal Head)',
      role: 'LEGAL',
      phone: '+919876543213',
    },
    {
      email: 'legal2@corporatemart.com',
      passwordHash: 'legal123',
      fullName: 'Adv. Karan Mehta (Legal Associate)',
      role: 'LEGAL',
      phone: '+919876543217',
    },
    {
      email: 'ops@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Vikram Singh (Operations Manager)',
      role: 'OPERATIONS',
      phone: '+919876543214',
    },
    {
      email: 'ops2@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Neha Joshi (Operations Executive)',
      role: 'OPERATIONS',
      phone: '+919876543218',
    },
    {
      email: 'priya.sharma@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Priya Sharma (ROC & Incorporation Specialist)',
      role: 'OPERATIONS',
      phone: '+919876543220',
    },
    {
      email: 'amit.patel@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Amit Patel (Financial & Pitch Specialist)',
      role: 'OPERATIONS',
      phone: '+919876543221',
    },
    {
      email: 'rahul.nair@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Rahul Nair (Tech Lead & Full Stack)',
      role: 'OPERATIONS',
      phone: '+919876543222',
    },
    {
      email: 'siddharth.rawat@corporatemart.com',
      passwordHash: 'ops123',
      fullName: 'Siddharth Rawat (GeM & Tender Specialist)',
      role: 'OPERATIONS',
      phone: '+919876543223',
    },
    {
      email: 'rm@corporatemart.com',
      passwordHash: 'rm123',
      fullName: 'Sneha Patel (Relationship Manager)',
      role: 'RM',
      phone: '+919876543215',
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({ data: u });
      console.log(`Created user: ${u.fullName} (${u.role})`);
    } else {
      console.log(`User already exists: ${u.fullName} (${u.role})`);
    }
  }

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
