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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('   PHASE 5: PERSETUJUAN PIMPINAN ACCEPTANCE TESTS');
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
    // Test 1: Login as Pimpinan
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'pimpinan@alquraniyyah.sch.id',
        password: 'Pimpinan@2026'
      })
    });
    const token = loginRes.data?.data?.token;
    const user = loginRes.data?.data?.user;
    const authHeaders = { Authorization: `Bearer ${token}` };
    assert('Auth Pimpinan login succeeds and returns valid JWT', !!token);
    assert('User role is strictly PIMPINAN', user?.role === 'PIMPINAN', `Role: ${user?.role}`);

    // Test 2: List submissions for approval
    const listRes = await request('/approvals', { headers: authHeaders });
    const items = listRes.data?.data?.items || [];
    assert('GET /api/approvals returns list of submissions requiring leadership review', Array.isArray(items));

    // Test 3: Find target submission
    let targetSub = items.find(s => s.submissionNumber === 'PENG/SMPIT/2026/0001') || items[0];
    assert('Target submission found in leadership inbox', !!targetSub, `Target: ${targetSub?.submissionNumber}`);

    if (targetSub) {
      // Test 4: Detail workspace for leadership
      const detailRes = await request(`/approvals/${targetSub.id}`, { headers: authHeaders });
      const payload = detailRes.data?.data;
      assert('GET /api/approvals/:id returns full detail with items and executive stats', 
        !!payload && !!payload.submission && !!payload.stats
      );

      // Test 5: Verify executive comparison stats
      const stats = payload?.stats;
      assert('Executive stats correctly compares Total Pengajuan vs Total Review vs Efisiensi',
        stats && stats.totalOriginal > 0 && stats.totalReviewed > 0 && stats.selisihReview >= 0,
        `Original: ${stats?.totalOriginal}, Reviewed: ${stats?.totalReviewed}, Efisiensi: ${stats?.selisihReview}`
      );

      // Test 6: Verify items contain SSH evaluation for leadership transparency
      const itemsList = payload?.submission?.items || [];
      const hasSshInfo = itemsList.some(it => it.sshStatus !== null && it.sshStatus !== undefined);
      assert('Item rincian belanja memuat status kepatuhan SSH untuk transparansi pimpinan', hasSshInfo);

      // Test 7: Leadership Decision - APPROVE
      const approvedAmount = stats?.totalReviewed || 2650000;
      const decideRes = await request(`/approvals/${targetSub.id}/decide`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          action: 'APPROVE',
          approvedAmount: approvedAmount,
          notes: 'Disetujui penuh sesuai hasil telaah bagian keuangan dan standar SSH Yayasan 2026.'
        })
      });

      const updatedSub = decideRes.data?.data;
      assert('POST /api/approvals/:id/decide sets status to DISETUJUI with totalApproved',
        decideRes.data?.success && updatedSub?.status === 'DISETUJUI' && updatedSub?.totalApproved === approvedAmount,
        `Status: ${updatedSub?.status}, totalApproved: ${updatedSub?.totalApproved}`
      );

      // Test 8: Verify approvedBy relationship
      assert('Pimpinan tercatat sebagai approver resmi di database',
        updatedSub?.approvedById === user?.id || !!updatedSub?.approvedBy,
        `approvedById: ${updatedSub?.approvedById}`
      );

      // Test 9: Official Signing Sheet (Lembar Pengesahan)
      const sheetRes = await request(`/approvals/${targetSub.id}/lembar-pengesahan`, { headers: authHeaders });
      const sheetData = sheetRes.data?.data;
      assert('GET /api/approvals/:id/lembar-pengesahan generates official signing document',
        sheetRes.data?.success && !!sheetData?.header && !!sheetData?.signatories?.pimpinan,
        `Header: ${sheetData?.header?.institution}`
      );

      // Test 10: Signatories validation
      assert('Signatories structure contains Pemohon, Keuangan, and Pimpinan',
        sheetData?.signatories?.pemohon?.nama && sheetData?.signatories?.keuangan?.nama && sheetData?.signatories?.pimpinan?.nama
      );
    }

    console.log(`\n====================================================`);
    console.log(`PHASE 5 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (error) {
    console.error('Test run error:', error);
  }
}

runPhase5Tests();
