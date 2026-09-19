/**
 * Seeds a demo library: staff account, two members, and a starting catalog.
 * Safe to re-run: books are upserted and demo state is only created once.
 *
 *   npm run seed
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';

const BOOKS = [
  { id: 'B001', title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', genre: 'Science Fiction' },
  { id: 'B002', title: 'Kindred', author: 'Octavia E. Butler', genre: 'Science Fiction' },
  { id: 'B003', title: 'Solaris', author: 'Stanisław Lem', genre: 'Science Fiction' },
  { id: 'B004', title: 'The Dispossessed', author: 'Ursula K. Le Guin', genre: 'Science Fiction' },
  { id: 'B005', title: 'Beloved', author: 'Toni Morrison', genre: 'Literary Fiction' },
  { id: 'B006', title: 'Things Fall Apart', author: 'Chinua Achebe', genre: 'Literary Fiction' },
  { id: 'B007', title: 'The Remains of the Day', author: 'Kazuo Ishiguro', genre: 'Literary Fiction' },
  { id: 'B008', title: 'A Fine Balance', author: 'Rohinton Mistry', genre: 'Literary Fiction' },
  { id: 'B009', title: 'The Big Sleep', author: 'Raymond Chandler', genre: 'Mystery' },
  { id: 'B010', title: 'Gaudy Night', author: 'Dorothy L. Sayers', genre: 'Mystery' },
  { id: 'B011', title: 'The Daughter of Time', author: 'Josephine Tey', genre: 'Mystery' },
  { id: 'B012', title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', genre: 'Computing' },
  { id: 'B013', title: 'The Mythical Man-Month', author: 'Frederick P. Brooks Jr.', genre: 'Computing' },
  { id: 'B014', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', genre: 'Computing' },
  { id: 'B015', title: 'The C++ Programming Language', author: 'Bjarne Stroustrup', genre: 'Computing' },
  { id: 'B016', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History' },
  { id: 'B017', title: 'The Silk Roads', author: 'Peter Frankopan', genre: 'History' },
  { id: 'B018', title: 'The Discovery of India', author: 'Jawaharlal Nehru', genre: 'History' },
  { id: 'B019', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'Psychology' },
  { id: 'B020', title: 'Man\u2019s Search for Meaning', author: 'Viktor E. Frankl', genre: 'Psychology' },
  { id: 'B021', title: 'The Selfish Gene', author: 'Richard Dawkins', genre: 'Science' },
  { id: 'B022', title: 'Silent Spring', author: 'Rachel Carson', genre: 'Science' },
  { id: 'B023', title: 'Cosmos', author: 'Carl Sagan', genre: 'Science' },
  { id: 'B024', title: 'The Emperor of All Maladies', author: 'Siddhartha Mukherjee', genre: 'Science' },
];

const MEMBERS = [
  { username: 'ayesha', email: 'ayesha@gmail.com', password: 'Reader@123' },
  { username: 'daniyal', email: 'daniyal@gmail.com', password: 'Reader@123' },
];

async function main() {
  console.log('Seeding library...');

  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { role: 'ADMIN' },
    create: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'ADMIN',
    },
  });
  console.log(`  staff account: ${admin.username}`);

  const members = [];
  for (const member of MEMBERS) {
    const user = await prisma.user.upsert({
      where: { username: member.username },
      update: {},
      create: {
        username: member.username,
        email: member.email,
        passwordHash: await bcrypt.hash(member.password, 10),
        role: 'USER',
      },
    });
    members.push(user);
  }
  console.log(`  members: ${members.map((m) => m.username).join(', ')}`);

  for (const book of BOOKS) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: { title: book.title, author: book.author, genre: book.genre },
      create: book,
    });
  }
  console.log(`  books: ${BOOKS.length}`);

  // A little starting state so the dashboards are not empty:
  // one active loan, and one person queued behind it.
  const existingLoan = await prisma.loan.findFirst({ where: { returnedAt: null } });
  if (!existingLoan && members.length >= 2) {
    const book = await prisma.book.findUnique({ where: { id: 'B012' } });
    if (book) {
      const now = new Date();
      await prisma.loan.create({
        data: {
          bookId: book.id,
          userId: members[0].id,
          borrowedAt: now,
          dueAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.book.update({ where: { id: book.id }, data: { available: false } });
      await prisma.activity.create({
        data: {
          action: 'BORROW',
          username: members[0].username,
          userId: members[0].id,
          bookId: book.id,
          bookTitle: book.title,
          genre: book.genre,
        },
      });

      await prisma.waitlistEntry.create({
        data: { bookId: book.id, userId: members[1].id, status: 'WAITING' },
      });
      await prisma.activity.create({
        data: {
          action: 'WAITLIST_JOIN',
          username: members[1].username,
          userId: members[1].id,
          bookId: book.id,
          bookTitle: book.title,
          genre: book.genre,
        },
      });
      console.log(`  demo loan + waiting list on "${book.title}"`);
    }
  }

  console.log('\nDone. Sign in with:');
  console.log(`  staff   ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log('  member  ayesha / Reader@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
