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

async function runPhase7Tests() {
  console.log('====================================================');
  console.log('   PHASE 7: REALISASI & LPJ ACCEPTANCE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, detail) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${name}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  try {
    // Test 1: Login as Operator Unit (SMP IT)
    const unitLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'smpit@alquraniyyah.sch.id',
        password: 'Unit@2026'
      })
    });
    const unitToken = unitLoginRes.data?.data?.token;
    const unitAuth = { Authorization: `Bearer ${unitToken}` };
    assert('Auth Unit Operator login succeeds', !!unitToken);

    // Test 2: List disbursed submissions for LPJ
    const listRes = await request('/lpj', { headers: unitAuth });
    const items = listRes.data?.data?.items || [];
    assert('GET /api/lpj returns submissions for unit', Array.isArray(items));

    let targetSub = items.find(s => s.submissionNumber === 'PENG/SMPIT/2026/0001') || items[0];
    assert('Target submission found for LPJ processing', !!targetSub, `Target: ${targetSub?.submissionNumber}`);

    if (targetSub) {
      // Test 3: Get LPJ workspace details
      const detailRes = await request(`/lpj/${targetSub.id}`, { headers: unitAuth });
      const payload = detailRes.data?.data;
      assert('GET /api/lpj/:id returns detail with totalDisbursed and item lines',
        !!payload && !!payload.submission && payload.stats?.totalDisbursed > 0
      );

      // Test 4: Submit LPJ Realization by Unit
      const totalDisbursed = payload.stats.totalDisbursed; // 2.550.000
      // Let realization be Rp2.450.000 (Snack Rp800.000) so there is Sisa Lebih Rp100.000
      const realizationItems = [
        {
          uraian: 'Kertas HVS A4 75 gram',
          volume: 10,
          satuan: 'Rim',
          hargaSatuan: 65000,
          total: 650000,
          notaNumber: 'BON/0112/TOKO-ATK',
          keterangan: 'Dibeli di Toko Sahabat Santri'
        },
        {
          uraian: 'Tinta Printer Epson Original',
          volume: 4,
          satuan: 'Botol',
          hargaSatuan: 100000,
          total: 400000,
          notaNumber: 'BON/0113/TOKO-ATK',
          keterangan: 'Tinta hitam dan warna'
        },
        {
          uraian: 'Snack Rapat Koordinasi Panitia',
          volume: 50,
          satuan: 'Kotak',
          hargaSatuan: 16000,
          total: 800000,
          notaNumber: 'KWT/045/BERKAH-CATERING',
          keterangan: 'Snack konsumsi rapat ujian'
        },
        {
          uraian: 'Honor Pengawas Ujian per Sesi',
          volume: 20,
          satuan: 'Orang/Sesi',
          hargaSatuan: 30000,
          total: 600000,
          notaNumber: 'DAFTAR-HONOR/001',
          keterangan: 'Diterima oleh 10 pengawas ujian'
        }
      ];

      const totalRealized = 650000 + 400000 + 800000 + 600000; // 2.450.000 (Sisa 100.000)

      const submitRes = await request(`/lpj/${targetSub.id}/submit`, {
        method: 'POST',
        headers: unitAuth,
        body: JSON.stringify({
          items: realizationItems,
          notes: 'LPJ pelaksanaan kegiatan ujian semester SMP IT Al-Quraniyyah. Terdapat sisa anggaran Rp100.000 yang disetorkan kembali ke kas yayasan.'
        })
      });

      const updatedSub = submitRes.data?.data;
      assert('POST /api/lpj/:id/submit updates status to MENUNGGU_VERIFIKASI_LPJ',
        submitRes.data?.success && updatedSub?.status === 'MENUNGGU_VERIFIKASI_LPJ',
        `Status: ${updatedSub?.status}`
      );

      // Test 5: Verify totalRealized stored correctly
      assert('Total realisasi tersimpan akurat (Rp2.450.000)',
        updatedSub?.totalRealized === totalRealized,
        `totalRealized: ${updatedSub?.totalRealized}`
      );

      // Test 6: Verify sisa perhitungan (Surplus/Deficit)
      const sisaDana = totalDisbursed - totalRealized;
      assert('Perhitungan sisa lebih dana akurat (Rp100.000 sisa kembali ke kas)',
        sisaDana === 100000,
        `Sisa: ${sisaDana}`
      );

      // Test 7: Login as Keuangan for LPJ verification
      const keuLoginRes = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'keuangan@alquraniyyah.sch.id',
          password: 'Keuangan@2026'
        })
      });
      const keuToken = keuLoginRes.data?.data?.token;
      const keuAuth = { Authorization: `Bearer ${keuToken}` };
      assert('Auth Keuangan login for LPJ verification succeeds', !!keuToken);

      // Test 8: Verify and accept LPJ
      const verifyRes = await request(`/lpj/${targetSub.id}/verify`, {
        method: 'POST',
        headers: keuAuth,
        body: JSON.stringify({
          action: 'ACCEPT',
          notes: 'Seluruh bukti fisik nota dan kuitansi belanja telah diverifikasi sah. Sisa dana Rp100.000 telah disetor ke kas yayasan.'
        })
      });

      const finishedSub = verifyRes.data?.data;
      assert('POST /api/lpj/:id/verify transitions final status to SELESAI',
        verifyRes.data?.success && finishedSub?.status === 'SELESAI',
        `Final status: ${finishedSub?.status}`
      );

      // Test 9: Official LPJ Document generation
      const docRes = await request(`/lpj/${targetSub.id}/lembar-lpj`, { headers: keuAuth });
      const docData = docRes.data?.data;
      assert('GET /api/lpj/:id/lembar-lpj generates official LPJ documentation',
        docRes.data?.success && !!docData?.institution && !!docData?.summary,
        `Title: ${docData?.documentTitle}`
      );

      // Test 10: Verify LPJ signatories and surplus statement
      assert('Lembar LPJ memuat status sisa lebih dan 3 pihak bertanda tangan (Pelaksana, Verifikator, Mengetahui)',
        docData?.summary?.sisaStatus?.includes('SISA LEBIH') &&
        !!docData?.signatories?.pelaksana?.nama &&
        !!docData?.signatories?.verifikator?.nama &&
        !!docData?.signatories?.mengetahui?.nama,
        `Status: ${docData?.summary?.sisaStatus}`
      );
    }

    console.log(`\n====================================================`);
    console.log(`PHASE 7 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (error) {
    console.error('Test run error:', error);
  }
}

runPhase7Tests();
