[dotenv@17.0.1] injecting env (0) from .env – [tip] encrypt with dotenvx: https://dotenvx.com
-- CreateEnum
CREATE TYPE "public"."FacebookConnectAttemptOutcome" AS ENUM ('SUCCESS', 'FAILED', 'CANCELLED', 'ABANDONED');

-- CreateTable
CREATE TABLE "public"."FacebookConnectAttempt" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" "public"."FacebookConnectAttemptOutcome" NOT NULL,
    "failedStep" TEXT,
    "platform" TEXT NOT NULL,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "buildNumber" TEXT,
    "errorDomain" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "context" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookConnectAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacebookConnectAttempt_userId_createdAt_idx" ON "public"."FacebookConnectAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FacebookConnectAttempt_referenceCode_idx" ON "public"."FacebookConnectAttempt"("referenceCode");

-- CreateIndex
CREATE INDEX "FacebookConnectAttempt_createdAt_idx" ON "public"."FacebookConnectAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."FacebookConnectAttempt" ADD CONSTRAINT "FacebookConnectAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

