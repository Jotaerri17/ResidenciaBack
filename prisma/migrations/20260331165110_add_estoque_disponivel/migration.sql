/*
  Warnings:

  - Added the required column `estoqueDisponivelEletro` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estoqueDisponivelHipel` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estoqueDisponivelMercearia` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estoqueDisponivelPereciveis` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "estoqueDisponivelEletro" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueDisponivelHipel" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueDisponivelMercearia" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueDisponivelPereciveis" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "capexBalancaValor" SET DEFAULT 75000,
ALTER COLUMN "capexMelhoriaContinuaValor" SET DEFAULT 45000,
ALTER COLUMN "capexRedesValor" SET DEFAULT 80000,
ALTER COLUMN "capexSegurancaValor" SET DEFAULT 50000,
ALTER COLUMN "capexSelfCheckoutValor" SET DEFAULT 80000,
ALTER COLUMN "capexSiteValor" SET DEFAULT 65000;
