-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "qtdVendidaPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtdVendidaMercearia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtdVendidaEletro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtdVendidaHipel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deixouDeVenderPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deixouDeVenderMercearia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deixouDeVenderEletro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deixouDeVenderHipel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaMercearia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaEletro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaHipel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_companyId_round_key" ON "RoundResult"("companyId", "round");

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
