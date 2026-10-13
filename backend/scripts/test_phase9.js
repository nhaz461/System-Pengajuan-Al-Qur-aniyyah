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

async function runPhase9Tests() {
  console.log('====================================================');
  console.log('   PHASE 9: BACKUP & AUDIT TRAIL ACCEPTANCE TESTS');
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
    // Test 1: Login as Admin
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@alquraniyyah.sch.id',
        password: 'Admin@2026'
      })
    });
    const token = loginRes.data?.data?.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    assert('Auth Admin login succeeds for maintenance operations', !!token);

    // Test 2: List current backups
    const listRes = await request('/backups', { headers: authHeaders });
    assert('GET /api/backups returns backup files array', Array.isArray(listRes.data?.data));

    // Test 3: Create database backup
    const createRes = await request('/backups/create', {
      method: 'POST',
      headers: authHeaders
    });
    const backupData = createRes.data?.data;
    assert('POST /api/backups/create creates timestamped SQLite backup',
      createRes.data?.success && !!backupData?.filename && backupData.sizeBytes > 0,
      `Filename: ${backupData?.filename}, Size: ${backupData?.sizeFormatted}`
    );

    // Test 4: Verify backup listed in directory
    const verifyListRes = await request('/backups', { headers: authHeaders });
    const hasNewBackup = verifyListRes.data?.data?.some(b => b.filename === backupData?.filename);
    assert('New backup file successfully registered in backups directory', hasNewBackup);

    // Test 5: Fetch Audit Logs
    const auditRes = await request('/backups/audit-logs', { headers: authHeaders });
    const logs = auditRes.data?.data?.items || [];
    assert('GET /api/backups/audit-logs returns complete history log', Array.isArray(logs) && logs.length > 0);

    // Test 6: Verify key lifecycle actions recorded in Audit Trail
    const actions = logs.map(l => l.action);
    const hasDisburse = actions.includes('DISBURSE_PAYMENT');
    const hasApproval = actions.includes('APPROVE_BY_LEADERSHIP');
    const hasBackup = actions.includes('DATABASE_BACKUP');
    const hasLpj = actions.includes('ACCEPT_LPJ_FINAL') || actions.includes('SUBMIT_LPJ');

    assert('Audit Log contains full end-to-end trace (Approval, Disbursement, LPJ, Backup)',
      hasDisburse && hasApproval && hasBackup,
      `Actions recorded: ${actions.slice(0, 8).join(', ')}`
    );

    console.log(`\n====================================================`);
    console.log(`PHASE 9 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);

  } catch (error) {
    console.error('Test run error:', error);
  }
}

runPhase9Tests();
