ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WAREHOUSE_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WAREHOUSE_WORKER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';

ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

CREATE TABLE "user_sessions" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE INDEX "user_sessions_storeId_idx" ON "user_sessions"("storeId");
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
