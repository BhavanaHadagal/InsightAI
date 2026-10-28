const fs = require('fs');
const path = require('path');
const { parseSpreadsheetBuffer } = require('./src/services/excelParser');
const { analyzeDataset } = require('./src/services/analyticsEngine');
const { createUser, findUserByEmail, createDataset, getDatasetsByOwner } = require('./src/services/dataStorage');

async function runTests() {
  console.log('Running InsightAI Backend Unit & Verification Tests...\n');

  // Test 1: Excel Parsing
  console.log('1. Testing Excel Parsing...');
  const samplePath = path.resolve(__dirname, '../sample-data/supermarket_sales_ai_analyzer.xlsx');
  const buffer = fs.readFileSync(samplePath);
  const parsed = parseSpreadsheetBuffer(buffer, { requestedSheet: 'Sales_Transactions' });

  if (parsed.rowCount <= 0) throw new Error('Expected rowCount > 0');
  if (parsed.columns.length <= 0) throw new Error('Expected columns.length > 0');
  console.log(`   ✓ Parsed ${parsed.rowCount} rows, ${parsed.columns.length} columns from ${parsed.selectedSheet}`);

  // Test 2: Deterministic Analytics Engine
  console.log('2. Testing Analytics Engine...');
  const analysis = analyzeDataset(parsed.records, parsed.columns, parsed.duplicateRowCount);

  if (!analysis.kpis) throw new Error('Expected KPIs');
  if (analysis.kpis.totalRecords !== parsed.rowCount) throw new Error('KPI totalRecords mismatch');
  console.log(`   ✓ KPIs computed: Total Records = ${analysis.kpis.totalRecords}, Primary Metric = ${analysis.kpis.primaryMetricName}`);
  console.log(`   ✓ Primary Value Total = ${analysis.kpis.totalPrimaryValue}, Avg = ${analysis.kpis.averagePrimaryValue}`);
  console.log(`   ✓ Numeric Stats: ${Object.keys(analysis.numericStats).length} numeric columns analyzed with IQR outliers`);
  console.log(`   ✓ Categorical Stats: ${Object.keys(analysis.categoricalStats).length} categorical dimensions grouped`);
  console.log(`   ✓ Correlations: ${analysis.correlations.length} numeric pairs calculated`);

  // Test 3: User Storage & Authentication (Offline & Online)
  console.log('3. Testing User Storage & Password Security...');
  const testEmail = 'verify_' + Date.now() + '@example.com';
  const createdUser = await createUser({
    name: 'Verification User',
    email: testEmail,
    password: 'SuperSecurePassword123!',
  });

  const foundUser = await findUserByEmail(testEmail, true);
  if (!foundUser) throw new Error('User retrieval failed');

  const match = await foundUser.comparePassword('SuperSecurePassword123!');
  const wrongMatch = await foundUser.comparePassword('WrongPassword');

  if (!match || wrongMatch) throw new Error('Password verification failed');
  console.log('   ✓ User created, retrieved, and password validated');

  // Test 4: Dataset Storage
  console.log('4. Testing Dataset Storage...');
  const dataset = await createDataset({
    owner: createdUser._id,
    name: 'Test Supermarket Dataset',
    originalFilename: 'supermarket.xlsx',
    sheetName: parsed.selectedSheet,
    rowCount: parsed.rowCount,
    columnCount: parsed.columns.length,
    columns: parsed.columns,
    records: parsed.records,
    analysisSummary: analysis,
  });

  const datasets = await getDatasetsByOwner(createdUser._id);
  if (datasets.length === 0) throw new Error('Dataset retrieval failed');
  console.log(`   ✓ Dataset stored and retrieved: ${datasets[0].name} (${datasets[0].rowCount} rows)`);

  console.log('\nAll Backend Verification Checks Passed Successfully! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
