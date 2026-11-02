import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const CATEGORY_KEYS = {
  repairs: 'categoryRepairs',
  insurance: 'categoryInsurance',
  taxes: 'categoryTaxes',
  mortgage: 'categoryMortgage',
  utilities: 'categoryUtilities',
  management: 'categoryManagement',
  other: 'categoryOther',
};

function categoryLabel(value, t) {
  return t(`insights.${CATEGORY_KEYS[value] || 'categoryOther'}`);
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

function categoryColor(value) {
  switch (value) {
    case 'mortgage': return '#c23c54';
    case 'repairs': return '#2f8f52';
    case 'taxes': return '#2f66c2';
    case 'utilities': return '#7b3fc4';
    case 'insurance': return '#1f8f82';
    case 'management': return '#b4780f';
    default: return '#6b6354';
  }
}

function formatMoney(cents) {
  const dollars = Math.round((cents || 0) / 100);
  const sign = dollars < 0 ? '-' : '';
  const formatted = Math.abs(dollars).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${formatted}$`;
}

function formatCompact(dollars) {
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(dollars)}`;
}

// Picks a "nice" gridline step (1/2/5 x 10^n) so the $ axis reads cleanly
// regardless of portfolio size, instead of a hardcoded increment.
function niceTicks(maxValue, targetCount = 6) {
  if (!maxValue || maxValue <= 0) return { max: 100, ticks: [25, 50, 75, 100] };
  const roughStep = maxValue / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / magnitude;
  let step;
  if (norm <= 1) step = 1 * magnitude;
  else if (norm <= 2) step = 2 * magnitude;
  else if (norm <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;
  const max = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = step; v <= max + 0.0001; v += step) ticks.push(Math.round(v));
  return { max, ticks };
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Chart geometry (a 640x214 viewBox, same proportions across screen sizes).
const VIEW_W = 640;
const BASELINE_Y = 190;
const PLOT_TOP_Y = 8;
const PLOT_H = BASELINE_Y - PLOT_TOP_Y;
const LEFT_PAD = 38;
const RIGHT_PAD = 20;
const BAR_W = 20;

export default function InsightsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [cashFlow, setCashFlow] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [rangeMonths, setRangeMonths] = useState(6);

  const loadInsights = useCallback(async (months) => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('insights.pleaseLogInAgain'));
        setLoading(false);
        return;
      }
      const backend = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${backend}/api/insights/${session.user.id}?months=${months}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('insights.loadFailed'));

      setSummary(data.summary);
      setCashFlow(data.cash_flow || []);
      setExpensesByCategory(data.expenses_by_category || []);
      setProperties(data.properties || []);
    } catch (err) {
      setError(err.message || t('insights.loadFailed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInsights(rangeMonths);
  }, [loadInsights, rangeMonths]);

  if (loading) {
    return (
      <AppShell active="insights" wide>
        <div className="pd-ins-loading">{t('insights.loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="insights" wide>
        <div className="pd-ins-loading">{error}</div>
      </AppShell>
    );
  }

  if (!properties.length) {
    return (
      <AppShell active="insights" wide>
        <div className="pd-ins-empty">
          <div className="pd-ins-empty-title">{t('insights.emptyTitle')}</div>
          <div className="pd-ins-empty-sub">{t('insights.emptySub')}</div>
          <Link to="/properties?new=1" className="pd-btn pd-btn-primary pd-ins-empty-cta">{t('insights.emptyCta')}</Link>
        </div>
      </AppShell>
    );
  }

  // ---- Chart geometry, computed from real data ----
  const maxDollar = Math.max(
    1,
    ...cashFlow.map((m) => (m.income || 0) / 100),
    ...cashFlow.map((m) => (m.expenses || 0) / 100)
  );
  const { max: chartMax, ticks } = niceTicks(maxDollar);
  const bandW = cashFlow.length ? (VIEW_W - LEFT_PAD - RIGHT_PAD) / cashFlow.length : 0;

  const barGroups = cashFlow.map((m, i) => {
    const center = LEFT_PAD + bandW / 2 + bandW * i;
    const incomeDollars = (m.income || 0) / 100;
    const expenseDollars = (m.expenses || 0) / 100;
    const incomeH = chartMax > 0 ? (incomeDollars / chartMax) * PLOT_H : 0;
    const expenseH = chartMax > 0 ? (expenseDollars / chartMax) * PLOT_H : 0;
    return {
      ...m,
      center,
      incomeX: center - BAR_W - 2,
      expenseX: center + 2,
      incomeY: BASELINE_Y - incomeH,
      incomeH,
      expenseY: BASELINE_Y - expenseH,
      expenseH,
    };
  });

  const activeIdx = hoveredIdx;
  const activeMonth = hoveredIdx !== null ? barGroups[hoveredIdx] : null;

  // ---- Rail data ----
  const maxCategoryAmount = Math.max(1, ...expensesByCategory.map((c) => c.amount || 0));
  const sortedCategories = [...expensesByCategory].sort((a, b) => (b.amount || 0) - (a.amount || 0));

  const sortedProperties = [...properties].sort((a, b) => (b.income || 0) - (a.income || 0));
  const vacantProperties = properties.filter((p) => p.vacant > 0);
  const fullyOccupied = properties.filter((p) => p.vacant === 0 && p.occupied > 0);
  const topPerformer = (fullyOccupied.length ? fullyOccupied : sortedProperties)
    .slice()
    .sort((a, b) => (b.income || 0) - (a.income || 0))[0];

  const netChangeLabel = summary.net_change_pct === null
    ? null
    : t('insights.vsLastMonth', {
        arrow: summary.net_change_pct >= 0 ? '▲' : '▼',
        pct: Math.abs(summary.net_change_pct),
      });

  return (
    <AppShell active="insights" wide>
      <div className="pd-ins">
        <div className="pd-ins-header">
          <div>
            <div className="pd-ins-eyebrow">{t('insights.eyebrow')}</div>
            <div className="pd-ins-title">{t('insights.title')}</div>
            <div className="pd-ins-sub">{t('insights.subtitle', { count: properties.length })}</div>
          </div>
        </div>

        <div className="pd-ins-grid">
          {/* LEFT */}
          <div className="pd-ins-main">

            <div className="pd-ins-kpis">
              <div className="pd-card pd-ins-kpi">
                <div className="pd-ins-kpi-label">{t('insights.netCashFlowLabel')}</div>
                <div className="pd-ins-kpi-value">{formatMoney(summary.net_cash_flow)}</div>
                {netChangeLabel && (
                  <div className={`pd-ins-kpi-delta ${summary.net_change_pct >= 0 ? 'good' : 'warn'}`}>{netChangeLabel}</div>
                )}
              </div>
              <div className="pd-card pd-ins-kpi">
                <div className="pd-ins-kpi-label">{t('insights.portfolioOccupancy')}</div>
                <div className="pd-ins-kpi-value">{summary.occupancy_pct}%</div>
                <div className="pd-ins-meter"><span style={{ width: `${summary.occupancy_pct}%` }} /></div>
                <div className="pd-ins-kpi-note">{t('insights.unitsOfUnits', { occupied: summary.occupancy_occupied, total: summary.occupancy_units })}</div>
              </div>
              <div className="pd-card pd-ins-kpi">
                <div className="pd-ins-kpi-label">{t('insights.estVacancyLoss')}</div>
                <div className="pd-ins-kpi-value warn">{formatMoney(summary.vacancy_loss)}<span className="pd-ins-kpi-unit">{t('insights.perMonth')}</span></div>
                <div className="pd-ins-kpi-note">{t('insights.vacantUnitsCount', { count: summary.occupancy_units - summary.occupancy_occupied })}</div>
              </div>
              <div className="pd-card pd-ins-kpi">
                <div className="pd-ins-kpi-label">{t('insights.avgRentPerUnit')}</div>
                <div className="pd-ins-kpi-value">{formatMoney(summary.avg_rent_per_unit)}</div>
                <div className="pd-ins-kpi-note">{t('insights.acrossLeases', { count: summary.occupancy_occupied })}</div>
              </div>
            </div>

            <div className="pd-card pd-ins-chart-card">
              <div className="pd-ins-chart-head">
                <div className="pd-ins-chart-title">{t('insights.cashFlowTitle')}</div>
                <div className="pd-ins-chart-controls">
                  <div className="pd-ins-range-toggle">
                    {[3, 6, 12].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`pd-ins-range-btn${rangeMonths === n ? ' active' : ''}`}
                        onClick={() => setRangeMonths(n)}
                      >
                        {t('insights.monthsAbbrev', { n })}
                      </button>
                    ))}
                  </div>
                  <div className="pd-ins-legend">
                    <span className="pd-ins-legend-item"><span className="pd-ins-swatch income" />{t('insights.legendIncome')}</span>
                    <span className="pd-ins-legend-item"><span className="pd-ins-swatch expense" />{t('insights.legendExpenses')}</span>
                  </div>
                </div>
              </div>

              <svg viewBox={`0 0 ${VIEW_W} 214`} className="pd-ins-svg">
                {ticks.map((tick) => {
                  const y = BASELINE_Y - (tick / chartMax) * PLOT_H;
                  return (
                    <g key={tick}>
                      <line x1={LEFT_PAD} y1={y} x2={VIEW_W - RIGHT_PAD} y2={y} className="pd-ins-gridline" />
                      <text x={LEFT_PAD - 6} y={y + 3} textAnchor="end" className="pd-ins-axis-label">{formatCompact(tick)}</text>
                    </g>
                  );
                })}

                <line x1={LEFT_PAD} y1={BASELINE_Y} x2={VIEW_W - RIGHT_PAD} y2={BASELINE_Y} className="pd-ins-baseline" />

                {barGroups.map((g, i) => (
                  <g key={g.month}>
                    <rect
                      x={LEFT_PAD + bandW * i}
                      y={PLOT_TOP_Y}
                      width={bandW}
                      height={BASELINE_Y - PLOT_TOP_Y}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    {i === activeIdx && (
                      <line x1={g.center} y1={PLOT_TOP_Y} x2={g.center} y2={BASELINE_Y} className="pd-ins-hover-guide" />
                    )}
                    <rect x={g.incomeX} y={g.incomeY} width={BAR_W} height={g.incomeH} rx="3" className="pd-ins-bar income" />
                    <rect x={g.expenseX} y={g.expenseY} width={BAR_W} height={g.expenseH} rx="3" className="pd-ins-bar expense" />
                    <text
                      x={g.center}
                      y={204}
                      textAnchor="middle"
                      className={i === barGroups.length - 1 ? 'pd-ins-month-label current' : 'pd-ins-month-label'}
                    >
                      {g.label}
                    </text>
                  </g>
                ))}
              </svg>

              {activeMonth && (
                <div
                  className="pd-ins-tooltip"
                  style={{ left: `${(activeMonth.center / VIEW_W) * 100}%` }}
                >
                  <div className="pd-ins-tooltip-title">{activeMonth.label} 2026</div>
                  <div className="pd-ins-tooltip-row income">{t('insights.tooltipIncome')} <b>{formatMoney(activeMonth.income)}</b></div>
                  <div className="pd-ins-tooltip-row expense">{t('insights.tooltipExpenses')} <b>{formatMoney(activeMonth.expenses)}</b></div>
                  <div className="pd-ins-tooltip-row">{t('insights.tooltipNet')} <b>{formatMoney(activeMonth.net)}</b></div>
                </div>
              )}
            </div>

            <div className="pd-card pd-ins-table-card">
              <div className="pd-ins-chart-title">{t('insights.propertyPerformanceTitle')}</div>
              <div className="pd-ins-table-head">
                <span>{t('insights.tableHeadProperty')}</span><span>{t('insights.tableHeadOccupancy')}</span><span className="pd-ins-num">{t('insights.tableHeadIncomePerMonth')}</span><span className="pd-ins-num">{t('insights.tableHeadStatus')}</span>
              </div>
              {sortedProperties.map((p) => {
                const pct = p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0;
                return (
                  <div className="pd-ins-table-row" key={p.id}>
                    <span className="pd-ins-prop-name">{p.address}</span>
                    <span className="pd-ins-occ-cell">
                      <span className="pd-ins-meter small"><span style={{ width: `${pct}%` }} /></span>
                      <span className="pd-ins-occ-frac">{p.occupied}/{p.units}</span>
                    </span>
                    <span className="pd-ins-num pd-ins-income-cell">{formatMoney(p.income)}</span>
                    <span className={`pd-ins-num pd-ins-status ${p.vacant === 0 ? 'good' : 'warn'}`}>
                      {p.vacant === 0 ? t('insights.statusFull') : t('insights.vacantCount', { count: p.vacant })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RAIL */}
          <div className="pd-ins-rail">
            {topPerformer && (
              <div className="pd-card pd-ins-top-performer">
                <div className="pd-ins-rail-label">{t('insights.topPerformerLabel')}</div>
                <div className="pd-ins-top-name">{topPerformer.address}</div>
                <div className="pd-ins-top-row">
                  <span className={`pd-ins-badge ${topPerformer.vacant === 0 ? 'good' : 'warn'}`}>
                    {topPerformer.vacant === 0 ? t('insights.fullyOccupied') : t('insights.vacantCount', { count: topPerformer.vacant })}
                  </span>
                  <span className="pd-ins-top-income">{formatMoney(topPerformer.income)}{t('insights.perMonth')}</span>
                </div>
              </div>
            )}

            <div className="pd-card pd-ins-rail-card">
              <div className="pd-ins-rail-head">
                <div className="pd-ins-rail-title">{t('insights.expensesByCategoryTitle')}</div>
                <span className="pd-ins-rail-tag">{t('insights.sixMonths')}</span>
              </div>
              {sortedCategories.length === 0 && <div className="pd-rail-empty">{t('insights.noExpensesLogged')}</div>}
              {sortedCategories.map((c) => (
                <div className="pd-ins-cat-row" key={c.category}>
                  <div className="pd-ins-cat-top">
                    <span className={`pd-badge ${categoryBadgeClass(c.category)}`}>{categoryLabel(c.category, t)}</span>
                    <span className="pd-ins-cat-amount">{formatMoney(c.amount)}</span>
                  </div>
                  <div className="pd-ins-meter"><span style={{ width: `${Math.max(4, ((c.amount || 0) / maxCategoryAmount) * 100)}%`, background: categoryColor(c.category) }} /></div>
                </div>
              ))}
            </div>

            <div className="pd-card pd-ins-rail-card">
              <div className="pd-ins-rail-head">
                <div className="pd-ins-rail-title">{t('insights.vacantUnitsTitle')}</div>
                <span className="pd-ins-rail-tag warn">{t('insights.openCount', { count: summary.occupancy_units - summary.occupancy_occupied })}</span>
              </div>
              {vacantProperties.length === 0 && <div className="pd-rail-empty">{t('insights.noVacanciesRightNow')}</div>}
              {vacantProperties.map((p) => (
                <div className="pd-ins-vacancy-row" key={p.id}>
                  <span className="pd-ins-dot" />
                  <div className="pd-ins-vacancy-text">
                    <div className="pd-ins-vacancy-name">{p.address}</div>
                    <div className="pd-ins-vacancy-sub">{t('insights.vacancySub', { count: p.vacant, amount: formatMoney(p.vacancy_loss) })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
