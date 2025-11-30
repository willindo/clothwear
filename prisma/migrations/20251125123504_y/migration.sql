/*
  Warnings:

  - You are about to drop the column `key` on the `Attribute` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `Attribute` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Attribute` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `AttributeGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Attribute` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,attributeId]` on the table `ProductAttribute` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[variantId,attributeId]` on the table `VariantAttribute` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kind` to the `Attribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Attribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Attribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `AttributeGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Attribute_key_key";

-- DropIndex
DROP INDEX "public"."ProductAttribute_productId_attributeId_value_key";

-- DropIndex
DROP INDEX "public"."VariantAttribute_variantId_attributeId_value_key";

-- AlterTable
ALTER TABLE "Attribute" DROP COLUMN "key",
DROP COLUMN "label",
DROP COLUMN "type",
ADD COLUMN     "kind" TEXT NOT NULL,
ADD COLUMN     "max" DOUBLE PRECISION,
ADD COLUMN     "min" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "pattern" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AttributeGroup" DROP COLUMN "label",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_slug_key" ON "Attribute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_attributeId_key" ON "ProductAttribute"("productId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttribute_variantId_attributeId_key" ON "VariantAttribute"("variantId", "attributeId");
