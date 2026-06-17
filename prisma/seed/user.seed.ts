// prisma/seed/user.seed.ts
import { PrismaClient } from "../../generated/prisma/client.js";
import bcrypt from "bcryptjs"; // You'll need to install this: npm install bcryptjs @types/bcryptjs

export async function seedUsers(prisma: PrismaClient) {
  console.log("🌱 Seeding users...");

  // First, get all roles to assign to users
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map(role => [role.name, role.id]));

  // Hash password for all users (use a default password)
  const defaultPassword = "12345678";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const users = [
    {
      firstname: "Super",
      lastname: "Admin",
      email: "super@erms.com",
      password: hashedPassword,
      roleName: "SUPER ADMIN",
      isActive: true
    },
    {
      firstname: "System",
      lastname: "Administrator",
      email: "admin@erms.com",
      password: hashedPassword,
      roleName: "ADMIN",
      isActive: true
    },
    {
      firstname: "Records",
      lastname: "Officer",
      email: "records@erms.com",
      password: hashedPassword,
      roleName: "RECORD OFFICER",
      isActive: true
    },
    {
      firstname: "Records",
      lastname: "Director",
      email: "director@erms.com",
      password: hashedPassword,
      roleName: "DIRECTOR",
      isActive: true
    }
  ];

  let created = 0;
  let updated = 0;

  for (const user of users) {
    const roleId = roleMap.get(user.roleName);

    if (!roleId) {
      console.log(`⚠️ Role "${user.roleName}" not found, skipping user ${user.email}`);
      continue;
    }

    try {
      const result = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          firstname: user.firstname,
          lastname: user.lastname,
          password: user.password,
          roleId: roleId,
          isActive: user.isActive
        },
        create: {
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          password: user.password,
          roleId: roleId,
          isActive: user.isActive
        }
      });

      if (result.createdAt === result.updatedAt) {
        created++;
        console.log(`✅ Created user: ${user.email} (${user.roleName})`);
      } else {
        updated++;
        console.log(`🔄 Updated user: ${user.email} (${user.roleName})`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed user ${user.email}:`, error);
    }
  }

  console.log(`✅ Users seeding complete: ${created} created, ${updated} updated`);
  console.log(`ℹ️ Default password for all users: "${defaultPassword}"`);
}