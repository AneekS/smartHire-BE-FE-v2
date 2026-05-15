-- Preferred job titles live only on PreferredRole; remove legacy string array.
ALTER TABLE "CareerPreference" DROP COLUMN IF EXISTS "preferredRoles";
