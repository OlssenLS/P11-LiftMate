-- Migration M-F: AI Conversations, AI Messages, and AI Insights (Phase 6)

-- 1. Create Enums
CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "AiInsightCategory" AS ENUM ('training_volume', 'progressive_overload', 'recovery_fatigue', 'nutrition_protein', 'consistency_streak');
CREATE TYPE "AiInsightConfidence" AS ENUM ('high', 'medium', 'low', 'insufficient');

-- 2. Create ai_conversations table
CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- 3. Create ai_messages table
CREATE TABLE IF NOT EXISTS "ai_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- 4. Create ai_insights table
CREATE TABLE IF NOT EXISTS "ai_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" "AiInsightCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "possible_factors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "recommendation" TEXT NOT NULL,
    "confidence" "AiInsightConfidence" NOT NULL DEFAULT 'medium',
    "data_window_start" TIMESTAMP(3),
    "data_window_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- 5. Foreign Keys
ALTER TABLE "ai_conversations"
    ADD CONSTRAINT "ai_conversations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_messages"
    ADD CONSTRAINT "ai_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_insights"
    ADD CONSTRAINT "ai_insights_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_updated_at_idx" ON "ai_conversations"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ai_conversations_deleted_at_idx" ON "ai_conversations"("deleted_at");

CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

CREATE INDEX IF NOT EXISTS "ai_insights_user_id_idx" ON "ai_insights"("user_id");
CREATE INDEX IF NOT EXISTS "ai_insights_user_id_created_at_idx" ON "ai_insights"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_insights_category_idx" ON "ai_insights"("category");
CREATE INDEX IF NOT EXISTS "ai_insights_deleted_at_idx" ON "ai_insights"("deleted_at");
