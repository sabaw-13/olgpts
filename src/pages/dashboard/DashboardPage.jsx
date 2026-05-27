import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClipboardList, GraduationCap, UserPlus, UsersRound } from 'lucide-react';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const chartColors = [
  '#1f3f93',
  '#f5bb2e',
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#dc2626',
  '#ea580c',
  '#0891b2',
  '#4f46e5',
];

const fixedGradeSequence = [
  { key: 'nursery', aliases: ['nursery'] },
  { key: 'kinder i', aliases: ['kinder i', 'kinder 1'] },
  { key: 'kindergarten', aliases: ['kindergarten', 'kinder ii', 'kinder 2'] },
  { key: 'grade i', aliases: ['grade i', 'grade 1', 'grade one'] },
  { key: 'grade ii', aliases: ['grade ii', 'grade 2', 'grade two'] },
  { key: 'grade iii', aliases: ['grade iii', 'grade 3', 'grade three'] },
  { key: 'grade iv', aliases: ['grade iv', 'grade 4', 'grade four'] },
  { key: 'grade v', aliases: ['grade v', 'grade 5', 'grade five'] },
  { key: 'grade vi', aliases: ['grade vi', 'grade 6', 'grade six'] },
];

function normalizeGradeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFixedGradeStep(gradeLevel) {
  const gradeName = normalizeGradeName(gradeLevel?.grade_name);

  return fixedGradeSequence.findIndex((gradeStep) =>
    gradeStep.aliases.includes(gradeName),
  );
}

function sortGradeLevels(firstGrade, secondGrade) {
  const firstStep = getFixedGradeStep(firstGrade);
  const secondStep = getFixedGradeStep(secondGrade);

  if (firstStep !== secondStep) {
    if (firstStep < 0) return 1;
    if (secondStep < 0) return -1;
    return firstStep - secondStep;
  }

  return String(firstGrade.grade_name || '').localeCompare(String(secondGrade.grade_name || ''));
}

function getSchoolYearSortValue(schoolYear) {
  const match = String(schoolYear?.school_year || '').match(/\d{4}/);

  return match ? Number(match[0]) : 0;
}

function sortSchoolYears(firstSchoolYear, secondSchoolYear) {
  const firstValue = getSchoolYearSortValue(firstSchoolYear);
  const secondValue = getSchoolYearSortValue(secondSchoolYear);

  if (firstValue !== secondValue) {
    return firstValue - secondValue;
  }

  return String(firstSchoolYear.school_year || '').localeCompare(
    String(secondSchoolYear.school_year || ''),
  );
}

function getDashboardSchoolYearId(schoolYears) {
  const activeSchoolYear = schoolYears.find((schoolYear) => schoolYear.status === 'active');

  return activeSchoolYear?.id || [...schoolYears].sort(sortSchoolYears).at(-1)?.id || '';
}

function getDashboardSchoolYearLabel(schoolYears, schoolYearId) {
  return (
    schoolYears.find((schoolYear) => schoolYear.id === schoolYearId)?.school_year ||
    'current school year'
  );
}

function buildEnrollmentByGrade(enrollments, gradeLevels, schoolYearId) {
  const gradeNames = new Map(
    gradeLevels.map((gradeLevel) => [gradeLevel.id, gradeLevel.grade_name]),
  );
  const studentIdsByGrade = new Map();

  enrollments
    .filter(
      (enrollment) =>
        enrollment.enrollment_status === 'enrolled' &&
        (!schoolYearId || enrollment.school_year_id === schoolYearId),
    )
    .forEach((enrollment) => {
      const gradeName = gradeNames.get(enrollment.grade_level_id) || 'Unassigned';
      const studentKey = enrollment.student_id || enrollment.id;

      if (!studentIdsByGrade.has(gradeName)) {
        studentIdsByGrade.set(gradeName, new Set());
      }

      studentIdsByGrade.get(gradeName).add(studentKey);
    });

  return Array.from(studentIdsByGrade.entries())
    .map(([grade, studentIds]) => ({
      grade,
      count: studentIds.size,
    }))
    .sort((firstGrade, secondGrade) =>
      sortGradeLevels({ grade_name: firstGrade.grade }, { grade_name: secondGrade.grade }),
    );
}

function buildEnrollmentBySchoolYearAndGrade(enrollments, schoolYears, gradeLevels) {
  const sortedSchoolYears = [...schoolYears].sort(sortSchoolYears);
  const sortedGradeLevels = [...gradeLevels].sort(sortGradeLevels);
  const gradeNames = new Map(
    sortedGradeLevels.map((gradeLevel) => [gradeLevel.id, gradeLevel.grade_name]),
  );
  const studentIdsBySchoolYear = new Map(
    sortedSchoolYears.map((schoolYear) => [
      schoolYear.id,
      new Map(sortedGradeLevels.map((gradeLevel) => [gradeLevel.grade_name, new Set()])),
    ]),
  );

  enrollments
    .filter((enrollment) => enrollment.enrollment_status === 'enrolled')
    .forEach((enrollment) => {
      const gradeName = gradeNames.get(enrollment.grade_level_id);
      const gradeTotals = studentIdsBySchoolYear.get(enrollment.school_year_id);

      if (gradeName && gradeTotals?.has(gradeName)) {
        gradeTotals.get(gradeName).add(enrollment.student_id || enrollment.id);
      }
    });

  const data = sortedSchoolYears.map((schoolYear) => {
    const gradeTotals = studentIdsBySchoolYear.get(schoolYear.id);

    return {
      schoolYear: schoolYear.school_year,
      ...Object.fromEntries(
        sortedGradeLevels.map((gradeLevel) => [
          gradeLevel.grade_name,
          gradeTotals?.get(gradeLevel.grade_name)?.size || 0,
        ]),
      ),
    };
  });
  const series = sortedGradeLevels
    .map((gradeLevel) => gradeLevel.grade_name)
    .filter((gradeName) => data.some((schoolYear) => schoolYear[gradeName] > 0));

  return { data, series };
}

function SummaryCard({ title, value, helperText, icon: Icon }) {
  return (
    <article className="rounded-lg border border-[#d9e3f5] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-[#132a63]">{value}</p>
        </div>

        <div className="rounded-md bg-[#fff7df] p-2 text-[#b77900]">
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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-[#d9e3f5] bg-white px-3 py-2 text-xs shadow-lg shadow-slate-950/10">
      <p className="mb-2 font-semibold text-[#132a63]">
        {label || payload[0]?.name || 'Students'}
      </p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.payload?.fill }}
              />
              {item.name}
            </span>
            <span className="font-bold text-slate-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { profile } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    enrollments: [],
    gradeLevels: [],
    schoolYears: [],
  });
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [enrollmentsResult, gradeLevelsResult, schoolYearsResult] = await Promise.all([
          supabase
            .from('enrollments')
            .select('id, student_id, school_year_id, grade_level_id, enrollment_status'),
          supabase.from('grade_levels').select('id, grade_name').order('grade_name'),
          supabase.from('school_years').select('id, school_year, status').order('school_year'),
        ]);

        const queryError =
          enrollmentsResult.error || gradeLevelsResult.error || schoolYearsResult.error;

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setDashboardData({
            enrollments: enrollmentsResult.data || [],
            gradeLevels: gradeLevelsResult.data || [],
            schoolYears: schoolYearsResult.data || [],
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
    const pendingEnrollments = dashboardData.enrollments.filter(
      (enrollment) => enrollment.enrollment_status === 'pending',
    );

    return {
      totalEnrolledStudents: enrolledStudentIds.size,
      pendingEnrollments: pendingEnrollments.length,
      totalEnrollmentRecords: dashboardData.enrollments.length,
      totalGradeLevels: dashboardData.gradeLevels.length,
    };
  }, [dashboardData]);

  const dashboardSchoolYearId = useMemo(
    () => getDashboardSchoolYearId(dashboardData.schoolYears),
    [dashboardData.schoolYears],
  );

  const selectedDashboardSchoolYearId = selectedSchoolYearId || dashboardSchoolYearId;

  const dashboardSchoolYearLabel = useMemo(
    () => getDashboardSchoolYearLabel(dashboardData.schoolYears, selectedDashboardSchoolYearId),
    [dashboardData.schoolYears, selectedDashboardSchoolYearId],
  );

  const enrollmentByGrade = useMemo(
    () =>
      buildEnrollmentByGrade(
        dashboardData.enrollments,
        dashboardData.gradeLevels,
        selectedDashboardSchoolYearId,
      ),
    [dashboardData.enrollments, dashboardData.gradeLevels, selectedDashboardSchoolYearId],
  );

  const enrollmentByGradeTotal = useMemo(
    () => enrollmentByGrade.reduce((total, grade) => total + grade.count, 0),
    [enrollmentByGrade],
  );

  const enrollmentBySchoolYearAndGrade = useMemo(
    () =>
      buildEnrollmentBySchoolYearAndGrade(
        dashboardData.enrollments,
        dashboardData.schoolYears,
        dashboardData.gradeLevels,
      ),
    [dashboardData.enrollments, dashboardData.gradeLevels, dashboardData.schoolYears],
  );

  return (
    <div className="space-y-6">
      <NotificationToast
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage('')}
      />

      <section className="overflow-hidden rounded-lg bg-gradient-to-r from-[#1f3f93] via-[#2655c7] to-[#3678ee] px-5 py-6 text-white shadow-xl shadow-blue-950/20 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-[#f5bb2e]">Welcome back,</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {profile?.full_name || 'System Administrator'}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Manage pupil enrollment activity and student records for the current school year.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-[#d9e3f5] bg-white p-6 text-sm text-slate-600">
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
              title="Pending Enrollments"
              value={dashboardSummary.pendingEnrollments}
              helperText="Enrollment records awaiting completion"
              icon={UserPlus}
            />
            <SummaryCard
              title="Enrollment Records"
              value={dashboardSummary.totalEnrollmentRecords}
              helperText="Total enrollment records in the system"
              icon={ClipboardList}
            />
            <SummaryCard
              title="Grade Levels"
              value={dashboardSummary.totalGradeLevels}
              helperText="Configured grade levels"
              icon={UsersRound}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-[#d9e3f5] bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#132a63]">
                    Student Count by Grade Level
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Enrolled students grouped by grade level for {dashboardSchoolYearLabel}.
                  </p>
                </div>

                <select
                  value={selectedDashboardSchoolYearId}
                  onChange={(event) => setSelectedSchoolYearId(event.target.value)}
                  className="w-full rounded-md border border-[#d9e3f5] bg-white px-3 py-2 text-sm font-semibold text-[#132a63] outline-none focus:border-[#1f3f93] focus:ring-2 focus:ring-blue-100 sm:w-44"
                  aria-label="Pie chart school year"
                >
                  {[...dashboardData.schoolYears]
                    .sort(sortSchoolYears)
                    .map((schoolYear) => (
                      <option key={schoolYear.id} value={schoolYear.id}>
                        {schoolYear.school_year}
                      </option>
                    ))}
                </select>
              </div>

              {enrollmentByGrade.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.8fr)]">
                  <div className="relative h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={enrollmentByGrade}
                          dataKey="count"
                          nameKey="grade"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={96}
                          paddingAngle={2}
                        >
                          {enrollmentByGrade.map((entry, index) => (
                            <Cell
                              key={entry.grade}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#132a63]">
                          {enrollmentByGradeTotal}
                        </p>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Enrolled
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-slate-50 p-3">
                    {enrollmentByGrade.map((grade, index) => (
                      <div
                        key={grade.grade}
                        className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 text-slate-700">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <span className="truncate">{grade.grade}</span>
                        </span>
                        <span className="font-bold text-[#132a63]">{grade.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState message="No enrolled students to summarize yet." />
              )}
            </div>

            <div className="rounded-lg border border-[#d9e3f5] bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-[#132a63]">
                  Enrolled Students by School Year and Grade Level
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Grade-level enrollment trends across all school years, including inactive years.
                </p>
              </div>

              {enrollmentBySchoolYearAndGrade.data.length > 0 &&
              enrollmentBySchoolYearAndGrade.series.length > 0 ? (
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={enrollmentBySchoolYearAndGrade.data}
                        margin={{ top: 12, right: 8, bottom: 0, left: -8 }}
                      >
                        <CartesianGrid stroke="#e7edf8" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="schoolYear"
                          height={24}
                          interval={0}
                          minTickGap={0}
                          padding={{ left: 0, right: 0 }}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickMargin={4}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          domain={[7, 18]}
                          ticks={Array.from({ length: 12 }, (_, index) => index + 7)}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        {enrollmentBySchoolYearAndGrade.series.map((gradeName) => {
                          const colorIndex = enrollmentBySchoolYearAndGrade.series.indexOf(gradeName);

                          return (
                            <Line
                              key={gradeName}
                              type="monotone"
                              dataKey={gradeName}
                              stroke={chartColors[colorIndex % chartColors.length]}
                              strokeWidth={2.75}
                              dot={{ r: 3, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="No school years to summarize yet." />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
