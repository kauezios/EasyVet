-- CreateTable
CREATE TABLE "InactivityPolicySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxInactiveDays" INTEGER NOT NULL DEFAULT 90,
    "excludedRoles" "AccessRole"[] DEFAULT ARRAY['ADMIN']::"AccessRole"[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InactivityPolicySettings_pkey" PRIMARY KEY ("id")
);
