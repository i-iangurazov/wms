CREATE TABLE "login_attempts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");
CREATE INDEX "login_attempts_ipHash_createdAt_idx" ON "login_attempts"("ipHash", "createdAt");
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");

ALTER TABLE "login_attempts"
  ADD CONSTRAINT "login_attempts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
