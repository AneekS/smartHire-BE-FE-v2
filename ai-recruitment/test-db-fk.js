const { PrismaClient } = require("@prisma/client");

async function main() {
    const prisma = new PrismaClient();
    const user = await prisma.user.findFirst();
    console.log("DB User:", user);
    if (!user) return;

    try {
        const rv = await prisma.resumeVersion.create({
            data: {
                userId: user.id,
                title: "test.pdf",
                status: "DRAFT"
            }
        });
        console.log("Created successfully:", rv);
    } catch (err) {
        console.error("Error creating:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
