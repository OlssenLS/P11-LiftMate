-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('verified', 'custom', 'tkpi', 'open_food_facts');

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "serving_size" VARCHAR(100) NOT NULL,
    "serving_unit" VARCHAR(50) NOT NULL DEFAULT 'g',
    "serving_weight_g" DOUBLE PRECISION,
    "calories" DECIMAL(7,2) NOT NULL,
    "protein" DECIMAL(7,2) NOT NULL,
    "carbs" DECIMAL(7,2) NOT NULL,
    "fat" DECIMAL(7,2) NOT NULL,
    "source" "FoodSource" NOT NULL DEFAULT 'verified',
    "barcode" VARCHAR(100),
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "food_id" UUID,
    "food_name" VARCHAR(255) NOT NULL,
    "serving_size" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "meal_type" "MealType" NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "calories" DECIMAL(7,2) NOT NULL,
    "protein" DECIMAL(7,2) NOT NULL,
    "carbs" DECIMAL(7,2) NOT NULL,
    "fat" DECIMAL(7,2) NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'database',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "food_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foods_barcode_key" ON "foods"("barcode");
CREATE UNIQUE INDEX "foods_external_id_key" ON "foods"("external_id");
CREATE INDEX "foods_name_idx" ON "foods"("name");
CREATE INDEX "foods_source_idx" ON "foods"("source");
CREATE INDEX "foods_deleted_at_idx" ON "foods"("deleted_at");

-- CreateIndex
CREATE INDEX "food_logs_user_id_idx" ON "food_logs"("user_id");
CREATE INDEX "food_logs_user_id_logged_at_idx" ON "food_logs"("user_id", "logged_at");
CREATE INDEX "food_logs_user_id_meal_type_idx" ON "food_logs"("user_id", "meal_type");
CREATE INDEX "food_logs_food_id_idx" ON "food_logs"("food_id");
CREATE INDEX "food_logs_deleted_at_idx" ON "food_logs"("deleted_at");

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
