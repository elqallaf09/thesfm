'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, FileDown, FileText, Grid2X2, Loader2, Plus, Search, Table2, Trash2, UsersRound } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TEXT, EMPLOYEE_STATUS_OPTIONS, businessRoleLabel, employeeStatusLabel, normalizeBusinessLang, numericValue, type BusinessLang, type EmployeeStatus } from '@/lib/businessOperations';
import { daysBetweenCalendar, downloadCsv, downloadXlsx, employeeExportColumns, nextPayrollDate, printPdf } from '@/lib/businessReports';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';
import { normalizeDigits } from '@/lib/locale';

type EmployeeRow = {
  id: string;
  user_id: string;
  name?: string | null;
  employee_name?: string | null;
  role: string | null;
  department: string | null;
  salary: number | string | null;
  currency?: string | null;
  skill_level?: number | string | null;
  bonus?: number | string | null;
  status: EmployeeStatus | string | null;
  join_date: string | null;
  salary_day?: number | string | null;
  payroll_due_day?: number | string | null;
  notes: string | null;
};

type EmployeeForm = {
  employee_name: string;
  role: string;
  department: string;
  salary: string;
  skill_level: string;
  status: EmployeeStatus;
  join_date: string;
  salary_day: string;
  notes: string;
};

function createEmptyEmployeeForm(): EmployeeForm {
  return {
    employee_name: '',
    role: '',
    department: '',
    salary: '',
    skill_level: '',
    status: 'active',
    join_date: '',
    salary_day: '25',
    notes: '',
  };
}

function employeeDisplayName(row: EmployeeRow) {
  return row.name || row.employee_name || '';
}

function employeeSalaryDay(row: EmployeeRow) {
  return Number(row.salary_day ?? row.payroll_due_day ?? 25);
}

function parseNumberInput(value: string, fallback = 0) {
  if (!value.trim()) return fallback;
  const parsed = Number(normalizeDigits(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatSkillLevel(value: number | string | null | undefined, lang: BusinessLang) {
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(numericValue(value))}%`;
}

function isValidDateInput(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function logEmployeeSaveError(error: any, context: { attempt: string; payloadKeys: string[] }) {
  if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_DEBUG_BUSINESS_SAVE !== 'true') return;
  console.error('[business_employees] save failed', {
    attempt: context.attempt,
    payloadKeys: context.payloadKeys,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}

function missingEmployeeColumn(error: any) {
  const message = String(error?.message ?? '');
  const match = message.match(/column "([^"]+)"/i);
  return match?.[1] ?? '';
}

function isEmployeePermissionError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied');
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
    const dueDays = Array.from(new Set(activeRows.map((row) => employeeSalaryDay(row)).filter((day) => day >= 1 && day <= 31)));
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
      return [employeeDisplayName(row), row.role, row.department, row.notes]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [departmentFilter, query, rows, statusFilter]);

  const summary = useMemo(() => {
    const activeRows = rows.filter((row) => row.status === 'active' || !row.status);
    const payroll = activeRows.reduce((total, row) => total + numericValue(row.salary), 0);
    const allowances = activeRows.reduce((total, row) => total + numericValue(row.bonus), 0);
    const salaryTotal = rows.reduce((total, row) => total + numericValue(row.salary), 0);
    const nearestDate = activeRows
      .map((row) => nextPayrollDate(employeeSalaryDay(row)))
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
      employee_name: employeeDisplayName(row),
      role: row.role ?? '',
      department: row.department ?? '',
      salary: String(row.salary ?? ''),
      skill_level: String(row.skill_level ?? ''),
      status: EMPLOYEE_STATUS_OPTIONS.includes(row.status as EmployeeStatus) ? row.status as EmployeeStatus : 'active',
      join_date: row.join_date ?? '',
      salary_day: String(row.salary_day ?? row.payroll_due_day ?? 25),
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
    if (!user) {
      setFormError(text.loginRequiredToSaveEmployee);
      return;
    }
    if (!permissions.canWriteEmployees) {
      setFormError(text.permissionDenied);
      return;
    }
    const employeeName = form.employee_name.trim();
    const salary = parseNumberInput(form.salary, Number.NaN);
    const skillLevel = parseNumberInput(form.skill_level, 0);
    const salaryDay = parseNumberInput(form.salary_day, Number.NaN);
    if (!employeeName) {
      setFormError(text.employeeNameRequired);
      return;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      setFormError(text.salaryRequired);
      return;
    }
    if (!Number.isFinite(skillLevel) || skillLevel < 0 || skillLevel > 100) {
      setFormError(text.skillLevelInvalid);
      return;
    }
    if (!Number.isFinite(salaryDay) || salaryDay < 1 || salaryDay > 31 || !Number.isInteger(salaryDay)) {
      setFormError(text.salaryDayInvalid);
      return;
    }
    if (!isValidDateInput(form.join_date)) {
      setFormError(text.joinDateInvalid);
      return;
    }

    setSaving(true);
    setFormError('');
    setNotice('');
    const basePayload = {
      user_id: user.id,
      role: form.role.trim() || null,
      department: form.department.trim() || null,
      salary,
      status: form.status,
      join_date: form.join_date || null,
      notes: form.notes.trim() || null,
    };
    const alignedPayload = {
      ...basePayload,
      name: employeeName,
      employee_name: employeeName,
      currency: defaultCurrency || 'KWD',
      skill_level: skillLevel,
      bonus: 0,
      salary_day: salaryDay,
      payroll_due_day: salaryDay,
    };
    const modernPayload = {
      ...basePayload,
      name: employeeName,
      currency: defaultCurrency || 'KWD',
      skill_level: skillLevel,
      salary_day: salaryDay,
    };
    const legacyPayload = {
      ...basePayload,
      employee_name: employeeName,
      bonus: 0,
      payroll_due_day: salaryDay,
    };

    const db = supabase as any;
    const savePayload = async (payload: Record<string, unknown>) => {
      return editing
        ? await db.from('business_employees').update(payload).eq('id', editing.id).eq('user_id', user.id)
        : await db.from('business_employees').insert(payload);
    };
    let result = await savePayload(alignedPayload);
    if (result.error) {
      logEmployeeSaveError(result.error, { attempt: 'aligned', payloadKeys: Object.keys(alignedPayload) });
      const missingColumn = missingEmployeeColumn(result.error);
      if (['name', 'currency', 'skill_level', 'salary_day'].includes(missingColumn)) {
        result = await savePayload(legacyPayload);
        if (result.error) logEmployeeSaveError(result.error, { attempt: 'legacy', payloadKeys: Object.keys(legacyPayload) });
      } else if (['employee_name', 'bonus', 'payroll_due_day'].includes(missingColumn)) {
        result = await savePayload(modernPayload);
        if (result.error) logEmployeeSaveError(result.error, { attempt: 'modern', payloadKeys: Object.keys(modernPayload) });
      }
    }

    setSaving(false);
    if (result.error) {
      setFormError(isEmployeePermissionError(result.error) ? text.employeeAccessDeniedSave : text.employeeSaveFailedDetailed);
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
      <DashboardPageShell ariaLabel={text.employees} contentClassName="business-records-content">
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
          <article><span>{text.totalEmployees}</span><strong>{summary.total.toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</strong></article>
          <article><span>{text.activeEmployees}</span><strong>{summary.active.toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</strong></article>
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
                <span>{text.skillLevel}</span>
                <input type="number" min="0" max="100" step="0.1" value={form.skill_level} onChange={(event) => setForm({ ...form, skill_level: event.target.value })} />
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
                <input type="number" min="1" max="31" step="1" value={form.salary_day} onChange={(event) => setForm({ ...form, salary_day: event.target.value })} />
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
                    <h2>{employeeDisplayName(row)}</h2>
                    <p>{row.role || text.noDataYet}</p>
                  </div>
                  <span className={`business-status status-${row.status || 'active'}`}>{employeeStatusLabel(row.status, locale)}</span>
                </div>
                <dl>
                  <div><dt>{text.department}</dt><dd>{row.department || '-'}</dd></div>
                  <div><dt>{text.salary}</dt><dd>{formatMoney(numericValue(row.salary), defaultCurrency, locale)}</dd></div>
                  <div><dt>{text.skillLevel}</dt><dd dir="ltr">{formatSkillLevel(row.skill_level, locale)}</dd></div>
                  <div><dt>{text.joinDate}</dt><dd>{row.join_date ? formatDate(row.join_date, locale) : '-'}</dd></div>
                  <div><dt>{text.payrollDueDay}</dt><dd>{employeeSalaryDay(row) || 25}</dd></div>
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
                    <th>{text.skillLevel}</th>
                    <th>{text.status}</th>
                    <th>{text.joinDate}</th>
                    <th>{text.payrollDueDay}</th>
                    <th>{text.edit}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{employeeDisplayName(row)}</strong></td>
                      <td>{row.role || '-'}</td>
                      <td>{row.department || '-'}</td>
                      <td>{formatMoney(numericValue(row.salary), defaultCurrency, locale)}</td>
                      <td dir="ltr">{formatSkillLevel(row.skill_level, locale)}</td>
                      <td><span className={`business-status status-${row.status || 'active'}`}>{employeeStatusLabel(row.status, locale)}</span></td>
                      <td>{row.join_date ? formatDate(row.join_date, locale) : '-'}</td>
                      <td>{employeeSalaryDay(row) || 25}</td>
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
  .business-ops-page{min-height:100vh;background:var(--background);color:var(--foreground)}
  .business-records-content{display:grid;gap:18px}
  .business-back-link{width:max-content;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid var(--border);background:var(--primary-soft);color:var(--primary);border-radius:var(--radius-card);padding:0 16px;text-decoration:none;font-size:.92rem;font-weight:600;box-shadow:var(--shadow-xs);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease,color .16s ease}
  .business-back-link svg{flex-shrink:0}
  [dir="rtl"] .business-back-link svg{transform:scaleX(-1)}
  .business-back-link:hover,.business-back-link:focus-visible{transform:translateY(-1px);border-color:var(--primary);background:var(--surface-hover);color:var(--primary-hover);box-shadow:var(--shadow-sm);outline:2px solid color-mix(in srgb,var(--focus-ring) 32%,transparent);outline-offset:2px}
  .business-back-link:active{transform:translateY(0);box-shadow:var(--shadow-xs)}
  .business-loading{min-height:60vh;display:grid;place-items:center;align-content:center;gap:10px;color:var(--foreground-muted);font-weight:500}
  .business-spin{color:var(--primary);animation:business-spin .9s linear infinite}@keyframes business-spin{to{transform:rotate(360deg)}}
  .business-alert,.business-form-error{border:1px solid color-mix(in srgb,var(--danger) 28%,transparent);background:var(--danger-soft);color:var(--danger);border-radius:var(--radius-card);padding:12px 14px;font-weight:500}
  .business-notice{border:1px solid color-mix(in srgb,var(--success) 28%,transparent);background:var(--success-soft);color:var(--success);border-radius:var(--radius-card);padding:12px 14px;font-weight:500}
  .business-hero-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .business-primary-btn,.business-ghost-btn{min-height:42px;border-radius:var(--radius-control);padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:600;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
  .business-primary-btn{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-sm)}
  .business-ghost-btn{border:1px solid var(--border);background:var(--surface);color:var(--primary)}
  .business-primary-btn:hover,.business-primary-btn:focus-visible,.business-ghost-btn:hover,.business-ghost-btn:focus-visible{transform:translateY(-1px);outline:2px solid color-mix(in srgb,var(--focus-ring) 32%,transparent);outline-offset:2px}
  .business-primary-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
  .business-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .business-stat-grid article,.business-form-card,.business-table-card,.employee-card{border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);box-shadow:var(--shadow-card)}
  .business-stat-grid article{padding:16px;min-width:0}
  .business-stat-grid span{display:block;color:var(--foreground-muted);font-size:.88rem;font-weight:500}
  .business-stat-grid strong{display:block;margin-top:8px;color:var(--foreground);font-family:var(--font-data);font-size:1.25rem;overflow-wrap:anywhere}
  .business-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,210px) minmax(160px,210px) auto;gap:12px;align-items:center}
  .business-search{min-height:48px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--foreground-muted)}
  .business-search input,.business-toolbar select,.business-form-grid input,.business-form-grid select,.business-form-grid textarea{width:100%;min-width:0;border:1px solid var(--border-strong);background:var(--control-background);color:var(--foreground);border-radius:var(--radius-control);padding:11px 12px;font-family:inherit;font-weight:500;outline:none}
  .business-search input{border:0;background:transparent;height:var(--control-h);padding:0}
  .business-search input:focus,.business-toolbar select:focus,.business-form-grid input:focus,.business-form-grid select:focus,.business-form-grid textarea:focus{box-shadow:var(--focus-shadow);border-color:var(--focus-ring)}
  .business-view-toggle{display:flex;gap:8px;padding:4px;border-radius:var(--radius-card);background:var(--surface-muted);border:1px solid var(--border)}
  .business-view-toggle button{min-height:38px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--foreground-muted);display:inline-flex;align-items:center;gap:6px;padding:0 10px;font-family:inherit;font-weight:500;cursor:pointer;white-space:nowrap}
  .business-view-toggle button.active{background:var(--primary);color:var(--primary-foreground);font-weight:600}
  .business-form-card{padding:18px}
  .business-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
  .business-section-heading h2{margin:0;color:var(--foreground)}
  .business-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .business-form-grid label{display:grid;gap:7px;min-width:0}
  .business-form-grid label span{color:var(--foreground-muted);font-weight:500}
  .business-full-field,.business-form-actions{grid-column:1 / -1}
  .business-form-grid textarea{resize:vertical;line-height:1.7}
  .business-form-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .employee-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:14px}
  .employee-card{padding:16px;display:grid;gap:14px}
  .employee-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .employee-card h2{margin:0;color:var(--foreground);font-size:1.08rem}.employee-card p{margin:6px 0 0;color:var(--foreground-muted);font-weight:400}
  .employee-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}
  .employee-card dl div{padding:11px;border-radius:var(--radius-control);background:var(--surface-muted);border:1px solid var(--border);min-width:0}
  .employee-card dt{color:var(--foreground-muted);font-weight:500;font-size:.82rem}.employee-card dd{margin:5px 0 0;color:var(--foreground);font-weight:600;overflow-wrap:anywhere}
  .business-table-card{padding:0;overflow:hidden}
  .business-table-wrap{overflow:auto;max-width:100%}
  table{width:100%;border-collapse:collapse;min-width:920px}
  th,td{padding:14px 13px;text-align:start;border-bottom:1px solid var(--border);vertical-align:middle}
  th{background:var(--surface-muted);color:var(--foreground-muted);font-size:.82rem;font-weight:600;position:sticky;top:0;z-index:1}
  td{color:var(--foreground);font-weight:400}
  .business-status{display:inline-flex;border-radius:var(--radius-pill);padding:5px 10px;font-size:.78rem;font-weight:600;background:var(--success-soft);color:var(--success);white-space:nowrap}
  .status-on_leave{background:var(--warning-soft);color:var(--warning)}.status-inactive{background:var(--danger-soft);color:var(--danger)}
  .business-row-actions{display:flex;flex-wrap:wrap;gap:8px}
  .business-row-actions button{border:1px solid var(--border);background:var(--surface);color:var(--primary);border-radius:var(--radius-control);min-height:34px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-weight:600;cursor:pointer}
  .business-row-actions button.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 28%,transparent)}
  .business-row-actions button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
  @media(max-width:980px){.business-toolbar{grid-template-columns:1fr 1fr}.business-view-toggle{grid-column:1 / -1}.business-view-toggle button{flex:1;justify-content:center}}
  @media(max-width:760px){.business-back-link{width:100%;min-height:46px}.business-toolbar,.business-form-grid,.employee-card dl{grid-template-columns:1fr}.business-hero-actions,.business-primary-btn,.business-ghost-btn,.business-form-actions{width:100%}.business-form-actions{display:grid}.business-table-card{border-radius:var(--radius-card)}table{min-width:780px}.employee-card-head{display:grid}}
`;
