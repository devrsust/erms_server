// prisma/seed/role.seed.ts
import { PrismaClient } from "../../generated/prisma/client";

export async function seedRoles(prisma: PrismaClient) {
  console.log("Seeding roles...");
  
  const roles = [
    { name: "SUPER ADMIN" },      
    { name: "ADMIN" },
    { name: "ALUMNI" },
    { name: "RECORD OFFICER" },
    { name: "DIRECTOR" }
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