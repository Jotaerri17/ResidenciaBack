-- =============================================================
-- Migration: add_quiz_session_questions_answers
-- Adds: QuizStatus enum, Category, Question, QuizSession, Answer
-- Alters: EventType enum (new values), QuizResult (timeExpiredCount)
-- =============================================================

-- 1. Fix EventType enum (replace old values with new ones)
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SEGURANCA';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'BALANCA_FREEZER';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'REDES';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SITE';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SELF_CHECKOUT';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'MELHORIA_CONTINUA';

-- 2. Create QuizStatus enum
DO $$ BEGIN
  CREATE TYPE "QuizStatus" AS ENUM ('PENDING', 'ACTIVE', 'FINISHED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Add timeExpiredCount to QuizResult (if not exists)
ALTER TABLE "QuizResult" ADD COLUMN IF NOT EXISTS "timeExpiredCount" INTEGER NOT NULL DEFAULT 0;

-- 4. CreateTable Category
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 5. CreateIndex Category.name (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");

-- 6. CreateTable Question
CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- 7. AddForeignKey Question -> Category
ALTER TABLE "Question"
    ADD CONSTRAINT "Question_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. CreateTable QuizSession
CREATE TABLE IF NOT EXISTS "QuizSession" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" "QuizStatus" NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- 9. CreateIndex QuizSession.quizId (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "QuizSession_quizId_key" ON "QuizSession"("quizId");

-- 10. AddForeignKey QuizSession -> Quiz
ALTER TABLE "QuizSession"
    ADD CONSTRAINT "QuizSession_quizId_fkey"
    FOREIGN KEY ("quizId") REFERENCES "Quiz"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. CreateTable Answer
CREATE TABLE IF NOT EXISTS "Answer" (
    "id" TEXT NOT NULL,
    "quizSessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOption" INTEGER,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "timeExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- 12. AddForeignKey Answer -> QuizSession
ALTER TABLE "Answer"
    ADD CONSTRAINT "Answer_quizSessionId_fkey"
    FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
