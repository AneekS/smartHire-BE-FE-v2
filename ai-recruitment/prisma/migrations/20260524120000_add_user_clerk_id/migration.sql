-- Clerk auth: User.clerkId was in Prisma schema but never migrated to Azure

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");
