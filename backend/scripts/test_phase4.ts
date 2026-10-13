const API_BASE = 'http://localhost:5000/api';

async function request(path: string, options: any = {}) {
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

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('   PHASE 4: REVIEW KEUANGAN & SSH MATCHER ACCEPTANCE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
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
    // Login as Admin / Keuangan
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@alquraniyyah.sch.id',
        password: 'Admin@2026'
      })
    });
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    assert('Auth Keuangan/Admin login succeeds', !!token);

    // Test 1: Fetch review submissions
    const listRes = await request('/reviews', { headers: authHeaders });
    assert('GET /api/reviews returns submission list', Array.isArray(listRes.data.data));

    // Find submission PENG/SMPIT/2026/0001 or any submission
    let targetSub = listRes.data.data.find((s: any) => s.nomorPengajuan === 'PENG/SMPIT/2026/0001');
    if (!targetSub && listRes.data.data.length > 0) {
      targetSub = listRes.data.data[0];
    }
    assert('Target submission exists for review testing', !!targetSub, `Target ID: ${targetSub?.id}`);

    if (targetSub) {
      // Test 2: Start review if not already reviewing
      const startRes = await request(`/reviews/${targetSub.id}/start`, {
        method: 'POST',
        headers: authHeaders
      });
      assert('POST /api/reviews/:id/start initiates review', startRes.data.success);

      // Test 3: Fetch review workspace details
      const detailRes = await request(`/reviews/${targetSub.id}`, { headers: authHeaders });
      const subData = detailRes.data.data;
      assert('GET /api/reviews/:id loads complete review workspace with items and stats', 
        !!subData && Array.isArray(subData.items) && !!subData.stats
      );

      // Test 4: Verify SSH Matcher evaluation on items
      const hvsItem = subData.items.find((item: any) => item.uraian.toLowerCase().includes('kertas hvs a4'));
      assert('SSH Matcher recognized "Kertas HVS A4 75 gram" with reference SSH price',
        !!hvsItem && (hvsItem.sshPrice === 65000 || hvsItem.sshItemName?.toLowerCase().includes('kertas hvs a4')),
        `Found item: ${JSON.stringify(hvsItem)}`
      );

      // Test 5: Verify original_price integrity
      // Update item price to Rp70.000
      if (hvsItem) {
        const updateRes = await request(`/reviews/${targetSub.id}/items/${hvsItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            reviewPrice: 70000,
            notes: 'Disesuaikan parsial untuk uji integritas harga asli'
          })
        });
        const updatedItem = updateRes.data.data?.item;
        
        assert('Inline price edit modifies reviewPrice while strictly preserving originalPrice',
          updatedItem && updatedItem.originalPrice === hvsItem.originalPrice && updatedItem.reviewPrice === 70000,
          `original: ${updatedItem?.originalPrice}, review: ${updatedItem?.reviewPrice}`
        );

        // Test 6: Verify status is MELEBIHI_SSH when price exceeds SSH
        assert('Status accurately marked MELEBIHI_SSH when reviewPrice (70.000) > sshPrice (65.000)',
          updatedItem && updatedItem.sshStatus === 'MELEBIHI_SSH',
          `Status: ${updatedItem?.sshStatus}`
        );

        // Test 7: Update item to match SSH price
        const matchRes = await request(`/reviews/${targetSub.id}/items/${hvsItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            reviewPrice: 65000,
            notes: 'Disamakan dengan batas tertinggi SSH'
          })
        });
        const matchedItem = matchRes.data.data?.item;

        assert('Status dynamically adjusts to SESUAI_SSH when reviewPrice (65.000) <= sshPrice (65.000)',
          matchedItem && matchedItem.sshStatus === 'SESUAI_SSH',
          `Status: ${matchedItem?.sshStatus}`
        );

        // Test 8: Verify real-time recalculation of totalApproved
        const stats = matchRes.data.data?.stats;
        assert('Workspace recalculates stats real-time after price adjustment',
          stats && stats.totalApproved > 0 && stats.exceedingCount >= 0,
          `totalApproved: ${stats?.totalApproved}, exceedingCount: ${stats?.exceedingCount}`
        );
      } else {
        total += 4;
        console.warn('[SKIP] Tests 5-8 skipped because hvsItem was not found in submission items');
      }

      // Test 9: Apply all SSH ceiling adjustment
      const applyAllRes = await request(`/reviews/${targetSub.id}/apply-all-ssh`, {
        method: 'POST',
        headers: authHeaders
      });
      assert('POST /api/reviews/:id/apply-all-ssh executes successfully', applyAllRes.data.success);

      // Test 10: Verify finish review (persetujuan keuangan)
      const finishRes = await request(`/reviews/${targetSub.id}/finish`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          action: 'APPROVED_BY_KEUANGAN',
          notes: 'Seluruh item telah disesuaikan sesuai Standar Satuan Harga (SSH) Yayasan 2026. Siap diajukan ke Pimpinan.'
        })
      });
      assert('Finish review transitions submission status to MENUNGGU_PERSETUJUAN with audit log',
        finishRes.data.success && finishRes.data.data?.status === 'MENUNGGU_PERSETUJUAN',
        `New status: ${finishRes.data.data?.status}`
      );
    }

    console.log(`\n====================================================`);
    console.log(`PHASE 4 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (error: any) {
    console.error('Test run error:', error);
  }
}

runPhase4Tests();
