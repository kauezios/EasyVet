-- CreateEnum
CREATE TYPE "MedicalRecordStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "MedicalRecord" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "status" "MedicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "chiefComplaint" TEXT,
  "symptomsOnset" TEXT,
  "clinicalHistory" TEXT,
  "physicalExam" TEXT,
  "presumptiveDiagnosis" TEXT,
  "conduct" TEXT,
  "guidance" TEXT,
  "recommendedReturnAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_appointmentId_key" ON "MedicalRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "MedicalRecord_status_idx" ON "MedicalRecord"("status");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
