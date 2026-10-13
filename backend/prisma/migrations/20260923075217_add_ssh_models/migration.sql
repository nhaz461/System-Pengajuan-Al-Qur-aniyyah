-- CreateTable
CREATE TABLE "ssh_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "imported_by_id" INTEGER NOT NULL,
    "imported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ssh_versions_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ssh_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ssh_version_id" INTEGER NOT NULL,
    "kode" TEXT,
    "kategori" TEXT NOT NULL,
    "uraian" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "harga_ssh" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "keterangan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ssh_items_ssh_version_id_fkey" FOREIGN KEY ("ssh_version_id") REFERENCES "ssh_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ssh_items_ssh_version_id_idx" ON "ssh_items"("ssh_version_id");

-- CreateIndex
CREATE INDEX "ssh_items_uraian_idx" ON "ssh_items"("uraian");

-- CreateIndex
CREATE INDEX "ssh_items_kode_idx" ON "ssh_items"("kode");
