-- ============================================================
-- Enable Row Level Security (RLS) on ALL Narinyland tables
-- ============================================================
-- This blocks access via Supabase Data API (anon/authenticated roles)
-- while Prisma (using the postgres superuser role) remains unaffected.
-- ============================================================

-- Enable RLS on every table
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Memory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoveLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoveStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestLog" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DENY all access to anon and authenticated roles
-- (No policies = no access for non-superuser roles)
-- ============================================================
-- By enabling RLS with NO policies, the default behavior is
-- to DENY all SELECT, INSERT, UPDATE, DELETE for 'anon' and
-- 'authenticated' roles. Only the 'postgres' superuser
-- (used by Prisma) bypasses RLS automatically.
-- ============================================================

-- Revoke direct table access from public/anon/authenticated
REVOKE ALL ON "AppConfig" FROM anon, authenticated;
REVOKE ALL ON "Partner" FROM anon, authenticated;
REVOKE ALL ON "Memory" FROM anon, authenticated;
REVOKE ALL ON "TimelineEvent" FROM anon, authenticated;
REVOKE ALL ON "LoveLetter" FROM anon, authenticated;
REVOKE ALL ON "Coupon" FROM anon, authenticated;
REVOKE ALL ON "LoveStats" FROM anon, authenticated;
REVOKE ALL ON "QuestLog" FROM anon, authenticated;
