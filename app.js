/* ============================================================
   CASH-FLOW — app.js
   Sprint 02 | Vanilla JS | DOM Manipulation + LocalStorage
   Features: All Phase 1, 2, 3 deliverables
   ============================================================ */

'use strict';

// ─── STATE ────────────────────────────────────────────────────
let state = {
  salary: 0,
  expenses: [],        // [{ id, name, amount, date }]
  currency: 'INR',
  exchangeRate: 1      // rate relative to INR
};

// ─── CURRENCY CONFIG ─────────────────────────────────────────
const CURRENCY_SYMBOLS = { INR:'₹', USD:'$', EUR:'€', GBP:'£', JPY:'¥', AED:'د.إ' };
const CURRENCY_NAMES   = { INR:'Indian Rupee', USD:'US Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen', AED:'UAE Dirham' };

// ─── DOM REFS ─────────────────────────────────────────────────
const salaryForm          = document.getElementById('salary-form');
const salaryInput         = document.getElementById('salary-input');
const salaryError         = document.getElementById('salary-error');
const salaryPrefixSymbol  = document.getElementById('salary-prefix-symbol');
const salaryCurrencyLabel = document.getElementById('salary-currency-label');

const expenseForm         = document.getElementById('expense-form');
const expenseNameInput    = document.getElementById('expense-name-input');
const expenseAmountInput  = document.getElementById('expense-amount-input');
const expenseNameError    = document.getElementById('expense-name-error');
const expenseAmountError  = document.getElementById('expense-amount-error');
const expensePrefixSymbol = document.getElementById('expense-prefix-symbol');
const expenseCurrencyLabel= document.getElementById('expense-currency-label');

const displaySalary       = document.getElementById('display-salary');
const displayExpenses     = document.getElementById('display-expenses');
const displayBalance      = document.getElementById('display-balance');

const expenseList         = document.getElementById('expense-list');
const expenseEmptyState   = document.getElementById('expense-empty-state');
const clearExpensesBtn    = document.getElementById('clear-expenses-btn');
const resetAllBtn         = document.getElementById('reset-all-btn');
const downloadReportBtn   = document.getElementById('download-report-btn');

const currencySelect      = document.getElementById('currency-select');
const exchangeRateLabel   = document.getElementById('exchange-rate-label');

const thresholdAlert      = document.getElementById('threshold-alert');
const closeAlertBtn       = document.getElementById('close-alert-btn');
const balanceSummaryCard  = document.getElementById('balance-summary-card');

const statCount           = document.getElementById('stat-count');
const statAvg             = document.getElementById('stat-avg');
const statMax             = document.getElementById('stat-max');
const statRate            = document.getElementById('stat-rate');

const toast               = document.getElementById('toast');
const chartEmpty          = document.getElementById('chart-empty-state');

let expenseChart = null;
let toastTimer   = null;

// ─── LOCALSTORAGE ─────────────────────────────────────────────
const LS_KEY = 'cashflow_state_v1';

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    salary: state.salary,
    expenses: state.expenses,
    currency: state.currency
  }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.salary === 'number') state.salary = saved.salary;
    if (Array.isArray(saved.expenses)) state.expenses = saved.expenses;
    if (saved.currency) state.currency = saved.currency;
  } catch(e) {
    console.warn('CashFlow: failed to load state', e);
  }
}

// ─── FORMAT HELPERS ───────────────────────────────────────────
function sym() { return CURRENCY_SYMBOLS[state.currency] || '₹'; }

function fmtAmount(inrValue) {
  const converted = inrValue * state.exchangeRate;
  const fractions = state.currency === 'JPY' ? 0 : 2;
  const numStr = converted.toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: fractions
  }).replace(/[^0-9.,]/g, '');
  return sym() + numStr;
}

function pdfAmt(amt) {
  return fmtAmount(amt).replace('₹', 'Rs. ');
}

function nowDateStr() {
  return new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

// ─── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(message, type='success', duration=3000) {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, duration);
}

// ─── VALIDATION ───────────────────────────────────────────────
function setError(el, msg) { el.textContent = msg; }
function clearError(el)    { el.textContent = ''; }

function validateSalary() {
  const val = parseFloat(salaryInput.value);
  if (salaryInput.value === '' || isNaN(val)) { setError(salaryError, '⚠ Please enter a salary amount.'); return false; }
  if (val <= 0) { setError(salaryError, '⚠ Salary must be greater than 0.'); return false; }
  clearError(salaryError); return true;
}

function validateExpense() {
  let ok = true;
  const name = expenseNameInput.value.trim();
  const amt  = parseFloat(expenseAmountInput.value);
  if (!name) { setError(expenseNameError, '⚠ Expense name cannot be empty.'); ok = false; }
  else clearError(expenseNameError);
  if (expenseAmountInput.value === '' || isNaN(amt)) { setError(expenseAmountError, '⚠ Please enter an amount.'); ok = false; }
  else if (amt <= 0) { setError(expenseAmountError, '⚠ Amount must be greater than 0.'); ok = false; }
  else clearError(expenseAmountError);
  return ok;
}

// ─── COMPUTE TOTALS ───────────────────────────────────────────
function totalExpenses() { return state.expenses.reduce((s, e) => s + e.amount, 0); }
function balance()       { return state.salary - totalExpenses(); }

// ─── RENDER SUMMARY ───────────────────────────────────────────
function renderSummary() {
  displaySalary.textContent   = fmtAmount(state.salary);
  displayExpenses.textContent = fmtAmount(totalExpenses());
  const bal = balance();
  displayBalance.textContent  = fmtAmount(bal);

  // Update quick stats
  const n = state.expenses.length;
  statCount.textContent = n;
  statAvg.textContent   = n ? fmtAmount(totalExpenses() / n) : sym() + '0';
  statMax.textContent   = n ? fmtAmount(Math.max(...state.expenses.map(e => e.amount))) : sym() + '0';
  const rate = state.salary > 0 ? Math.max(0, (bal / state.salary) * 100) : 0;
  statRate.textContent  = rate.toFixed(1) + '%';

  checkThreshold(bal);
  renderChart();
}

// ─── THRESHOLD ALERT ─────────────────────────────────────────
function checkThreshold(bal) {
  const threshold = state.salary * 0.10;
  if (state.salary > 0 && bal < threshold) {
    thresholdAlert.classList.remove('hidden');
    balanceSummaryCard.classList.add('balance-critical');
    displayBalance.style.color = '#dc3545';
  } else {
    thresholdAlert.classList.add('hidden');
    balanceSummaryCard.classList.remove('balance-critical');
    displayBalance.style.color = '';
  }
}

closeAlertBtn.addEventListener('click', () => thresholdAlert.classList.add('hidden'));

// ─── RENDER EXPENSE LIST ──────────────────────────────────────
function renderExpenseList() {
  expenseList.innerHTML = '';
  if (state.expenses.length === 0) {
    expenseEmptyState.classList.remove('hidden');
    return;
  }
  expenseEmptyState.classList.add('hidden');
  state.expenses.forEach((exp, idx) => {
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.dataset.id = exp.id;
    li.innerHTML = `
      <div class="expense-number">${idx + 1}</div>
      <div class="expense-info">
        <div class="expense-name">${escapeHtml(exp.name)}</div>
        <div class="expense-date">${exp.date}</div>
      </div>
      <div class="expense-amount">${fmtAmount(exp.amount)}</div>
      <button class="expense-delete" data-id="${exp.id}" aria-label="Delete expense ${escapeHtml(exp.name)}" title="Delete">
        X
      </button>
    `;
    expenseList.appendChild(li);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

// ─── CHART ───────────────────────────────────────────────────
function renderChart() {
  const ctx = document.getElementById('expense-chart').getContext('2d');
  const tot = totalExpenses();
  const bal = balance();
  const hasData = state.salary > 0 && (tot > 0 || bal > 0);

  if (!hasData) {
    chartEmpty.classList.remove('hidden');
    if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
    return;
  }
  chartEmpty.classList.add('hidden');

  const data = {
    labels: ['Remaining Balance', 'Total Expenses'],
    datasets: [{
      data: [Math.max(0, bal), tot],
      backgroundColor: ['#0066cc', '#dc3545'],
      borderColor: ['#005bb5', '#c82333'],
      borderWidth: 2,
      hoverOffset: 8,
      hoverBorderWidth: 3,
    }]
  };

  if (expenseChart) { expenseChart.destroy(); }
  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${fmtAmount(ctx.raw)}`
          },
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: '#cccccc',
          padding: 12,
          cornerRadius: 10
        }
      },
      animation: { animateRotate: true, duration: 600 }
    }
  });
}

// ─── SALARY FORM ─────────────────────────────────────────────
salaryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateSalary()) return;
  const newSalary = parseFloat(salaryInput.value);
  state.salary = newSalary;
  saveState();
  renderExpenseList();
  renderSummary();
  salaryInput.value = '';
  showToast(`✅ Salary set to ${fmtAmount(newSalary)}`);
});

// ─── EXPENSE FORM ────────────────────────────────────────────
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateExpense()) return;
  const name   = expenseNameInput.value.trim();
  const amount = parseFloat(expenseAmountInput.value);
  const expense = { id: Date.now() + Math.random(), name, amount, date: nowDateStr() };
  state.expenses.push(expense);
  saveState();
  renderExpenseList();
  renderSummary();
  expenseNameInput.value = '';
  expenseAmountInput.value = '';
  expenseNameInput.focus();
  showToast(`✅ Expense "${name}" added`);
});

// ─── DELETE EXPENSE (event delegation) ───────────────────────
expenseList.addEventListener('click', (e) => {
  const btn = e.target.closest('.expense-delete');
  if (!btn) return;
  const id = parseFloat(btn.dataset.id);
  const item = btn.closest('.expense-item');
  item.classList.add('removing');
  setTimeout(() => {
    state.expenses = state.expenses.filter(ex => ex.id !== id);
    saveState();
    renderExpenseList();
    renderSummary();
    showToast('🗑️ Expense deleted', 'warning');
  }, 300);
});

// ─── CLEAR ALL EXPENSES ───────────────────────────────────────
clearExpensesBtn.addEventListener('click', () => {
  if (state.expenses.length === 0) return;
  if (!confirm('Clear all expenses? This cannot be undone.')) return;
  state.expenses = [];
  saveState();
  renderExpenseList();
  renderSummary();
  showToast('🗑️ All expenses cleared', 'warning');
});

// ─── RESET ALL ────────────────────────────────────────────────
resetAllBtn.addEventListener('click', () => {
  if (!confirm('Reset everything? Salary and all expenses will be cleared.')) return;
  state = { salary: 0, expenses: [], currency: 'INR', exchangeRate: 1 };
  localStorage.removeItem(LS_KEY);
  currencySelect.value = 'INR';
  exchangeRateLabel.textContent = 'Base: INR';
  updateCurrencyUI();
  renderExpenseList();
  renderSummary();
  showToast('🔄 All data reset', 'warning');
});

// ─── CURRENCY CONVERTER (Frankfurter API) ─────────────────────
currencySelect.addEventListener('change', async () => {
  const selected = currencySelect.value;
  state.currency = selected;
  exchangeRateLabel.textContent = 'Fetching…';

  if (selected === 'INR') {
    state.exchangeRate = 1;
    exchangeRateLabel.textContent = 'Base: INR';
    updateCurrencyUI();
    renderExpenseList();
    renderSummary();
    saveState();
    return;
  }

  try {
    const res  = await fetch(`https://api.frankfurter.app/latest?from=INR&to=${selected}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    state.exchangeRate = data.rates[selected];
    exchangeRateLabel.textContent = `1 INR = ${state.exchangeRate.toFixed(4)} ${selected}`;
  } catch (err) {
    showToast('⚠ Currency API unavailable. Using fallback rates.', 'warning');
    const fallbacks = { USD:0.012, EUR:0.011, GBP:0.0094, JPY:1.78, AED:0.044 };
    state.exchangeRate = fallbacks[selected] || 1;
    exchangeRateLabel.textContent = `~1 INR ≈ ${state.exchangeRate.toFixed(4)} ${selected} (offline)`;
  }

  updateCurrencyUI();
  renderExpenseList();
  renderSummary();
  saveState();
});

function updateCurrencyUI() {
  const s = sym();
  salaryPrefixSymbol.textContent  = s;
  expensePrefixSymbol.textContent = s;
  salaryCurrencyLabel.textContent = `(${state.currency})`;
  expenseCurrencyLabel.textContent= `(${state.currency})`;
}

// ─── PDF REPORT ───────────────────────────────────────────────
downloadReportBtn.addEventListener('click', generatePDF);

function generatePDF() {
  if (state.salary === 0 && state.expenses.length === 0) {
    showToast('⚠ Nothing to export. Add data first.', 'error'); return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(10, 13, 20);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFontSize(24);
  doc.setTextColor(0, 212, 170);
  doc.setFont('helvetica', 'bold');
  doc.text('CashFlow', 15, 22);
  doc.setFontSize(10);
  doc.setTextColor(136, 145, 165);
  doc.setFont('helvetica', 'normal');
  doc.text('Salary & Expense Report', 15, 30);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 15, 36);

  // Summary section
  doc.setFillColor(20, 25, 38);
  doc.rect(0, 42, 210, 36, 'F');

  const totExp = totalExpenses();
  const bal    = balance();
  const items = [
    { label: `Monthly Salary (${state.currency})`, value: pdfAmt(state.salary), color: [0,212,170] },
    { label: `Total Expenses (${state.currency})`, value: pdfAmt(totExp),        color: [255,107,107] },
    { label: `Remaining Balance (${state.currency})`, value: pdfAmt(bal),        color: bal < 0 ? [255,107,107] : [124,106,245] }
  ];

  items.forEach((item, i) => {
    const x = 15 + i * 65;
    doc.setFontSize(8); doc.setTextColor(90,98,117);
    doc.text(item.label, x, 53);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, x, 63);
    doc.setFont('helvetica', 'normal');
  });

  // Savings Rate
  const rate = state.salary > 0 ? ((bal / state.salary) * 100).toFixed(1) : 0;
  doc.setFontSize(9); doc.setTextColor(136,145,165);
  doc.text(`Savings Rate: ${rate}%   |   No. of Expenses: ${state.expenses.length}`, 15, 73);

  // Expense Table
  if (state.expenses.length > 0) {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(232,234,240);
    doc.text('Expense Breakdown', 15, 88);

    const tableData = state.expenses.map((exp, i) => [
      i + 1, exp.name, exp.date, pdfAmt(exp.amount)
    ]);

    doc.autoTable({
      startY: 92,
      head: [['#', 'Expense Name', 'Date', 'Amount']],
      body: tableData,
      foot: [['', 'TOTAL', '', pdfAmt(totExp)]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [200,205,215], fillColor: [15,20,32], cellPadding: 5 },
      headStyles: { fillColor: [20,25,38], textColor: [0,212,170], fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [20,25,38], textColor: [255,107,107], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [18,23,36] },
      columnStyles: { 0: {cellWidth:12}, 2: {cellWidth:35}, 3: {halign:'right'} },
      margin: { left: 15, right: 15 }
    });
  }

  // Warning note if balance critical
  if (state.salary > 0 && bal < state.salary * 0.10) {
    const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 100;
    doc.setFillColor(127,29,29);
    doc.roundedRect(15, y, 180, 14, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.setTextColor(252,165,165);
    doc.text('⚠ WARNING: Balance below 10% of salary. Immediate review recommended.', 20, y+9);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(90,98,117);
  doc.text('Generated by CashFlow — Sprint 02 | Vanilla JS Project', 15, pageHeight - 10);

  doc.save(`CashFlow_Report_${Date.now()}.pdf`);
  showToast('📄 PDF report downloaded!');
}

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  loadState();
  if (state.currency && state.currency !== 'INR') {
    currencySelect.value = state.currency;
  }
  updateCurrencyUI();
  renderExpenseList();
  renderSummary();
}

init();
