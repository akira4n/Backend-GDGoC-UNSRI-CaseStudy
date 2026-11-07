import 'dotenv/config';
import prisma from '../src/config/database.js';
import { hashPassword } from '../src/utils/password.js';

async function main() {
  console.log('Seeding database with test accounts...');

  const defaultPassword = await hashPassword('password123');

  // Akun LEAD
  const lead = await prisma.user.upsert({
    where: { email: 'lead@gdgoc-unsri.org' },
    update: {},
    create: {
      name: 'Lead GDGoC UNSRI',
      email: 'lead@gdgoc-unsri.org',
      password: defaultPassword,
      role: 'LEAD',
      division: 'Core Team',
    },
  });

  // Akun DIVISION_HEAD
  const divisionHead = await prisma.user.upsert({
    where: { email: 'head.web@gdgoc-unsri.org' },
    update: {},
    create: {
      name: 'Web Dev Division Head',
      email: 'head.web@gdgoc-unsri.org',
      password: defaultPassword,
      role: 'DIVISION_HEAD',
      division: 'Web Development',
    },
  });

  // Akun MEMBER
  const member = await prisma.user.upsert({
    where: { email: 'member@gdgoc-unsri.org' },
    update: {},
    create: {
      name: 'John Member',
      email: 'member@gdgoc-unsri.org',
      password: defaultPassword,
      role: 'MEMBER',
      division: 'Web Development',
    },
  });

  console.log('\nDatabase seeding completed successfully!');
  console.table([
    {
      Role: lead.role,
      Name: lead.name,
      Email: lead.email,
      Password: 'password123',
    },
    {
      Role: divisionHead.role,
      Name: divisionHead.name,
      Email: divisionHead.email,
      Password: 'password123',
    },
    {
      Role: member.role,
      Name: member.name,
      Email: member.email,
      Password: 'password123',
    },
  ]);
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
