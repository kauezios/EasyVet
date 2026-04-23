-- CreateTable
CREATE TABLE "ClinicScheduleSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "consultationDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "openingTime" TEXT NOT NULL DEFAULT '08:00',
    "closingTime" TEXT NOT NULL DEFAULT '18:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicScheduleSettings_pkey" PRIMARY KEY ("id")
);
