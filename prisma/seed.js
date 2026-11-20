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
      fullName: 'Sarika Jayesh (BDM)',
      role: 'BDM',
      salesTarget: 180000,
      phone: '+919876543211',
    },
    {
      email: 'leader@corporatemart.com',
      passwordHash: 'leader123',
      fullName: 'Jayesh Rohit (BDM Leader)',
      role: 'BDM',
      salesTarget: 200000,
      phone: '+919876543230',
    },
    { email: 'sarika.jayesh@corporatemart.com', passwordHash: 'Sarika@381J', fullName: 'Sarika Jayesh', role: 'BDM', salesTarget: 180000, phone: '+919876543201' },
    { email: 'jayesh.rohit@corporatemart.com', passwordHash: 'Jayesh@492R', fullName: 'Jayesh Rohit', role: 'BDM', salesTarget: 200000, phone: '+919876543202' },
    { email: 'neel.boda@corporatemart.com', passwordHash: 'Neel@715B', fullName: 'Neel Boda', role: 'BDM', salesTarget: 1271, phone: '+919876543203' },
    { email: 'shashank.singhal@corporatemart.com', passwordHash: 'Shashank@528S', fullName: 'Shashank Singhal', role: 'BDM', salesTarget: 240000, phone: '+919876543204' },
    { email: 'krishna.parmar@corporatemart.com', passwordHash: 'Krishna@639P', fullName: 'Krishna Parmar', role: 'BDM', salesTarget: 140000, phone: '+919876543205' },
    { email: 'akash.chauhan@corporatemart.com', passwordHash: 'Akash@247C', fullName: 'Akash Chauhan', role: 'BDM', salesTarget: 148000, phone: '+919876543206' },
    { email: 'bhavin.manghani@corporatemart.com', passwordHash: 'Bhavin@814M', fullName: 'Bhavin Manghani', role: 'BDM', salesTarget: 100000, phone: '+919876543207' },
    { email: 'mauli.koshti@corporatemart.com', passwordHash: 'Mauli@395K', fullName: 'Mauli Koshti', role: 'BDM', salesTarget: 100000, phone: '+919876543208' },
    { email: 'vishishta.dixit@corporatemart.com', passwordHash: 'Vishishta@462D', fullName: 'Vishishta Dixit', role: 'BDM', salesTarget: 240000, phone: '+919876543209' },
    { email: 'mitali.shah@corporatemart.com', passwordHash: 'Mitali@573S', fullName: 'Mitali Shah', role: 'BDM', salesTarget: 80000, phone: '+919876543210' },
    { email: 'akash.rawal@corporatemart.com', passwordHash: 'Akash@918R', fullName: 'Akash Rawal', role: 'BDM', salesTarget: 2000, phone: '+919876543211' },
    { email: 'darshak.fichadiya@corporatemart.com', passwordHash: 'Darshak@624F', fullName: 'Darshak Fichadiya', role: 'BDM', salesTarget: 60000, phone: '+919876543212' },
    { email: 'manish.chauhan@corporatemart.com', passwordHash: 'Manish@735C', fullName: 'Manish Chauhan', role: 'BDM', salesTarget: 100000, phone: '+919876543213' },
    { email: 'vairagi.shah@corporatemart.com', passwordHash: 'Vairagi@846S', fullName: 'Vairagi Shah', role: 'BDM', salesTarget: 280000, phone: '+919876543214' },
    { email: 'pandya.parimal@corporatemart.com', passwordHash: 'Parimal@957P', fullName: 'Pandya Parimal', role: 'BDM', salesTarget: 105000, phone: '+919876543215' },
    { email: 'rathod.mehul@corporatemart.com', passwordHash: 'Mehul@168R', fullName: 'Rathod Mehul', role: 'BDM', salesTarget: 3750, phone: '+919876543216' },
    { email: 'panchal.kunal@corporatemart.com', passwordHash: 'Kunal@279P', fullName: 'Panchal Kunal', role: 'BDM', salesTarget: 96000, phone: '+919876543217' },
    { email: 'yash.rathod@corporatemart.com', passwordHash: 'Yash@380R', fullName: 'Yash Rathod', role: 'BDM', salesTarget: 300000, phone: '+919876543218' },
    { email: 'pankaj.solanki@corporatemart.com', passwordHash: 'Pankaj@491S', fullName: 'Pankaj Solanki', role: 'BDM', salesTarget: 200000, phone: '+919876543219' },
    { email: 'rishi.hemnani@corporatemart.com', passwordHash: 'Rishi@502H', fullName: 'Rishi Hemnani', role: 'BDM', salesTarget: 75000, phone: '+919876543220' },
    { email: 'vinay.raj@corporatemart.com', passwordHash: 'Vinay@613R', fullName: 'Vinay Raj', role: 'BDM', salesTarget: 62500, phone: '+919876543221' },
    { email: 'himanshu.goswami@corporatemart.com', passwordHash: 'Himanshu@724G', fullName: 'Himanshu Goswami', role: 'BDM', salesTarget: 57500, phone: '+919876543222' },
    { email: 'jimit.panchal@corporatemart.com', passwordHash: 'Jimit@835P', fullName: 'Jimit Panchal', role: 'BDM', salesTarget: 25000, phone: '+919876543223' },
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
