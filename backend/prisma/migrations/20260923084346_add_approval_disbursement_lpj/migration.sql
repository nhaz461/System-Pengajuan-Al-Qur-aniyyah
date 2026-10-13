-- CreateTable
CREATE TABLE "disbursements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submission_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "recipient_name" TEXT NOT NULL,
    "reference_number" TEXT,
    "receipt_file" TEXT,
    "notes" TEXT,
    "disbursed_by_id" INTEGER NOT NULL,
    "disbursed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "disbursements_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "disbursements_disbursed_by_id_fkey" FOREIGN KEY ("disbursed_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lpj_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submission_id" INTEGER NOT NULL,
    "submission_item_id" INTEGER,
    "uraian" TEXT NOT NULL,
    "volume" REAL NOT NULL,
    "satuan" TEXT NOT NULL,
    "harga_satuan" REAL NOT NULL,
    "total" REAL NOT NULL,
    "nota_number" TEXT,
    "nota_date" DATETIME,
    "nota_file" TEXT,
    "keterangan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lpj_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lpj_items_submission_item_id_fkey" FOREIGN KEY ("submission_item_id") REFERENCES "submission_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_submissions" (
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
    "approved_by_id" INTEGER,
    "approved_at" DATETIME,
    "approval_notes" TEXT,
    "disbursed_by_id" INTEGER,
    "disbursed_at" DATETIME,
    "disbursement_notes" TEXT,
    "lpj_submitted_at" DATETIME,
    "lpj_notes" TEXT,
    "lpj_status" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "submissions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "submissions_disbursed_by_id_fkey" FOREIGN KEY ("disbursed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_submissions" ("activity_id", "created_at", "file_path", "fiscal_year_id", "id", "notes", "original_filename", "selisih", "status", "submission_number", "submitted_at", "submitted_by_id", "title", "total_approved", "total_disbursed", "total_excel", "total_parsing", "total_realized", "total_reviewed", "unit_id", "updated_at") SELECT "activity_id", "created_at", "file_path", "fiscal_year_id", "id", "notes", "original_filename", "selisih", "status", "submission_number", "submitted_at", "submitted_by_id", "title", "total_approved", "total_disbursed", "total_excel", "total_parsing", "total_realized", "total_reviewed", "unit_id", "updated_at" FROM "submissions";
DROP TABLE "submissions";
ALTER TABLE "new_submissions" RENAME TO "submissions";
CREATE UNIQUE INDEX "submissions_submission_number_key" ON "submissions"("submission_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "disbursements_submission_id_idx" ON "disbursements"("submission_id");

-- CreateIndex
CREATE INDEX "lpj_items_submission_id_idx" ON "lpj_items"("submission_id");
