-- CreateTable
CREATE TABLE "skill_aliases" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,

    CONSTRAINT "skill_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_aliases_alias_key" ON "skill_aliases"("alias");
