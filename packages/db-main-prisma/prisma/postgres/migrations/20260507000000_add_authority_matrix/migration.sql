-- CreateTable
CREATE TABLE "authority_matrix" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "authority_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_matrix_role" (
    "id" TEXT NOT NULL,
    "authority_matrix_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "last_modified_time" TIMESTAMP(3),
    "last_modified_by" TEXT,

    CONSTRAINT "authority_matrix_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authority_matrix_base_id_idx" ON "authority_matrix"("base_id");

-- CreateIndex
CREATE INDEX "authority_matrix_role_authority_matrix_id_idx" ON "authority_matrix_role"("authority_matrix_id");

-- AddForeignKey
ALTER TABLE "authority_matrix" ADD CONSTRAINT "authority_matrix_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_matrix_role" ADD CONSTRAINT "authority_matrix_role_authority_matrix_id_fkey" FOREIGN KEY ("authority_matrix_id") REFERENCES "authority_matrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;
