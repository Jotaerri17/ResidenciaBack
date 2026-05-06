-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "acertos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_roomId_key" ON "Quiz"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResult_quizId_companyId_key" ON "QuizResult"("quizId", "companyId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
