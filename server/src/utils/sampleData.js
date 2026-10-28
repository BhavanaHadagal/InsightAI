const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const generateSampleExcel = (outputPath) => {
  const branches = [
    { branch: 'A', city: 'Yangon' },
    { branch: 'B', city: 'Mandalay' },
    { branch: 'C', city: 'Naypyitaw' },
  ];

  const productLines = [
    'Health and beauty',
    'Electronic accessories',
    'Home and lifestyle',
    'Sports and travel',
    'Food and beverages',
    'Fashion accessories',
  ];

  const customerTypes = ['Member', 'Normal'];
  const genders = ['Female', 'Male'];
  const paymentMethods = ['Ewallet', 'Cash', 'Credit card'];

  const rows = [];
  const baseDate = new Date(2026, 0, 1);

  for (let i = 1; i <= 150; i++) {
    const b = branches[i % branches.length];
    const product = productLines[i % productLines.length];
    const customerType = customerTypes[i % customerTypes.length];
    const gender = genders[(i * 3) % genders.length];
    const payment = paymentMethods[(i * 2) % paymentMethods.length];

    const unitPrice = Math.round((10 + (i * 7.3) % 90) * 100) / 100;
    const quantity = (i % 10) + 1;
    const cogs = Math.round(unitPrice * quantity * 100) / 100;
    const tax = Math.round(cogs * 0.05 * 100) / 100;
    const total = Math.round((cogs + tax) * 100) / 100;
    const grossIncome = tax;
    const grossMarginPct = 4.7619;
    const rating = Math.round((4 + (i * 0.4) % 6) * 10) / 10;

    const txDate = new Date(baseDate.getTime() + (i * 1.5 * 24 * 60 * 60 * 1000));
    const dateStr = txDate.toISOString().split('T')[0];
    const hour = 10 + (i % 11);
    const minute = (i * 7) % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    rows.push({
      'Invoice ID': `INV-${1000 + i}`,
      'Branch': b.branch,
      'City': b.city,
      'Customer Type': customerType,
      'Gender': gender,
      'Product Line': product,
      'Unit Price': unitPrice,
      'Quantity': quantity,
      'Tax 5%': tax,
      'Total': total,
      'Date': dateStr,
      'Time': timeStr,
      'Payment': payment,
      'cogs': cogs,
      'Gross Margin %': grossMarginPct,
      'Gross Income': grossIncome,
      'Rating': rating,
    });
  }

  // Create workbook with two sheets
  const wb = XLSX.utils.book_new();
  const wsSales = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Transactions');

  // Sheet 2: Category meta
  const metaRows = productLines.map((pl, idx) => ({
    'Product Line': pl,
    'Target Monthly Budget': 15000 + idx * 5000,
    'Manager': `Lead_${idx + 1}`,
    'Status': 'Active',
  }));
  const wsMeta = XLSX.utils.json_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Departments');

  const targetPath = outputPath || path.resolve(__dirname, '../../../sample-data/supermarket_sales_ai_analyzer.xlsx');
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  XLSX.writeFile(wb, targetPath);
  console.log(`Sample Excel generated at ${targetPath}`);
  return targetPath;
};

module.exports = { generateSampleExcel };

