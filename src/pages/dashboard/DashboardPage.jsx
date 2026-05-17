import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, GraduationCap, UsersRound, WalletCards } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { supabase } from '../../lib/supabase.js';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getStudentName(student) {
  if (!student) {
    return 'Unknown student';
  }

  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unknown student';
}

function getPaymentDate(payment) {
  return payment.payment_date || payment.created_at;
}

function isEnrollmentFee(fee) {
  const text = `${fee?.fee_name || ''} ${fee?.fee_type || ''}`.toLowerCase();

  return text.includes('enrollment');
}

function buildMonthlyPaymentSummary(payments) {
  const monthlyTotals = new Map();

  payments.forEach((payment) => {
    const paymentDate = getPaymentDate(payment);

    if (!paymentDate) {
      return;
    }

    const date = new Date(paymentDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const currentTotal = monthlyTotals.get(monthKey)?.amount || 0;

    monthlyTotals.set(monthKey, {
      month: monthFormatter.format(date),
      amount: currentTotal + Number(payment.payment_amount || 0),
    });
  });

  return Array.from(monthlyTotals.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([, value]) => value);
}

function buildEnrollmentByGrade(enrollments, gradeLevels) {
  const gradeNames = new Map(
    gradeLevels.map((gradeLevel) => [gradeLevel.id, gradeLevel.grade_name]),
  );
  const totals = new Map();

  enrollments
    .filter((enrollment) => enrollment.enrollment_status === 'enrolled')
    .forEach((enrollment) => {
      const gradeName = gradeNames.get(enrollment.grade_level_id) || 'Unassigned';
      totals.set(gradeName, (totals.get(gradeName) || 0) + 1);
    });

  return Array.from(totals.entries()).map(([grade, count]) => ({
    grade,
    count,
  }));
}

function SummaryCard({ title, value, helperText, icon: Icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
        </div>

        <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
          <Icon aria-hidden="true" size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helperText}</p>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState({
    enrollments: [],
    gradeLevels: [],
    payments: [],
    recentStudents: new Map(),
    studentFees: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [
          enrollmentsResult,
          gradeLevelsResult,
          paymentsResult,
          studentFeesResult,
        ] = await Promise.all([
          supabase
            .from('enrollments')
            .select('id, student_id, grade_level_id, enrollment_status'),
          supabase.from('grade_levels').select('id, grade_name').order('grade_name'),
          supabase
            .from('payments')
            .select('id, student_id, receipt_number, payment_amount, payment_date, created_at'),
          supabase
            .from('student_fees')
            .select('id, student_id, amount, status, fees (id, fee_name, fee_type)'),
        ]);

        const queryError =
          enrollmentsResult.error ||
          gradeLevelsResult.error ||
          paymentsResult.error ||
          studentFeesResult.error;

        if (queryError) {
          throw queryError;
        }

        const payments = paymentsResult.data || [];
        const recentPayments = [...payments]
          .sort((firstPayment, secondPayment) => {
            const firstDate = new Date(getPaymentDate(firstPayment) || 0);
            const secondDate = new Date(getPaymentDate(secondPayment) || 0);

            return secondDate - firstDate;
          })
          .slice(0, 5);
        const recentStudentIds = [
          ...new Set(recentPayments.map((payment) => payment.student_id).filter(Boolean)),
        ];

        let recentStudents = new Map();

        if (recentStudentIds.length > 0) {
          const studentsResult = await supabase
            .from('students')
            .select('id, first_name, last_name')
            .in('id', recentStudentIds);

          if (studentsResult.error) {
            throw studentsResult.error;
          }

          recentStudents = new Map(
            (studentsResult.data || []).map((student) => [student.id, student]),
          );
        }

        if (isMounted) {
          setDashboardData({
            enrollments: enrollmentsResult.data || [],
            gradeLevels: gradeLevelsResult.data || [],
            payments,
            recentStudents,
            studentFees: (studentFeesResult.data || []).filter((studentFee) =>
              isEnrollmentFee(studentFee.fees),
            ),
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardSummary = useMemo(() => {
    const enrolledStudentIds = new Set(
      dashboardData.enrollments
        .filter((enrollment) => enrollment.enrollment_status === 'enrolled')
        .map((enrollment) => enrollment.student_id)
        .filter(Boolean),
    );
    const balanceItems = dashboardData.studentFees.filter((studentFee) =>
      ['unpaid', 'partial'].includes(studentFee.status),
    );
    const totalPayments = dashboardData.payments.reduce(
      (total, payment) => total + Number(payment.payment_amount || 0),
      0,
    );
    const totalUnpaidBalance = balanceItems.reduce(
      (total, studentFee) => total + Number(studentFee.amount || 0),
      0,
    );
    const studentsWithBalance = new Set(
      balanceItems.map((studentFee) => studentFee.student_id).filter(Boolean),
    );

    return {
      totalEnrolledStudents: enrolledStudentIds.size,
      totalPayments,
      totalUnpaidBalance,
      totalStudentsWithBalance: studentsWithBalance.size,
    };
  }, [dashboardData]);

  const recentPayments = useMemo(
    () =>
      [...dashboardData.payments]
        .sort((firstPayment, secondPayment) => {
          const firstDate = new Date(getPaymentDate(firstPayment) || 0);
          const secondDate = new Date(getPaymentDate(secondPayment) || 0);

          return secondDate - firstDate;
        })
        .slice(0, 5),
    [dashboardData.payments],
  );

  const enrollmentByGrade = useMemo(
    () => buildEnrollmentByGrade(dashboardData.enrollments, dashboardData.gradeLevels),
    [dashboardData.enrollments, dashboardData.gradeLevels],
  );

  const monthlyPaymentSummary = useMemo(
    () => buildMonthlyPaymentSummary(dashboardData.payments),
    [dashboardData.payments],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of enrollment activity, collections, balances, and recent payment records."
      />

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading dashboard data...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Enrolled Students"
              value={dashboardSummary.totalEnrolledStudents}
              helperText="Active enrolled student count"
              icon={GraduationCap}
            />
            <SummaryCard
              title="Total Payments Collected"
              value={formatCurrency(dashboardSummary.totalPayments)}
              helperText="Total recorded payment amount"
              icon={Banknote}
            />
            <SummaryCard
              title="Total Unpaid Balances"
              value={formatCurrency(dashboardSummary.totalUnpaidBalance)}
              helperText="Based on unpaid and partial enrollment fees"
              icon={WalletCards}
            />
            <SummaryCard
              title="Students With Balance"
              value={dashboardSummary.totalStudentsWithBalance}
              helperText="Students with unpaid or partial enrollment fee records"
              icon={UsersRound}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-950">
                  Enrollment Count by Grade Level
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current enrolled records grouped by grade level.
                </p>
              </div>

              {enrollmentByGrade.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentByGrade}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#047857" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="No enrolled students to summarize yet." />
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-950">
                  Monthly Payment Summary
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Recorded collections grouped by payment month.
                </p>
              </div>

              {monthlyPaymentSummary.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyPaymentSummary}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#047857"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="No payment records to summarize yet." />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-950">Recent Payments</h3>
              <p className="mt-1 text-sm text-slate-500">
                Latest recorded payment transactions.
              </p>
            </div>

            {recentPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Receipt No.</th>
                      <th className="px-3 py-3">Student</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPayments.map((payment) => {
                      const student = dashboardData.recentStudents.get(payment.student_id);

                      return (
                        <tr key={payment.id}>
                          <td className="px-3 py-3 font-medium text-slate-900">
                            {payment.receipt_number || 'No receipt'}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {getStudentName(student)}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {getPaymentDate(payment)
                              ? new Date(getPaymentDate(payment)).toLocaleDateString()
                              : 'No date'}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(payment.payment_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No recent payments found." />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
