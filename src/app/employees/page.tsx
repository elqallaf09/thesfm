'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, FileDown, FileText, Grid2X2, Loader2, Plus, Search, Table2, Trash2, UsersRound } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TEXT, EMPLOYEE_STATUS_OPTIONS, businessRoleLabel, employeeStatusLabel, normalizeBusinessLang, numericValue, type EmployeeStatus } from '@/lib/businessOperations';
import { daysBetweenCalendar, downloadCsv, downloadXlsx, employeeExportColumns, nextPayrollDate, printPdf } from '@/lib/businessReports';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';

type EmployeeRow = {
  id: string;
  user_id: string;
  employee_name: string;
  role: string | null;
  department: string | null;
  salary: number | string | null;
  bonus: number | string | null;
  status: EmployeeStatus | string | null;
  join_date: string | null;
  payroll_due_day: number | string | null;
  notes: string | null;
};

type EmployeeForm = {
  employee_name: string;
  role: string;
  department: string;
  salary: string;
  bonus: string;
  status: EmployeeStatus;
  join_date: string;
  payroll_due_day: string;
  notes: string;
};

function createEmptyEmployeeForm(): EmployeeForm {
  return {
    employee_name: '',
    role: '',
    department: '',
    salary: '',
    bonus: '',
    status: 'active',
    join_date: '',
    payroll_due_day: '25',
    notes: '',
  };
}

export default function EmployeesPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeBusinessLang(lang);
  const text = BUSINESS_TEXT[locale];
  const { role, loading: roleLoading, permissions } = useBusinessRole(user?.id);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmployeeStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<EmployeeForm>(() => createEmptyEmployeeForm());
  const [formError, setFormError] = useState('');

  const syncPayrollNotifications = useCallback(async (employeeRows: EmployeeRow[]) => {
    if (!user) return;
    const activeRows = employeeRows.filter((row) => row.status === 'active' || !row.status);
    const dueDays = Array.from(new Set(activeRows.map((row) => Number(row.payroll_due_day ?? 25)).filter((day) => day >= 1 && day <= 31)));
    if (!dueDays.length) return;
    const db = supabase as any;
    const todayDate = new Date();
    for (const day of dueDays) {
      const dueDate = nextPayrollDate(day, todayDate);
      const daysUntil = daysBetweenCalendar(todayDate, dueDate);
      if (![7, 3, 0].includes(daysUntil)) continue;
      const dueDateKey = dueDate.toISOString().slice(0, 10);
      const existing = await db
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_module', 'business_payroll')
        .eq('type', 'payroll_due')
        .eq('due_date', dueDateKey)
        .limit(1);
      if (!existing.error && (existing.data ?? []).length > 0) continue;
      const message = daysUntil === 7 ? text.payrollReminder7 : daysUntil === 3 ? text.payrollReminder3 : text.payrollReminderToday;
      await db.from('notifications').insert({
        user_id: user.id,
        type: 'payroll_due',
        title: text.payrollDue,
        message,
        read: false,
        link: '/employees',
        action_url: '/employees',
        severity: daysUntil === 0 ? 'warning' : 'info',
        status: 'unread',
        source_module: 'business_payroll',
        due_date: dueDateKey,
        metadata: { payroll_due_day: day, days_until: daysUntil },
      });
    }
  }, [text.payrollDue, text.payrollReminder3, text.payrollReminder7, text.payrollReminderToday, user]);

  const loadEmployees = useCallback(async () => {
    if (!user || !permissions.canViewEmployees) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const db = supabase as any;
    const [profileResult, employeesResult] = await Promise.all([
      db.from('profiles').select('default_currency').eq('id', user.id).maybeSingle(),
      db.from('business_employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (!profileResult.error && profileResult.data?.default_currency) {
      setDefaultCurrency(profileResult.data.default_currency);
    }

    if (employeesResult.error) {
      setError(text.loadError);
      setRows([]);
    } else {
      const loadedRows = (employeesResult.data ?? []) as EmployeeRow[];
      setRows(loadedRows);
      void syncPayrollNotifications(loadedRows);
    }
    setLoading(false);
  }, [permissions.canViewEmployees, syncPayrollNotifications, text.loadError, user]);

  useEffect(() => {
    if (!authLoading && !roleLoading) void loadEmployees();
  }, [authLoading, loadEmployees, roleLoading]);

  const departments = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.department?.trim()).filter((value): value is string => Boolean(value)))).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || row.department === departmentFilter;
      if (!matchesStatus || !matchesDepartment) return false;
      if (!needle) return true;
      return [row.employee_name, row.role, row.department, row.notes]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [departmentFilter, query, rows, statusFilter]);

  const summary = useMemo(() => {
    const activeRows = rows.filter((row) => row.status === 'active' || !row.status);
    const payroll = activeRows.reduce((total, row) => total + numericValue(row.salary), 0);
    const allowances = activeRows.reduce((total, row) => total + numericValue(row.bonus), 0);
    const salaryTotal = rows.reduce((total, row) => total + numericValue(row.salary), 0);
    const nearestDate = activeRows
      .map((row) => nextPayrollDate(Number(row.payroll_due_day ?? 25)))
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    return {
      payroll,
      allowances,
      monthlyCost: payroll + allowances,
      total: rows.length,
      active: activeRows.length,
      averageSalary: rows.length ? salaryTotal / rows.length : 0,
      nearestDate,
    };
  }, [rows]);

  function openCreate() {
    setEditing(null);
    setForm(createEmptyEmployeeForm());
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(row: EmployeeRow) {
    setEditing(row);
    setForm({
      employee_name: row.employee_name ?? '',
      role: row.role ?? '',
      department: row.department ?? '',
      salary: String(row.salary ?? ''),
      bonus: String(row.bonus ?? ''),
      status: EMPLOYEE_STATUS_OPTIONS.includes(row.status as EmployeeStatus) ? row.status as EmployeeStatus : 'active',
      join_date: row.join_date ?? '',
      payroll_due_day: String(row.payroll_due_day ?? 25),
      notes: row.notes ?? '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setForm(createEmptyEmployeeForm());
    setFormError('');
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !permissions.canWriteEmployees) return;
    const salary = numericValue(form.salary);
    const bonus = numericValue(form.bonus);
    if (!form.employee_name.trim()) {
      setFormError(text.requiredField);
      return;
    }
    if (salary < 0 || bonus < 0) {
      setFormError(text.invalidAmount);
      return;
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const payload = {
      user_id: user.id,
      employee_name: form.employee_name.trim(),
      role: form.role.trim() || null,
      department: form.department.trim() || null,
      salary,
      bonus,
      status: form.status,
      join_date: form.join_date || null,
      payroll_due_day: Math.max(1, Math.min(numericValue(form.payroll_due_day) || 25, 31)),
      notes: form.notes.trim() || null,
    };

    const db = supabase as any;
    const result = editing
      ? await db.from('business_employees').update(payload).eq('id', editing.id).eq('user_id', user.id)
      : await db.from('business_employees').insert(payload);

    setSaving(false);
    if (result.error) {
      setFormError(text.saveError);
      return;
    }

    setNotice(text.employeeSaved);
    closeForm();
    await loadEmployees();
  }

  async function deleteEmployee(row: EmployeeRow) {
    if (!user || !permissions.canDeleteEmployees || !window.confirm(text.confirmDeleteEmployee)) return;
    setNotice('');
    const db = supabase as any;
    const result = await db.from('business_employees').delete().eq('id', row.id).eq('user_id', user.id);
    if (result.error) {
      setError(text.deleteError);
      return;
    }
    setNotice(text.employeeDeleted);
    await loadEmployees();
  }

  function exportRows(format: 'pdf' | 'xlsx' | 'csv') {
    if (!permissions.canExport) {
      setError(text.permissionDenied);
      return;
    }
    if (!filteredRows.length) {
      setNotice(text.noDataToExport);
      return;
    }
    const columns = employeeExportColumns(locale, defaultCurrency);
    const filters = [
      { label: text.status, value: statusFilter === 'all' ? text.allStatuses : employeeStatusLabel(statusFilter, locale) },
      { label: text.department, value: departmentFilter === 'all' ? text.allDepartments : departmentFilter },
      { label: text.role, value: businessRoleLabel(role, locale) },
    ];
    const totals = [
      { label: text.totalMonthlyPayroll, value: formatMoney(summary.payroll, defaultCurrency, locale) },
      { label: text.totalAllowances, value: formatMoney(summary.allowances, defaultCurrency, locale) },
      { label: text.totalMonthlyCost, value: formatMoney(summary.monthlyCost, defaultCurrency, locale) },
      { label: text.activeEmployees, value: String(summary.active) },
    ];
    if (format === 'csv') downloadCsv('the-sfm-payroll.csv', filteredRows, columns);
    if (format === 'xlsx') void downloadXlsx('the-sfm-payroll.xlsx', filteredRows, columns, text.employees);
    if (format === 'pdf') printPdf({ title: text.employees, lang: locale, columns, rows: filteredRows, totals, filters });
  }

  if (authLoading || loading || roleLoading) {
    return (
      <div className="business-ops-page" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={text.employees}>
          <div className="business-loading">
            <Loader2 className="business-spin" size={24} aria-hidden="true" />
            <p>{text.loading}</p>
          </div>
        </DashboardPageShell>
        <style jsx global>{employeeStyles}</style>
      </div>
    );
  }

  return (
    <div className="business-ops-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.employees} contentClassName="business-records-content">
        <div className="business-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <Link className="business-back-link" href="/business-operations">
          <ArrowLeft size={16} aria-hidden="true" />
          {text.backToOperations}
        </Link>

        <PageHero
          eyebrow={text.businessOperations}
          title={text.employees}
          subtitle={text.employeesDescription}
          icon={<UsersRound size={32} />}
          actions={
            <div className="business-hero-actions">
              {permissions.canWriteEmployees ? <button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addEmployee}</button> : null}
              {permissions.canExport ? (
                <>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('pdf')}><FileText size={16} />{text.exportPdf}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('xlsx')}><FileDown size={16} />{text.exportExcel}</button>
                  <button className="business-ghost-btn" type="button" onClick={() => exportRows('csv')}><FileDown size={16} />{text.exportCsv}</button>
                </>
              ) : null}
            </div>
          }
        />

        {!permissions.canViewEmployees ? (
          <EmptyState title={text.permissionDenied} description={businessRoleLabel(role, locale)} icon={<UsersRound size={26} />} />
        ) : (
          <>

        {error ? <div className="business-alert" role="alert">{error}</div> : null}
        {notice ? <div className="business-notice" role="status">{notice}</div> : null}

        <section className="business-stat-grid" aria-label={text.employees}>
          <article><span>{text.totalMonthlyPayroll}</span><strong>{permissions.canViewPayrollTotals ? formatMoney(summary.payroll, defaultCurrency, locale) : text.permissionDenied}</strong></article>
          <article><span>{text.totalAllowances}</span><strong>{permissions.canViewPayrollTotals ? formatMoney(summary.allowances, defaultCurrency, locale) : text.permissionDenied}</strong></article>
          <article><span>{text.totalMonthlyCost}</span><strong>{permissions.canViewPayrollTotals ? formatMoney(summary.monthlyCost, defaultCurrency, locale) : text.permissionDenied}</strong></article>
          <article><span>{text.totalEmployees}</span><strong>{summary.total.toLocaleString(locale === 'ar' ? 'ar-KW' : locale)}</strong></article>
          <article><span>{text.activeEmployees}</span><strong>{summary.active.toLocaleString(locale === 'ar' ? 'ar-KW' : locale)}</strong></article>
          <article><span>{text.averageSalary}</span><strong>{formatMoney(summary.averageSalary, defaultCurrency, locale)}</strong></article>
          <article><span>{text.nearestPayrollDate}</span><strong>{summary.nearestDate ? formatDate(summary.nearestDate, locale) : text.noDataYet}</strong></article>
        </section>

        <section className="business-toolbar employee-toolbar" aria-label={text.search}>
          <label className="business-search">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchEmployees} />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | EmployeeStatus)} aria-label={text.status}>
            <option value="all">{text.allStatuses}</option>
            {EMPLOYEE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{employeeStatusLabel(status, locale)}</option>)}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label={text.department}>
            <option value="all">{text.allDepartments}</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <div className="business-view-toggle" role="group" aria-label={text.employees}>
            <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'}><Grid2X2 size={15} />{text.gridView}</button>
            <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}><Table2 size={15} />{text.tableView}</button>
          </div>
        </section>

        {formOpen && permissions.canWriteEmployees ? (
          <section className="business-form-card" aria-label={editing ? text.editEmployee : text.addEmployee}>
            <div className="business-section-heading">
              <h2>{editing ? text.editEmployee : text.addEmployee}</h2>
              <button type="button" className="business-ghost-btn" onClick={closeForm}>{text.cancel}</button>
            </div>
            {formError ? <div className="business-form-error" role="alert">{formError}</div> : null}
            <form className="business-form-grid" onSubmit={handleSubmit}>
              <label>
                <span>{text.employeeName}</span>
                <input required value={form.employee_name} onChange={(event) => setForm({ ...form, employee_name: event.target.value })} />
              </label>
              <label>
                <span>{text.role}</span>
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
              </label>
              <label>
                <span>{text.department}</span>
                <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
              </label>
              <label>
                <span>{text.salary}</span>
                <input type="number" min="0" step="0.001" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} />
              </label>
              <label>
                <span>{text.bonus}</span>
                <input type="number" min="0" step="0.001" value={form.bonus} onChange={(event) => setForm({ ...form, bonus: event.target.value })} />
              </label>
              <label>
                <span>{text.status}</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EmployeeStatus })}>
                  {EMPLOYEE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{employeeStatusLabel(status, locale)}</option>)}
                </select>
              </label>
              <label>
                <span>{text.joinDate}</span>
                <input type="date" value={form.join_date} onChange={(event) => setForm({ ...form, join_date: event.target.value })} />
              </label>
              <label>
                <span>{text.payrollDueDay}</span>
                <input type="number" min="1" max="31" step="1" value={form.payroll_due_day} onChange={(event) => setForm({ ...form, payroll_due_day: event.target.value })} />
              </label>
              <label className="business-full-field">
                <span>{text.notes}</span>
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
              <div className="business-form-actions">
                <button className="business-primary-btn" type="submit" disabled={saving}>{saving ? text.loading : editing ? text.updateEmployee : text.saveEmployee}</button>
                <button className="business-ghost-btn" type="button" onClick={closeForm}>{text.cancel}</button>
              </div>
            </form>
          </section>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            title={text.noEmployeesYet}
            description={text.employeeEmptyBody}
            icon={<UsersRound size={26} />}
            actions={permissions.canWriteEmployees ? <button className="business-primary-btn" type="button" onClick={openCreate}><Plus size={16} />{text.addEmployee}</button> : null}
          />
        ) : view === 'grid' ? (
          <section className="employee-card-grid" aria-label={text.employees}>
            {filteredRows.map((row) => (
              <article className="employee-card" key={row.id}>
                <div className="employee-card-head">
                  <div>
                    <h2>{row.employee_name}</h2>
                    <p>{row.role || text.noDataYet}</p>
                  </div>
                  <span className={`business-status status-${row.status || 'active'}`}>{employeeStatusLabel(row.status, locale)}</span>
                </div>
                <dl>
                  <div><dt>{text.department}</dt><dd>{row.department || '-'}</dd></div>
                  <div><dt>{text.salary}</dt><dd>{formatMoney(numericValue(row.salary), defaultCurrency, locale)}</dd></div>
                  <div><dt>{text.bonus}</dt><dd>{formatMoney(numericValue(row.bonus), defaultCurrency, locale)}</dd></div>
                  <div><dt>{text.joinDate}</dt><dd>{row.join_date ? formatDate(row.join_date, locale) : '-'}</dd></div>
                  <div><dt>{text.payrollDueDay}</dt><dd>{row.payroll_due_day || 25}</dd></div>
                </dl>
                <div className="business-row-actions">
                  {permissions.canWriteEmployees ? <button type="button" onClick={() => openEdit(row)} aria-label={text.edit}><Edit3 size={15} />{text.edit}</button> : null}
                  {permissions.canDeleteEmployees ? <button type="button" className="danger" onClick={() => void deleteEmployee(row)} aria-label={text.delete}><Trash2 size={15} />{text.delete}</button> : null}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="business-table-card" aria-label={text.employees}>
            <div className="business-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{text.employeeName}</th>
                    <th>{text.role}</th>
                    <th>{text.department}</th>
                    <th>{text.salary}</th>
                    <th>{text.bonus}</th>
                    <th>{text.status}</th>
                    <th>{text.joinDate}</th>
                    <th>{text.payrollDueDay}</th>
                    <th>{text.edit}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.employee_name}</strong></td>
                      <td>{row.role || '-'}</td>
                      <td>{row.department || '-'}</td>
                      <td>{formatMoney(numericValue(row.salary), defaultCurrency, locale)}</td>
                      <td>{formatMoney(numericValue(row.bonus), defaultCurrency, locale)}</td>
                      <td><span className={`business-status status-${row.status || 'active'}`}>{employeeStatusLabel(row.status, locale)}</span></td>
                      <td>{row.join_date ? formatDate(row.join_date, locale) : '-'}</td>
                      <td>{row.payroll_due_day || 25}</td>
                      <td>
                        <div className="business-row-actions">
                          {permissions.canWriteEmployees ? <button type="button" onClick={() => openEdit(row)} aria-label={text.edit}><Edit3 size={15} />{text.edit}</button> : null}
                          {permissions.canDeleteEmployees ? <button type="button" className="danger" onClick={() => void deleteEmployee(row)} aria-label={text.delete}><Trash2 size={15} />{text.delete}</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
          </>
        )}
      </DashboardPageShell>
      <style jsx global>{employeeStyles}</style>
    </div>
  );
}

const employeeStyles = `
  .business-ops-page{min-height:100vh;background:var(--sfm-background);color:var(--sfm-foreground)}
  .business-records-content{display:grid;gap:18px}
  .business-topbar{display:flex;justify-content:flex-end;align-items:center;gap:12px}
  .business-back-link{width:max-content;display:inline-flex;align-items:center;gap:8px;color:var(--sfm-primary);text-decoration:none;font-weight:900}
  [dir="rtl"] .business-back-link svg{transform:scaleX(-1)}
  .business-loading{min-height:60vh;display:grid;place-items:center;align-content:center;gap:10px;color:var(--sfm-muted);font-weight:800}
  .business-spin{color:var(--sfm-primary);animation:business-spin .9s linear infinite}@keyframes business-spin{to{transform:rotate(360deg)}}
  .business-alert,.business-form-error{border:1px solid rgba(239,68,68,.24);background:rgba(239,68,68,.10);color:#B91C1C;border-radius:16px;padding:12px 14px;font-weight:850}
  .business-notice{border:1px solid rgba(16,185,129,.24);background:rgba(16,185,129,.10);color:#047857;border-radius:16px;padding:12px 14px;font-weight:850}
  .business-hero-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .business-primary-btn,.business-ghost-btn{min-height:42px;border-radius:14px;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
  .business-primary-btn{border:1px solid rgba(167,243,240,.34);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 14px 30px rgba(29,140,255,.18)}
  .business-ghost-btn{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-primary)}
  .business-primary-btn:hover,.business-primary-btn:focus-visible,.business-ghost-btn:hover,.business-ghost-btn:focus-visible{transform:translateY(-1px);outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .business-primary-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
  .business-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .business-stat-grid article,.business-form-card,.business-table-card,.employee-card{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);border-radius:22px;box-shadow:0 16px 38px rgba(3,18,37,.07)}
  .business-stat-grid article{padding:16px;min-width:0}
  .business-stat-grid span{display:block;color:var(--sfm-muted);font-size:.88rem;font-weight:850}
  .business-stat-grid strong{display:block;margin-top:8px;color:var(--sfm-foreground);font-size:1.25rem;overflow-wrap:anywhere}
  .business-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,210px) minmax(160px,210px) auto;gap:12px;align-items:center}
  .business-search{min-height:48px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);border-radius:16px;display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--sfm-muted)}
  .business-search input,.business-toolbar select,.business-form-grid input,.business-form-grid select,.business-form-grid textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:14px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}
  .business-search input{border:0;background:transparent;height:46px;padding:0}
  .business-search input:focus,.business-toolbar select:focus,.business-form-grid input:focus,.business-form-grid select:focus,.business-form-grid textarea:focus{box-shadow:0 0 0 3px rgba(24,212,212,.16);border-color:var(--sfm-accent)}
  .business-view-toggle{display:flex;gap:8px;padding:4px;border-radius:16px;background:rgba(29,140,255,.08);border:1px solid rgba(29,140,255,.12)}
  .business-view-toggle button{min-height:38px;border:0;border-radius:12px;background:transparent;color:var(--sfm-muted);display:inline-flex;align-items:center;gap:6px;padding:0 10px;font-family:inherit;font-weight:900;cursor:pointer;white-space:nowrap}
  .business-view-toggle button.active{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff}
  .business-form-card{padding:18px}
  .business-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
  .business-section-heading h2{margin:0;color:var(--sfm-foreground)}
  .business-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .business-form-grid label{display:grid;gap:7px;min-width:0}
  .business-form-grid label span{color:var(--sfm-muted);font-weight:900}
  .business-full-field,.business-form-actions{grid-column:1 / -1}
  .business-form-grid textarea{resize:vertical;line-height:1.7}
  .business-form-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .employee-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:14px}
  .employee-card{padding:16px;display:grid;gap:14px}
  .employee-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .employee-card h2{margin:0;color:var(--sfm-foreground);font-size:1.08rem}.employee-card p{margin:6px 0 0;color:var(--sfm-muted);font-weight:800}
  .employee-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}
  .employee-card dl div{padding:11px;border-radius:14px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.10);min-width:0}
  .employee-card dt{color:var(--sfm-muted);font-weight:900;font-size:.82rem}.employee-card dd{margin:5px 0 0;color:var(--sfm-foreground);font-weight:950;overflow-wrap:anywhere}
  .business-table-card{padding:0;overflow:hidden}
  .business-table-wrap{overflow:auto;max-width:100%}
  table{width:100%;border-collapse:collapse;min-width:920px}
  th,td{padding:14px 13px;text-align:start;border-bottom:1px solid rgba(29,140,255,.10);vertical-align:middle}
  th{background:rgba(29,140,255,.08);color:var(--sfm-muted);font-size:.82rem;font-weight:950;position:sticky;top:0;z-index:1}
  td{color:var(--sfm-foreground);font-weight:760}
  .business-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:.78rem;font-weight:950;background:rgba(16,185,129,.14);color:#047857;white-space:nowrap}
  .status-on_leave{background:rgba(245,158,11,.16);color:#B45309}.status-inactive{background:rgba(239,68,68,.14);color:#B91C1C}
  .business-row-actions{display:flex;flex-wrap:wrap;gap:8px}
  .business-row-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-primary);border-radius:12px;min-height:34px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-weight:900;cursor:pointer}
  .business-row-actions button.danger{color:#DC2626;border-color:rgba(239,68,68,.20)}
  .business-row-actions button:focus-visible{outline:2px solid rgba(24,212,212,.22);outline-offset:2px}
  .dark .business-alert,.dark .business-form-error{color:#FCA5A5}.dark .business-notice{color:#86EFAC}.dark .business-status{color:#86EFAC}.dark .status-on_leave{color:#FCD34D}.dark .status-inactive{color:#FCA5A5}
  @media(max-width:980px){.business-toolbar{grid-template-columns:1fr 1fr}.business-view-toggle{grid-column:1 / -1}.business-view-toggle button{flex:1;justify-content:center}}
  @media(max-width:760px){.business-topbar{justify-content:space-between;align-items:flex-start}.business-toolbar,.business-form-grid,.employee-card dl{grid-template-columns:1fr}.business-hero-actions,.business-primary-btn,.business-ghost-btn,.business-form-actions{width:100%}.business-form-actions{display:grid}.business-table-card{border-radius:18px}table{min-width:780px}.employee-card-head{display:grid}}
`;
