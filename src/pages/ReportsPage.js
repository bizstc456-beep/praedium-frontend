import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const EXPENSE_CATEGORIES = [
  'repairs',
  'insurance',
  'taxes',
  'mortgage',
  'utilities',
  'management',
  'other',
];

function categoryLabel(value, t) {
  return EXPENSE_CATEGORIES.includes(value) ? t(`reports.categories.${value}`) : t('reports.categories.other');
}

function categoryBadgeClass(value) {
  switch (value) {
    case 'mortgage': return 'pd-cat-red';
    case 'repairs': return 'pd-cat-green';
    case 'taxes': return 'pd-cat-blue';
    case 'utilities': return 'pd-cat-purple';
    case 'insurance': return 'pd-cat-teal';
    case 'management': return 'pd-cat-amber';
    default: return 'pd-cat-gray';
  }
}

function formatMoney(cents) {
  const amount = (cents || 0) / 100;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${parts[0]},${parts[1]}$`;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

// This year / last year / this month / last month, in the user's local time.
function presetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'this_month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
    case 'last_year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31) };
    case 'this_year':
    default:
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
  }
}

const EMPTY_EXPENSE = { property_id: '', category: 'other', amount: '', expense_date: '', notes: '' };

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [preset, setPreset] = useState('this_year');
  const initialRange = presetRange('this_year');
  const [start, setStart] = useState(toISODate(initialRange.start));
  const [end, setEnd] = useState(toISODate(initialRange.end));

  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [filterProperty, setFilterProperty] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const loadAll = useCallback(async (rangeStart, rangeEnd) => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('reports.pleaseLogIn'));
        return;
      }
      const backend = process.env.REACT_APP_BACKEND_URL;
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };

      const [propsData, expensesData, reportData] = await Promise.all([
        apiRequest(`${backend}/api/properties/${session.user.id}`, { headers: authHeaders }),
        apiRequest(`${backend}/api/expenses/landlord/${session.user.id}`, { headers: authHeaders }),
        apiRequest(`${backend}/api/reports/${session.user.id}?start=${rangeStart}&end=${rangeEnd}`, { headers: authHeaders }),
      ]);

      setProperties(propsData.properties || []);
      setExpenses(expensesData.expenses || []);
      setReport(reportData);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.message || t('reports.couldNotLoad'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link from the dashboard's "Log expense" quick action (?new=1) --
  // openExpenseForm needs `properties` loaded (it defaults to the first
  // one), so this waits for loading to finish and only fires once.
  const handledNewExpenseParam = useRef(false);
  useEffect(() => {
    if (handledNewExpenseParam.current) return;
    if (loading || properties.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      handledNewExpenseParam.current = true;
      openExpenseForm();
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, properties]);

  const applyPreset = (value) => {
    setPreset(value);
    if (value === 'custom') return;
    const range = presetRange(value);
    const newStart = toISODate(range.start);
    const newEnd = toISODate(range.end);
    setStart(newStart);
    setEnd(newEnd);
    setLoading(true);
    loadAll(newStart, newEnd);
  };

  const applyCustomRange = () => {
    setLoading(true);
    loadAll(start, end);
  };

  const propertyAddress = (id) => properties.find((p) => p.id === id)?.address || t('reports.unknownProperty');

  const filteredExpenses = expenses.filter((e) => {
    if (filterProperty && e.property_id !== filterProperty) return false;
    if (filterCategory && e.category !== filterCategory) return false;
    if (filterDate && e.expense_date !== filterDate) return false;
    return true;
  });

  // ---- expense form ----

  const openExpenseForm = () => {
    setFormError('');
    setExpenseForm({ ...EMPTY_EXPENSE, property_id: properties[0]?.id || '', expense_date: toISODate(new Date()) });
    setExpenseFormOpen(true);
  };

  const closeExpenseForm = () => {
    setExpenseFormOpen(false);
    setFormError('');
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!expenseForm.property_id) {
      setFormError(t('reports.chooseProperty'));
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setFormError(t('reports.enterAmount'));
      return;
    }
    if (!expenseForm.expense_date) {
      setFormError(t('reports.chooseDate'));
      return;
    }

    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('reports.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...expenseForm,
          amount: Math.round(Number(expenseForm.amount) * 100),
        }),
      });

      closeExpenseForm();
      await loadAll(start, end);
    } catch (err) {
      setFormError(err.message || t('reports.failedToSaveExpense'));
    }
  };

  const deleteExpense = async (expense) => {
    const label = categoryLabel(expense.category, t).toLowerCase();
    if (!window.confirm(t('reports.deleteConfirm', { category: label, amount: formatMoney(expense.amount) }))) return;
    try {
      const session = await getSession();
      if (!session) {
        setError(t('reports.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await loadAll(start, end);
    } catch (err) {
      setError(err.message || t('reports.failedToDeleteExpense'));
    }
  };

  // ---- CSV export ----

  const exportCSV = () => {
    if (!report) return;
    const rows = [];
    rows.push([t('reports.csv.title'), `${start} ${t('reports.csv.to')} ${end}`]);
    rows.push([]);
    rows.push([t('reports.csv.summary')]);
    rows.push([t('reports.csv.income'), (report.summary.income / 100).toFixed(2)]);
    rows.push([t('reports.csv.expenses'), (report.summary.expenses / 100).toFixed(2)]);
    rows.push([t('reports.csv.netIncome'), (report.summary.net / 100).toFixed(2)]);
    rows.push([]);
    rows.push([t('reports.csv.byProperty'), t('reports.csv.income'), t('reports.csv.expenses'), t('reports.csv.net')]);
    report.properties.forEach((p) => {
      rows.push([p.address, (p.income / 100).toFixed(2), (p.expenses / 100).toFixed(2), (p.net / 100).toFixed(2)]);
    });
    rows.push([]);
    rows.push([t('reports.csv.byCategory'), t('reports.csv.amount')]);
    report.expenses_by_category.forEach((c) => {
      rows.push([categoryLabel(c.category, t), (c.amount / 100).toFixed(2)]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `praedium-report-${start}-to-${end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return (
      <AppShell active="reports">
        <div className="pd-state"><p>{t('reports.loadingReports')}</p></div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="reports">
        <div className="pd-state"><p>{error}</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell active="reports">
      <div className="pd-page-header pd-page-header-row">
        <div>
          <h1>{t('reports.pageTitle')}</h1>
          <p>{t('reports.pageSubtitle')}</p>
        </div>
        <button className="pd-btn pd-btn-secondary" onClick={exportCSV} disabled={!report}>{t('reports.exportCsv')}</button>
      </div>

      <div className="pd-card">
        <div className="pd-range-row">
          <div className="pd-range-presets">
            {[
              { value: 'this_month', label: t('reports.presetThisMonth') },
              { value: 'last_month', label: t('reports.presetLastMonth') },
              { value: 'this_year', label: t('reports.presetThisYear') },
              { value: 'last_year', label: t('reports.presetLastYear') },
              { value: 'custom', label: t('reports.presetCustom') },
            ].map((p) => (
              <button
                key={p.value}
                className={`pd-btn ${preset === p.value ? 'pd-btn-primary' : 'pd-btn-secondary'}`}
                onClick={() => applyPreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="pd-range-custom">
              <input aria-label={t('reports.customStartLabel')} className="pd-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <span>{t('reports.to')}</span>
              <input aria-label={t('reports.customEndLabel')} className="pd-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              <button className="pd-btn pd-btn-primary" onClick={applyCustomRange}>{t('reports.apply')}</button>
            </div>
          )}
        </div>
      </div>

      {report && (
        <>
          <div className="pd-chips">
            <div className="pd-chip"><b>{formatMoney(report.summary.income)}</b><span>{t('reports.income')}</span></div>
            <div className="pd-chip"><b>{formatMoney(report.summary.expenses)}</b><span>{t('reports.expenses')}</span></div>
            <div className="pd-chip"><b>{formatMoney(report.summary.net)}</b><span>{t('reports.netIncome')}</span></div>
          </div>

          <h2 className="pd-section-title">{t('reports.byProperty')}</h2>
          {report.properties.length === 0 ? (
            <p className="pd-empty">{t('reports.noPropertiesYet')}</p>
          ) : (
            <div className="pd-table-wrap" style={{ marginBottom: 28 }}>
              <table className="pd-table pd-table-stack">
                <thead>
                  <tr>
                    <th>{t('reports.colProperty')}</th>
                    <th>{t('reports.colIncome')}</th>
                    <th>{t('reports.colExpenses')}</th>
                    <th>{t('reports.colNet')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.properties.map((p) => (
                    <tr key={p.id}>
                      <td data-label={t('reports.colProperty')}>{p.address}</td>
                      <td data-label={t('reports.colIncome')}>{formatMoney(p.income)}</td>
                      <td data-label={t('reports.colExpenses')}>{formatMoney(p.expenses)}</td>
                      <td data-label={t('reports.colNet')}>{formatMoney(p.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.expenses_by_category.length > 0 && (
            <>
              <h2 className="pd-section-title">{t('reports.expensesByCategory')}</h2>
              <div className="pd-table-wrap" style={{ marginBottom: 28 }}>
                <table className="pd-table pd-table-stack">
                  <thead>
                    <tr>
                      <th>{t('reports.colCategory')}</th>
                      <th>{t('reports.colAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses_by_category.map((c) => (
                      <tr key={c.category}>
                        <td data-label={t('reports.colCategory')}>{categoryLabel(c.category, t)}</td>
                        <td data-label={t('reports.colAmount')}>{formatMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <div className="pd-page-header-row">
        <h2 className="pd-section-title" style={{ margin: 0 }}>{t('reports.expensesHeading')}</h2>
        <button className="pd-btn pd-btn-primary" onClick={openExpenseForm} disabled={properties.length === 0}>
          {t('reports.addExpense')}
        </button>
      </div>
      <div className="pd-filter-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select aria-label={t('reports.filterByPropertyLabel')} className="pd-select" style={{ maxWidth: 220 }} value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}>
          <option value="">{t('reports.allProperties')}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
        <select aria-label={t('reports.filterByCategoryLabel')} className="pd-select" style={{ maxWidth: 200 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">{t('reports.allCategories')}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{categoryLabel(c, t)}</option>
          ))}
        </select>
        <input aria-label={t('reports.filterByDateLabel')} type="date" className="pd-input" style={{ maxWidth: 170 }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {(filterProperty || filterCategory || filterDate) && (
          <button type="button" className="pd-btn pd-btn-secondary" onClick={() => { setFilterProperty(''); setFilterCategory(''); setFilterDate(''); }}>{t('reports.clearFilters')}</button>
        )}
      </div>
      {properties.length === 0 && <p className="pd-empty">{t('reports.addPropertyFirst')}</p>}

      {expenseFormOpen && (
        <div className="pd-card">
          <h2 className="pd-section-title">{t('reports.newExpense')}</h2>
          {formError && <div className="pd-alert">{formError}</div>}
          <form onSubmit={submitExpense}>
            <div className="pd-form-row">
              <div className="pd-field">
                <label htmlFor="expense-property">{t('reports.fieldProperty')}</label>
                <select
                  id="expense-property"
                  className="pd-select"
                  value={expenseForm.property_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, property_id: e.target.value })}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>
              <div className="pd-field">
                <label htmlFor="expense-category">{t('reports.fieldCategory')}</label>
                <select
                  id="expense-category"
                  className="pd-select"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c, t)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pd-form-row">
              <div className="pd-field">
                <label htmlFor="expense-amount">{t('reports.fieldAmount')}</label>
                <input
                  id="expense-amount"
                  className="pd-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="250.00"
                />
              </div>
              <div className="pd-field">
                <label htmlFor="expense-date">{t('reports.fieldDate')}</label>
                <input
                  id="expense-date"
                  className="pd-input"
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>
            </div>
            <div className="pd-field">
              <label htmlFor="expense-notes">{t('reports.fieldNotes')}</label>
              <input
                id="expense-notes"
                className="pd-input"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder={t('reports.notesPlaceholder')}
              />
            </div>
            <div className="pd-form-actions">
              <button type="submit" className="pd-btn pd-btn-primary">{t('reports.saveExpense')}</button>
              <button type="button" className="pd-btn pd-btn-secondary" onClick={closeExpenseForm}>{t('reports.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <p className="pd-empty">{expenses.length === 0 ? t('reports.noExpensesLogged') : t('reports.noExpensesMatchFilters')}</p>
      ) : (
        <div className="pd-table-wrap">
          <table className="pd-table pd-table-stack">
            <thead>
              <tr>
                <th>{t('reports.colDate')}</th>
                <th>{t('reports.colProperty')}</th>
                <th>{t('reports.colCategory')}</th>
                <th>{t('reports.colNotes')}</th>
                <th>{t('reports.colAmount')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id}>
                  <td data-label={t('reports.colDate')}>{e.expense_date}</td>
                  <td data-label={t('reports.colProperty')}>{propertyAddress(e.property_id)}</td>
                  <td data-label={t('reports.colCategory')}><span className={`pd-badge ${categoryBadgeClass(e.category)}`}>{categoryLabel(e.category, t)}</span></td>
                  <td data-label={t('reports.colNotes')}>{e.notes || '—'}</td>
                  <td data-label={t('reports.colAmount')}>{formatMoney(e.amount)}</td>
                  <td>
                    <button className="pd-btn pd-btn-danger" onClick={() => deleteExpense(e)}>{t('reports.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
