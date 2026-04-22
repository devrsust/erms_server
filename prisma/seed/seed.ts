import { prisma } from "../../lib/prisma";
import { seedRoles } from "./role.seed";
import { seedUsers } from "./user.seed";

async function main() {

    console.log('🌱 Starting database seeding...');

    await seedRoles(prisma);
    await seedUsers(prisma);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });