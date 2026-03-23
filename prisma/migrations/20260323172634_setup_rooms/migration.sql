-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EQUIPMENT_FAILURE', 'SYSTEM_FAILURE', 'OTHER');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 4,
    "caixa" DOUBLE PRECISION NOT NULL DEFAULT 700000,
    "juros" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "quebrasPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "quebrasMercearia" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "quebrasEletro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quebrasHipel" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "agingPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 5.8,
    "agingMercearia" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "agingEletro" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "agingHipel" DOUBLE PRECISION NOT NULL DEFAULT 1.1,
    "impostoPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "impostoMercearia" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "impostoEletro" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "impostoHipel" DOUBLE PRECISION NOT NULL DEFAULT 17,
    "salarios" DOUBLE PRECISION NOT NULL,
    "custoUntPereciveis" DOUBLE PRECISION NOT NULL,
    "custoUntMercearia" DOUBLE PRECISION NOT NULL,
    "custoUntEletro" DOUBLE PRECISION NOT NULL,
    "custoUntHipel" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "type" "EventType" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "RoomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "caixa" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- AddForeignKey
ALTER TABLE "RoomEvent" ADD CONSTRAINT "RoomEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
