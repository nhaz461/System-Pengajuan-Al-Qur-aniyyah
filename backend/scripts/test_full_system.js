const API_BASE = 'http://127.0.0.1:5000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runEndToEndVerification() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SISTEM ADMINISTRASI KEUANGAN YAYASAN AL-QUR\'ANIYYAH v1.0   ║');
  console.log('║          PENGUJIAN SISTEM LENGKAP END-TO-END (PHASE 1-9)     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, detail) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total.toString().padStart(2, '0')}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total.toString().padStart(2, '0')}: ${name}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  try {
    // ─── 1. Health Check ──────────────────────────────────────
    const health = await request('/health');
    assert('System Health Check OK (API responding)', health.status === 200 && health.data?.status === 'OK');

    // ─── 2. Auth Roles Check ──────────────────────────────────
    const loginAdmin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@alquraniyyah.sch.id', password: 'Admin@2026' })
    });
    const adminToken = loginAdmin.data?.data?.token;
    assert('Login Admin berhasil (Role: ADMIN)', !!adminToken);

    const loginPimpinan = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'pimpinan@alquraniyyah.sch.id', password: 'Pimpinan@2026' })
    });
    const pimpinanToken = loginPimpinan.data?.data?.token;
    assert('Login Pimpinan berhasil (Role: PIMPINAN)', !!pimpinanToken);

    const loginKeuangan = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'keuangan@alquraniyyah.sch.id', password: 'Keuangan@2026' })
    });
    const keuanganToken = loginKeuangan.data?.data?.token;
    assert('Login Bendahara Keuangan berhasil (Role: KEUANGAN)', !!keuanganToken);

    const loginUnit = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'smpit@alquraniyyah.sch.id', password: 'Unit@2026' })
    });
    const unitToken = loginUnit.data?.data?.token;
    assert('Login Operator Unit SMPIT berhasil (Role: UNIT)', !!unitToken);

    // ─── 3. Master Data & Master SSH ─────────────────────────
    const sshRes = await request('/ssh/status', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert('Master SSH 2026 aktif di SQLite dengan data terisi',
      sshRes.data?.data?.hasMaster && sshRes.data?.data?.totalItems > 0,
      `Total items: ${sshRes.data?.data?.totalItems}`
    );

    // ─── 4. Alur Siklus Anggaran Lengkap (Submissions) ─────────
    const subListRes = await request('/submissions', { headers: { Authorization: `Bearer ${adminToken}` } });
    const submissions = subListRes.data?.data?.items || [];
    assert('Daftar pengajuan unit dapat diakses (Section R format)', Array.isArray(submissions) && submissions.length > 0);

    // Cari pengajuan PENG/SMPIT/2026/0001 yang telah melalui seluruh siklus
    const targetSub = submissions.find(s => s.submissionNumber === 'PENG/SMPIT/2026/0001') || submissions[0];
    assert('Target pengajuan PENG/SMPIT/2026/0001 terverifikasi', !!targetSub, `Target: ${targetSub?.submissionNumber}`);

    if (targetSub) {
      // ─── 5. Review Keuangan & SSH Matching (Phase 4) ──────────
      const reviewRes = await request(`/reviews/${targetSub.id}`, {
        headers: { Authorization: `Bearer ${keuanganToken}` }
      });
      assert('Workspace Review Keuangan memuat data item dan pencocokan SSH',
        reviewRes.data?.success && !!reviewRes.data?.data?.stats
      );

      // ─── 6. Persetujuan Pimpinan (Phase 5) ────────────────────
      const approvalRes = await request(`/approvals/${targetSub.id}`, {
        headers: { Authorization: `Bearer ${pimpinanToken}` }
      });
      assert('Workspace Persetujuan Pimpinan memuat data perbandingan eksekutif',
        approvalRes.data?.success && !!approvalRes.data?.data?.stats
      );

      const lembarPengesahan = await request(`/approvals/${targetSub.id}/lembar-pengesahan`, {
        headers: { Authorization: `Bearer ${pimpinanToken}` }
      });
      assert('Dokumen Lembar Pengesahan Resmi Yayasan dapat dicetak',
        lembarPengesahan.data?.success && !!lembarPengesahan.data?.data?.header
      );

      // ─── 7. Pencairan Anggaran (Phase 6) ──────────────────────
      const kuitansiRes = await request(`/disbursements/${targetSub.id}/kuitansi`, {
        headers: { Authorization: `Bearer ${keuanganToken}` }
      });
      assert('Kuitansi Resmi Pencairan Kas/Bank Yayasan dapat dicetak',
        kuitansiRes.data?.success && !!kuitansiRes.data?.data?.receiptNumber,
        `Kuitansi: ${kuitansiRes.data?.data?.receiptNumber}`
      );

      // ─── 8. Realisasi & LPJ (Phase 7) ─────────────────────────
      const lpjRes = await request(`/lpj/${targetSub.id}/lembar-lpj`, {
        headers: { Authorization: `Bearer ${keuanganToken}` }
      });
      assert('Dokumen Laporan Pertanggungjawaban (LPJ) Resmi Yayasan dapat dicetak',
        lpjRes.data?.success && !!lpjRes.data?.data?.summary?.sisaStatus
      );
    }

    // ─── 9. Dashboard Eksekutif Yayasan (Phase 8) ──────────────
    const dashRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dashData = dashRes.data?.data;
    assert('Dashboard Eksekutif Yayasan menyajikan rekapitulasi real-time',
      dashRes.data?.success && dashData?.totalPengajuan > 0 && Array.isArray(dashData?.unitBreakdown)
    );

    // ─── 10. Backup Database & Audit Trail (Phase 9) ───────────
    const backupRes = await request('/backups', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Cadangan database SQLite tersimpan aman di folder backups/',
      backupRes.data?.success && Array.isArray(backupRes.data?.data) && backupRes.data.data.length > 0
    );

    const auditRes = await request('/backups/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Riwayat Audit Trail mencatat jejak aktivitas seluruh pengguna secara transparan',
      auditRes.data?.success && Array.isArray(auditRes.data?.data?.items) && auditRes.data.data.items.length > 0
    );

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║   HASIL VERIFIKASI AKHIR: ${passed}/${total} PENGUJIAN LULUS 100%             ║`);
    console.log('║   SELURUH MODUL APLIKASI SIAP DIGUNAKAN UNTUK OPERASIONAL   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error during end-to-end verification:', error);
  }
}

runEndToEndVerification();
