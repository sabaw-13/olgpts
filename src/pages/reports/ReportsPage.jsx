import { Download, Printer, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { supabase } from '../../lib/supabase.js';
import { formatStudentName } from '../../lib/studentName.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const reportTypes = [
  { value: 'enrollment', label: 'Enrollment Report' },
  { value: 'paymentHistory', label: 'Payment History Report' },
  { value: 'studentBalances', label: 'Student Balance Report' },
  { value: 'dailyCollections', label: 'Daily Collection Report' },
  { value: 'monthlySummary', label: 'Monthly Financial Summary' },
  { value: 'unpaidBalances', label: 'Students with Unpaid Balances' },
];

const defaultFilters = {
  dateFrom: '',
  dateTo: '',
  schoolYearId: 'all',
  gradeLevelId: 'all',
  sectionId: 'all',
  studentName: '',
  paymentStatus: 'all',
};

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
}

function formatMonth(monthKey) {
  if (!monthKey) {
    return 'Not set';
  }

  const [year, month] = monthKey.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getPaymentStatus(assessed, paid) {
  if (paid <= 0) {
    return 'unpaid';
  }

  if (paid >= assessed) {
    return 'paid';
  }

  return 'partial';
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
}

function getReportTitle(reportType) {
  return reportTypes.find((report) => report.value === reportType)?.label || 'Report';
}

function passesDateFilter(rowDate, filters) {
  if (!rowDate) {
    return !filters.dateFrom && !filters.dateTo;
  }

  const dateValue = new Date(rowDate).setHours(0, 0, 0, 0);

  if (filters.dateFrom) {
    const startDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
    if (dateValue < startDate) {
      return false;
    }
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo).setHours(0, 0, 0, 0);
    if (dateValue > endDate) {
      return false;
    }
  }

  return true;
}

function paymentMatchesReportFilters(payment, filters) {
  const normalizedStudentName = normalizeText(filters.studentName).trim();
  const matchesDate = passesDateFilter(payment.payment_date || payment.created_at, filters);
  const matchesSchoolYear =
    filters.schoolYearId === 'all' ||
    payment.enrollments?.school_year_id === filters.schoolYearId;
  const matchesGradeLevel =
    filters.gradeLevelId === 'all' ||
    payment.enrollments?.grade_level_id === filters.gradeLevelId;
  const matchesSection =
    filters.sectionId === 'all' || payment.enrollments?.section_id === filters.sectionId;
  const matchesStudent =
    !normalizedStudentName ||
    normalizeText(`${formatStudentName(payment.students)} ${payment.students?.lrn || ''}`).includes(
      normalizedStudentName,
    );

  return matchesDate && matchesSchoolYear && matchesGradeLevel && matchesSection && matchesStudent;
}

function downloadCsv(filename, columns, rows) {
  const escapeCsv = (value) => {
    const text = String(value ?? '');

    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  const csvContent = [
    columns.map((column) => escapeCsv(column.label)).join(','),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv(row[column.key])).join(','),
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
      No records found for the selected report and filters.
    </div>
  );
}

function ReportsPage() {
  const [reportType, setReportType] = useState('enrollment');
  const [filters, setFilters] = useState(defaultFilters);
  const [reportData, setReportData] = useState({
    enrollments: [],
    payments: [],
    studentFees: [],
    schoolYears: [],
    gradeLevels: [],
    sections: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMessage('');

    const [
      enrollmentsResult,
      paymentsResult,
      studentFeesResult,
      schoolYearsResult,
      gradeLevelsResult,
      sectionsResult,
    ] = await Promise.all([
      supabase
        .from('enrollments')
        .select(
          `
          id,
          student_id,
          school_year_id,
          grade_level_id,
          section_id,
          enrollment_status,
          enrollment_date,
          created_at,
          students (id, lrn, first_name, middle_name, last_name),
          school_years (id, school_year),
          grade_levels (id, grade_name),
          sections (id, section_name)
        `,
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select(
          `
          id,
          student_id,
          enrollment_id,
          receipt_number,
          payment_amount,
          payment_method,
          remarks,
          payment_date,
          created_at,
          students (id, lrn, first_name, middle_name, last_name),
          profiles (id, full_name),
          enrollments (
            id,
            school_year_id,
            grade_level_id,
            section_id,
            school_years (id, school_year),
            grade_levels (id, grade_name),
            sections (id, section_name)
          )
        `,
        )
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('student_fees')
        .select(
          `
          id,
          student_id,
          enrollment_id,
          fee_id,
          amount,
          status,
          created_at,
          students (id, lrn, first_name, middle_name, last_name),
          enrollments (
            id,
            school_year_id,
            grade_level_id,
            section_id,
            enrollment_status,
            enrollment_date,
            school_years (id, school_year),
            grade_levels (id, grade_name),
            sections (id, section_name)
          ),
          fees (id, fee_name, fee_type)
        `,
        ),
      supabase.from('school_years').select('id, school_year').order('school_year'),
      supabase.from('grade_levels').select('id, grade_name').order('grade_name'),
      supabase.from('sections').select('id, section_name, grade_level_id').order('section_name'),
    ]);

    const queryError =
      enrollmentsResult.error ||
      paymentsResult.error ||
      studentFeesResult.error ||
      schoolYearsResult.error ||
      gradeLevelsResult.error ||
      sectionsResult.error;

    if (queryError) {
      setErrorMessage(queryError.message);
      setReportData({
        enrollments: [],
        payments: [],
        studentFees: [],
        schoolYears: [],
        gradeLevels: [],
        sections: [],
      });
    } else {
      setReportData({
        enrollments: enrollmentsResult.data || [],
        payments: paymentsResult.data || [],
        studentFees: (studentFeesResult.data || []).filter((studentFee) =>
          isEnrollmentFee(studentFee.fees),
        ),
        schoolYears: schoolYearsResult.data || [],
        gradeLevels: gradeLevelsResult.data || [],
        sections: sectionsResult.data || [],
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const paymentTotalsByEnrollment = useMemo(() => {
    const totals = new Map();

    reportData.payments.forEach((payment) => {
      totals.set(
        payment.enrollment_id,
        (totals.get(payment.enrollment_id) || 0) + Number(payment.payment_amount || 0),
      );
    });

    return totals;
  }, [reportData.payments]);

  const studentFeeTotalsByEnrollment = useMemo(() => {
    const totals = new Map();

    reportData.studentFees.forEach((studentFee) => {
      totals.set(
        studentFee.enrollment_id,
        (totals.get(studentFee.enrollment_id) || 0) + Number(studentFee.amount || 0),
      );
    });

    return totals;
  }, [reportData.studentFees]);

  const balanceRows = useMemo(() => {
    const enrollmentsById = new Map(
      reportData.enrollments.map((enrollment) => [enrollment.id, enrollment]),
    );

    return Array.from(studentFeeTotalsByEnrollment.entries()).map(
      ([enrollmentId, totalAssessed]) => {
        const enrollment = enrollmentsById.get(enrollmentId);
        const totalPaid = paymentTotalsByEnrollment.get(enrollmentId) || 0;
        const balance = Math.max(totalAssessed - totalPaid, 0);

        return {
          id: enrollmentId,
          date: enrollment?.enrollment_date || enrollment?.created_at,
          enrollment,
          student: enrollment?.students,
          lrn: enrollment?.students?.lrn || '',
          studentName: formatStudentName(enrollment?.students),
          schoolYearId: enrollment?.school_year_id,
          schoolYear: enrollment?.school_years?.school_year || 'Not assigned',
          gradeLevelId: enrollment?.grade_level_id,
          gradeLevel: enrollment?.grade_levels?.grade_name || 'Not assigned',
          sectionId: enrollment?.section_id,
          section: enrollment?.sections?.section_name || 'Not assigned',
          totalAssessed,
          totalPaid,
          balance,
          paymentStatus: getPaymentStatus(totalAssessed, totalPaid),
        };
      },
    );
  }, [paymentTotalsByEnrollment, reportData.enrollments, studentFeeTotalsByEnrollment]);

  const baseRows = useMemo(() => {
    if (reportType === 'enrollment') {
      return reportData.enrollments.map((enrollment) => ({
        id: enrollment.id,
        date: enrollment.enrollment_date || enrollment.created_at,
        studentName: formatStudentName(enrollment.students),
        lrn: enrollment.students?.lrn || '',
        schoolYearId: enrollment.school_year_id,
        schoolYear: enrollment.school_years?.school_year || 'Not assigned',
        gradeLevelId: enrollment.grade_level_id,
        gradeLevel: enrollment.grade_levels?.grade_name || 'Not assigned',
        sectionId: enrollment.section_id,
        section: enrollment.sections?.section_name || 'Not assigned',
        status: enrollment.enrollment_status,
        enrollmentDate: formatDate(enrollment.enrollment_date),
      }));
    }

    if (reportType === 'paymentHistory') {
      return reportData.payments.map((payment) => ({
        id: payment.id,
        date: payment.payment_date || payment.created_at,
        receiptNumber: payment.receipt_number,
        studentName: formatStudentName(payment.students),
        lrn: payment.students?.lrn || '',
        schoolYearId: payment.enrollments?.school_year_id,
        schoolYear: payment.enrollments?.school_years?.school_year || 'Not assigned',
        gradeLevelId: payment.enrollments?.grade_level_id,
        gradeLevel: payment.enrollments?.grade_levels?.grade_name || 'Not assigned',
        sectionId: payment.enrollments?.section_id,
        section: payment.enrollments?.sections?.section_name || 'Not assigned',
        paymentDate: formatDate(payment.payment_date),
        paymentMethod: payment.payment_method || 'Not set',
        receivedBy: payment.profiles?.full_name || 'Unknown',
        amount: Number(payment.payment_amount || 0),
      }));
    }

    if (reportType === 'dailyCollections') {
      const totals = new Map();

      reportData.payments
        .filter((payment) => paymentMatchesReportFilters(payment, filters))
        .forEach((payment) => {
        const dateKey = payment.payment_date || payment.created_at?.slice(0, 10);
        const current = totals.get(dateKey) || {
          id: dateKey,
          date: dateKey,
          paymentDate: formatDate(dateKey),
          transactionCount: 0,
          amount: 0,
        };

        current.transactionCount += 1;
        current.amount += Number(payment.payment_amount || 0);
        totals.set(dateKey, current);
      });

      return Array.from(totals.values()).sort((first, second) =>
        String(second.date).localeCompare(String(first.date)),
      );
    }

    if (reportType === 'monthlySummary') {
      const totals = new Map();

      reportData.payments
        .filter((payment) => paymentMatchesReportFilters(payment, filters))
        .forEach((payment) => {
        const dateValue = payment.payment_date || payment.created_at;

        if (!dateValue) {
          return;
        }

        const date = new Date(dateValue);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = totals.get(monthKey) || {
          id: monthKey,
          date: `${monthKey}-01`,
          month: formatMonth(monthKey),
          transactionCount: 0,
          amount: 0,
        };

        current.transactionCount += 1;
        current.amount += Number(payment.payment_amount || 0);
        totals.set(monthKey, current);
      });

      return Array.from(totals.values()).sort((first, second) =>
        String(second.id).localeCompare(String(first.id)),
      );
    }

    if (reportType === 'unpaidBalances') {
      return balanceRows.filter((row) => row.balance > 0);
    }

    return balanceRows;
  }, [balanceRows, filters, reportData.enrollments, reportData.payments, reportType]);

  const reportRows = useMemo(() => {
    const normalizedStudentName = normalizeText(filters.studentName).trim();

    const isAggregateReport = ['dailyCollections', 'monthlySummary'].includes(reportType);

    return baseRows.filter((row) => {
      const matchesDate = passesDateFilter(row.date, filters);
      const matchesSchoolYear =
        isAggregateReport ||
        filters.schoolYearId === 'all' ||
        row.schoolYearId === filters.schoolYearId;
      const matchesGradeLevel =
        isAggregateReport ||
        filters.gradeLevelId === 'all' ||
        row.gradeLevelId === filters.gradeLevelId;
      const matchesSection =
        isAggregateReport || filters.sectionId === 'all' || row.sectionId === filters.sectionId;
      const matchesStudent =
        isAggregateReport ||
        !normalizedStudentName ||
        normalizeText(`${row.studentName || ''} ${row.lrn || ''}`).includes(
          normalizedStudentName,
        );
      const matchesPaymentStatus =
        filters.paymentStatus === 'all' ||
        !row.paymentStatus ||
        row.paymentStatus === filters.paymentStatus;

      return (
        matchesDate &&
        matchesSchoolYear &&
        matchesGradeLevel &&
        matchesSection &&
        matchesStudent &&
        matchesPaymentStatus
      );
    });
  }, [baseRows, filters, reportType]);

  const reportColumns = useMemo(() => {
    if (reportType === 'enrollment') {
      return [
        { key: 'studentName', label: 'Student' },
        { key: 'lrn', label: 'LRN' },
        { key: 'schoolYear', label: 'School Year' },
        { key: 'gradeLevel', label: 'Grade Level' },
        { key: 'section', label: 'Section' },
        { key: 'status', label: 'Status' },
        { key: 'enrollmentDate', label: 'Enrollment Date' },
      ];
    }

    if (reportType === 'paymentHistory') {
      return [
        { key: 'receiptNumber', label: 'Receipt No.' },
        { key: 'studentName', label: 'Student' },
        { key: 'lrn', label: 'LRN' },
        { key: 'schoolYear', label: 'School Year' },
        { key: 'gradeLevel', label: 'Grade Level' },
        { key: 'paymentDate', label: 'Payment Date' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'receivedBy', label: 'Received By' },
        { key: 'amount', label: 'Amount', currency: true },
      ];
    }

    if (reportType === 'dailyCollections') {
      return [
        { key: 'paymentDate', label: 'Date' },
        { key: 'transactionCount', label: 'Transactions' },
        { key: 'amount', label: 'Total Collection', currency: true },
      ];
    }

    if (reportType === 'monthlySummary') {
      return [
        { key: 'month', label: 'Month' },
        { key: 'transactionCount', label: 'Transactions' },
        { key: 'amount', label: 'Total Collection', currency: true },
      ];
    }

    return [
      { key: 'studentName', label: 'Student' },
      { key: 'lrn', label: 'LRN' },
      { key: 'schoolYear', label: 'School Year' },
      { key: 'gradeLevel', label: 'Grade Level' },
      { key: 'section', label: 'Section' },
      { key: 'totalAssessed', label: 'Assessed', currency: true },
      { key: 'totalPaid', label: 'Paid', currency: true },
      { key: 'balance', label: 'Balance', currency: true },
      { key: 'paymentStatus', label: 'Payment Status' },
    ];
  }, [reportType]);

  const filteredSections = useMemo(
    () =>
      reportData.sections.filter(
        (section) =>
          filters.gradeLevelId === 'all' || section.grade_level_id === filters.gradeLevelId,
      ),
    [filters.gradeLevelId, reportData.sections],
  );

  const totalAmount = useMemo(
    () =>
      reportRows.reduce(
        (total, row) =>
          total +
          Number(
            row.amount ??
              row.balance ??
              0,
          ),
        0,
      ),
    [reportRows],
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
      ...(name === 'gradeLevelId' ? { sectionId: 'all' } : {}),
    }));
  };

  const handleExportCsv = () => {
    const csvRows = reportRows.map((row) => {
      const csvRow = {};

      reportColumns.forEach((column) => {
        csvRow[column.key] = column.currency ? Number(row[column.key] || 0) : row[column.key];
      });

      return csvRow;
    });

    downloadCsv(
      `${getReportTitle(reportType).toLowerCase().replaceAll(' ', '-')}.csv`,
      reportColumns,
      csvRows,
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Reports"
          description="Generate enrollment, payment, collection, and student balance reports."
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={reportRows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={reportRows.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      <NotificationToast
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage('')}
      />

      <section className="no-print rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
            Report Type
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {reportTypes.map((report) => (
                <option key={report.value} value={report.value}>
                  {report.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Date From
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Date To
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            School Year
            <select
              name="schoolYearId"
              value={filters.schoolYearId}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All school years</option>
              {reportData.schoolYears.map((schoolYear) => (
                <option key={schoolYear.id} value={schoolYear.id}>
                  {schoolYear.school_year}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Payment Status
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Grade Level
            <select
              name="gradeLevelId"
              value={filters.gradeLevelId}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All grade levels</option>
              {reportData.gradeLevels.map((gradeLevel) => (
                <option key={gradeLevel.id} value={gradeLevel.id}>
                  {gradeLevel.grade_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Section
            <select
              name="sectionId"
              value={filters.sectionId}
              onChange={handleFilterChange}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.section_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
            Student Name or LRN
            <span className="relative mt-2 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="search"
                name="studentName"
                value={filters.studentName}
                onChange={handleFilterChange}
                placeholder="Search student"
                className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>
        </div>
      </section>

      <section className="report-print-area rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 border-b border-slate-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Our Lady of Guadalupe Tibiao Parochial School
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {getReportTitle(reportType)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {reportRows.length} record{reportRows.length === 1 ? '' : 's'} found
            {['paymentHistory', 'dailyCollections', 'monthlySummary', 'studentBalances', 'unpaidBalances'].includes(reportType)
              ? ` | Total: ${formatCurrency(totalAmount)}`
              : ''}
          </p>
        </div>

        {loading ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading report data...
          </div>
        ) : reportRows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {reportColumns.map((column) => (
                    <th
                      key={column.key}
                      className={[
                        'px-3 py-3',
                        column.currency ? 'text-right' : '',
                      ].join(' ')}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((row) => (
                  <tr key={row.id}>
                    {reportColumns.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          'px-3 py-3 text-slate-700',
                          column.currency ? 'text-right font-semibold text-slate-950' : '',
                          column.key === 'studentName' || column.key === 'receiptNumber'
                            ? 'font-medium text-slate-950'
                            : '',
                        ].join(' ')}
                      >
                        {column.currency
                          ? formatCurrency(row[column.key])
                          : row[column.key] || 'Not set'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
