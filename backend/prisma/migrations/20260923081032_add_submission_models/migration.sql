-- CreateTable
CREATE TABLE "submissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submission_number" TEXT NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "fiscal_year_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_path" TEXT,
    "total_excel" REAL NOT NULL,
    "total_parsing" REAL NOT NULL,
    "selisih" REAL NOT NULL DEFAULT 0,
    "total_reviewed" REAL,
    "total_approved" REAL,
    "total_disbursed" REAL,
    "total_realized" REAL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_REVIEW',
    "submitted_by_id" INTEGER NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "submissions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "submission_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submission_id" INTEGER NOT NULL,
    "item_number" INTEGER NOT NULL,
    "kategori" TEXT NOT NULL,
    "uraian" TEXT NOT NULL,
    "harga_satuan" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "satuan" TEXT NOT NULL,
    "jumlah" REAL NOT NULL,
    "keterangan" TEXT,
    "original_price" REAL NOT NULL,
    "review_price" REAL,
    "ssh_price" REAL,
    "ssh_status" TEXT DEFAULT 'BELUM_REVIEW',
    "ssh_item_id" INTEGER,
    "review_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "submission_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "submission_items_ssh_item_id_fkey" FOREIGN KEY ("ssh_item_id") REFERENCES "ssh_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "submissions_submission_number_key" ON "submissions"("submission_number");

-- CreateIndex
CREATE INDEX "submission_items_submission_id_idx" ON "submission_items"("submission_id");

-- CreateIndex
CREATE INDEX "submission_items_uraian_idx" ON "submission_items"("uraian");
