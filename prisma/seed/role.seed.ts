// prisma/seed/role.seed.ts
import { PrismaClient } from "../../generated/prisma/client";

export async function seedRoles(prisma: PrismaClient) {
  console.log("Seeding roles...");
  
  const roles = [
    { name: "Super Admin" },      
    { name: "Admin" },
    { name: "Alumni" },
    { name: "Record Officer" },
    { name: "Guest" }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role
    });
  }

  console.log(`${roles.length} roles seeded successfully!`);
}