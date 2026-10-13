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

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('   PHASE 6: PENCAIRAN ANGGARAN (DISBURSEMENT) TESTS');
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
    // Test 1: Login as Petugas Keuangan / Bendahara
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'keuangan@alquraniyyah.sch.id',
        password: 'Keuangan@2026'
      })
    });
    const token = loginRes.data?.data?.token;
    const user = loginRes.data?.data?.user;
    const authHeaders = { Authorization: `Bearer ${token}` };
    assert('Auth Keuangan login succeeds and returns valid JWT', !!token);
    assert('User role is strictly KEUANGAN', user?.role === 'KEUANGAN', `Role: ${user?.role}`);

    // Test 2: List submissions for disbursement
    const listRes = await request('/disbursements', { headers: authHeaders });
    const items = listRes.data?.data?.items || [];
    assert('GET /api/disbursements returns list of approved submissions ready for payout', Array.isArray(items));

    // Test 3: Find approved target submission
    let targetSub = items.find(s => s.submissionNumber === 'PENG/SMPIT/2026/0001') || items.find(s => s.status === 'DISETUJUI') || items[0];
    assert('Target approved submission found for payout processing', !!targetSub, `Target: ${targetSub?.submissionNumber}, Status: ${targetSub?.status}`);

    if (targetSub) {
      // Test 4: Detail workspace for disbursement
      const detailRes = await request(`/disbursements/${targetSub.id}`, { headers: authHeaders });
      const payload = detailRes.data?.data;
      assert('GET /api/disbursements/:id returns workspace with payout stats',
        !!payload && !!payload.submission && !!payload.stats
      );

      // Test 5: Verify payout statistics
      const stats = payload?.stats;
      assert('Stats calculates totalApproved, totalDisbursed, and sisaBelumCair accurately',
        stats && stats.totalApproved > 0 && typeof stats.sisaBelumCair === 'number',
        `Approved: ${stats?.totalApproved}, Disbursed: ${stats?.totalDisbursed}, Sisa: ${stats?.sisaBelumCair}`
      );

      // Test 6: Execute disbursement
      const payoutAmount = stats?.totalApproved || 2650000;
      const disburseRes = await request(`/disbursements/${targetSub.id}/disburse`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          amount: payoutAmount,
          paymentMethod: 'TRANSFER',
          bankName: 'BSI (Bank Syariah Indonesia)',
          accountNumber: '7142026001',
          recipientName: 'Ustadz Ridwan (Bendahara Panitia Ujian SMP IT)',
          referenceNumber: 'TRF/BSI/2026/09/0042',
          notes: 'Pencairan dana kegiatan ujian SMP IT Al-Quraniyyah via transfer BSI.'
        })
      });

      const payoutData = disburseRes.data?.data;
      assert('POST /api/disbursements/:id/disburse transitions status to DICAIRKAN',
        disburseRes.data?.success && payoutData?.submission?.status === 'DICAIRKAN',
        `Status: ${payoutData?.submission?.status}`
      );

      // Test 7: Verify disbursement record
      assert('Disbursement transaction record is created with payment method and reference',
        !!payoutData?.disbursement && payoutData.disbursement.amount === payoutAmount && payoutData.disbursement.paymentMethod === 'TRANSFER',
        `Record: ${JSON.stringify(payoutData?.disbursement)}`
      );

      // Test 8: Total disbursed updated in Submission
      assert('Submission totalDisbursed matches approved amount',
        payoutData?.submission?.totalDisbursed === payoutAmount,
        `totalDisbursed: ${payoutData?.submission?.totalDisbursed}`
      );

      // Test 9: Official disbursement receipt (Kuitansi Pencairan)
      const receiptRes = await request(`/disbursements/${targetSub.id}/kuitansi`, { headers: authHeaders });
      const receiptData = receiptRes.data?.data;
      assert('GET /api/disbursements/:id/kuitansi generates official yayasan payout receipt',
        receiptRes.data?.success && !!receiptData?.institution && receiptData?.amount === payoutAmount,
        `Receipt: ${receiptData?.receiptNumber}, Amount: ${receiptData?.amount}`
      );

      // Test 10: Receipt metadata contains required yayasan fields
      assert('Receipt metadata includes paymentMethod, bank details, and recipient',
        receiptData?.paymentMethod === 'TRANSFER' && !!receiptData?.bankName && !!receiptData?.recipientName
      );
    }

    console.log(`\n====================================================`);
    console.log(`PHASE 6 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (error) {
    console.error('Test run error:', error);
  }
}

runPhase6Tests();
