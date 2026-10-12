import { fetchAllRows } from '../../lib/fetchAllRows.js';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GraduationCap, Layers, UserPlus, UsersRound } from 'lucide-react';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';

const brandNavy = '#1f3f93';
const brandInk = '#132a63';
const mutedBarColor = '#c9d6f0';

// Grades are ordered, so slices step from light to dark navy (Nursery to Grade VI).
const gradeShadeStart = [159, 184, 232];
const gradeShadeEnd = [19, 42, 99];

function getGradeShade(index, count) {
  const progress = count > 1 ? index / (count - 1) : 1;
  const channels = gradeShadeStart.map((start, channelIndex) =>
    Math.round(start + (gradeShadeEnd[channelIndex] - start) * progress),
  );

  return `rgb(${channels.join(', ')})`;
}
const axisTick = { fontSize: 12, fill: '#64748b' };

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
  // Seed every configured grade so empty grades still show as zero.
  const studentIdsByGrade = new Map(
    gradeLevels.map((gradeLevel) => [gradeLevel.grade_name, new Set()]),
  );

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
  const allStudentIdsBySchoolYear = new Map(
    sortedSchoolYears.map((schoolYear) => [schoolYear.id, new Set()]),
  );

  enrollments
    .filter((enrollment) => enrollment.enrollment_status === 'enrolled')
    .forEach((enrollment) => {
      const studentKey = enrollment.student_id || enrollment.id;
      const gradeName = gradeNames.get(enrollment.grade_level_id);
      const gradeTotals = studentIdsBySchoolYear.get(enrollment.school_year_id);

      allStudentIdsBySchoolYear.get(enrollment.school_year_id)?.add(studentKey);

      if (gradeName && gradeTotals?.has(gradeName)) {
        gradeTotals.get(gradeName).add(studentKey);
      }
    });

  const data = sortedSchoolYears.map((schoolYear) => {
    const gradeTotals = studentIdsBySchoolYear.get(schoolYear.id);

    return {
      id: schoolYear.id,
      schoolYear: schoolYear.school_year,
      total: allStudentIdsBySchoolYear.get(schoolYear.id)?.size || 0,
      grades: Object.fromEntries(
        sortedGradeLevels.map((gradeLevel) => [
          gradeLevel.grade_name,
          gradeTotals?.get(gradeLevel.grade_name)?.size || 0,
        ]),
      ),
    };
  });
  const series = sortedGradeLevels
    .map((gradeLevel) => gradeLevel.grade_name)
    .filter((gradeName) => data.some((schoolYear) => schoolYear.grades[gradeName] > 0));

  return { data, series };
}

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function pluralize(count, word) {
  return `${formatCount(count)} ${word}${count === 1 ? '' : 's'}`;
}

// Sequential single-hue scale: pale navy for few students, full navy for the most.
function getHeatCellStyle(value, maxValue) {
  if (!value) {
    return { backgroundColor: '#f8fafc', color: '#94a3b8' };
  }

  const intensity = maxValue > 0 ? value / maxValue : 0;
  const mix = Math.round(12 + intensity * 78);

  return {
    backgroundColor: `color-mix(in oklab, ${brandNavy} ${mix}%, #ffffff)`,
    color: mix > 50 ? '#ffffff' : brandInk,
  };
}

function SummaryCard({ title, value, icon: Icon, footer }) {
  return (
    <article className="flex flex-col rounded-lg border border-[#d9e3f5] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-md bg-[#fff7df] p-2 text-[#b77900]">
          <Icon aria-hidden="true" size={20} />
        </div>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#132a63]">
        {formatCount(value)}
      </p>
      {footer ? (
        <div className="mt-auto pt-3">
          <div className="border-t border-slate-100 pt-3 text-sm text-slate-500">{footer}</div>
        </div>
      ) : null}
    </article>
  );
}

function Panel({ title, description, aside, className = '', children }) {
  return (
    <section
      className={['rounded-lg border border-[#d9e3f5] bg-white p-5 shadow-sm', className].join(' ')}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#132a63]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const count = payload[0].value;

  return (
    <div className="rounded-md border border-[#d9e3f5] bg-white px-3 py-2 text-xs shadow-lg shadow-slate-950/10">
      <p className="font-semibold text-[#132a63]">{label || payload[0].name}</p>
      <p className="mt-0.5 text-slate-600">{pluralize(count, 'student')} enrolled</p>
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
          fetchAllRows(() => supabase
            .from('enrollments')
            .select('id, student_id, school_year_id, grade_level_id, enrollment_status')),
          fetchAllRows(() => supabase.from('grade_levels').select('id, grade_name').order('grade_name')),
          fetchAllRows(() => supabase.from('school_years').select('id, school_year, status').order('school_year')),
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

  const dashboardSchoolYearId = useMemo(
    () => getDashboardSchoolYearId(dashboardData.schoolYears),
    [dashboardData.schoolYears],
  );

  const selectedDashboardSchoolYearId = selectedSchoolYearId || dashboardSchoolYearId;

  const dashboardSchoolYearLabel = useMemo(
    () => getDashboardSchoolYearLabel(dashboardData.schoolYears, selectedDashboardSchoolYearId),
    [dashboardData.schoolYears, selectedDashboardSchoolYearId],
  );

  const sortedSchoolYears = useMemo(
    () => [...dashboardData.schoolYears].sort(sortSchoolYears),
    [dashboardData.schoolYears],
  );

  const sortedGradeLevels = useMemo(
    () => [...dashboardData.gradeLevels].sort(sortGradeLevels),
    [dashboardData.gradeLevels],
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

  const enrollmentBySchoolYearAndGrade = useMemo(
    () =>
      buildEnrollmentBySchoolYearAndGrade(
        dashboardData.enrollments,
        dashboardData.schoolYears,
        dashboardData.gradeLevels,
      ),
    [dashboardData.enrollments, dashboardData.gradeLevels, dashboardData.schoolYears],
  );

  const dashboardSummary = useMemo(() => {
    const yearRows = enrollmentBySchoolYearAndGrade.data;
    const selectedIndex = yearRows.findIndex((row) => row.id === selectedDashboardSchoolYearId);
    const selectedYear = yearRows[selectedIndex];
    const previousYear = selectedIndex > 0 ? yearRows[selectedIndex - 1] : null;
    const studentsOnRecord = new Set(
      dashboardData.enrollments
        .filter((enrollment) => enrollment.enrollment_status === 'enrolled')
        .map((enrollment) => enrollment.student_id)
        .filter(Boolean),
    );

    return {
      enrolledThisYear: selectedYear?.total || 0,
      previousYear,
      pendingEnrollments: dashboardData.enrollments.filter(
        (enrollment) => enrollment.enrollment_status === 'pending',
      ).length,
      studentsOnRecord: studentsOnRecord.size,
      firstSchoolYear: yearRows.find((row) => row.total > 0)?.schoolYear,
    };
  }, [dashboardData.enrollments, enrollmentBySchoolYearAndGrade, selectedDashboardSchoolYearId]);

  const enrollmentByGradeTotal = enrollmentByGrade.reduce((total, grade) => total + grade.count, 0);
  const heatmapMax = Math.max(
    0,
    ...enrollmentBySchoolYearAndGrade.data.flatMap((row) => Object.values(row.grades)),
  );
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const renderEnrolledFooter = () => {
    const { previousYear, enrolledThisYear } = dashboardSummary;

    if (!previousYear) {
      return 'No earlier school year to compare';
    }

    const difference = enrolledThisYear - previousYear.total;

    if (difference === 0) {
      return `Same as ${previousYear.schoolYear}`;
    }

    return `${formatCount(Math.abs(difference))} ${difference > 0 ? 'more' : 'fewer'} than ${previousYear.schoolYear}`;
  };

  return (
    <div className="space-y-6">
      <NotificationToast
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage('')}
      />

      <section className="flex flex-col gap-5 rounded-lg bg-[#1f3f93] px-5 py-6 text-white shadow-lg shadow-blue-950/15 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#f5bb2e]">Welcome back,</p>
          <h3 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {profile?.full_name || 'System Administrator'}
          </h3>
          <p className="mt-1 text-sm text-blue-100">{todayLabel}</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-blue-100 sm:w-48">
          School year
          <select
            value={selectedDashboardSchoolYearId}
            onChange={(event) => setSelectedSchoolYearId(event.target.value)}
            disabled={loading || sortedSchoolYears.length === 0}
            className="w-full rounded-md border bg-white px-3 py-2 text-sm font-semibold text-[#132a63] outline-none focus-visible:ring-2 focus-visible:ring-[#f5bb2e] disabled:opacity-60"
          >
            {sortedSchoolYears.map((schoolYear) => (
              <option key={schoolYear.id} value={schoolYear.id}>
                {schoolYear.school_year}
                {schoolYear.status === 'active' ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <div className="rounded-lg border border-[#d9e3f5] bg-white p-6 text-sm text-slate-600">
          Loading dashboard data...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title={`Enrolled in ${dashboardSchoolYearLabel}`}
              value={dashboardSummary.enrolledThisYear}
              icon={GraduationCap}
              footer={renderEnrolledFooter()}
            />
            <SummaryCard
              title="Pending enrollments"
              value={dashboardSummary.pendingEnrollments}
              icon={UserPlus}
              footer={
                dashboardSummary.pendingEnrollments > 0 ? (
                  <Link
                    to="/enrollment"
                    className="font-semibold text-[#1f3f93] underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    Review pending enrollments
                  </Link>
                ) : (
                  'Nothing waiting for review'
                )
              }
            />
            <SummaryCard
              title="Students on record"
              value={dashboardSummary.studentsOnRecord}
              icon={UsersRound}
              footer={
                dashboardSummary.firstSchoolYear
                  ? `Enrolled at least once since ${dashboardSummary.firstSchoolYear}`
                  : 'No enrolled students yet'
              }
            />
            <SummaryCard
              title="Grade levels"
              value={sortedGradeLevels.length}
              icon={Layers}
              footer={
                sortedGradeLevels.length > 1
                  ? `${sortedGradeLevels[0].grade_name} to ${sortedGradeLevels.at(-1).grade_name}`
                  : 'Add grade levels in Settings'
              }
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Students by grade level"
              description={`Enrolled students in ${dashboardSchoolYearLabel}`}
            >
              {enrollmentByGradeTotal > 0 ? (
                <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.9fr)]">
                  <div className="relative h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={enrollmentByGrade}
                          dataKey="count"
                          nameKey="grade"
                          innerRadius="58%"
                          outerRadius="92%"
                          startAngle={90}
                          endAngle={-270}
                          stroke="#ffffff"
                          strokeWidth={2}
                          isAnimationActive={false}
                        >
                          {enrollmentByGrade.map((entry, index) => (
                            <Cell
                              key={entry.grade}
                              fill={getGradeShade(index, enrollmentByGrade.length)}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CountTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tabular-nums text-[#132a63]">
                        {formatCount(enrollmentByGradeTotal)}
                      </span>
                      <span className="text-sm text-slate-500">students</span>
                    </div>
                  </div>

                  <ul className="space-y-1 text-sm">
                    {enrollmentByGrade.map((entry, index) => (
                      <li
                        key={entry.grade}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-slate-50"
                      >
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: getGradeShade(index, enrollmentByGrade.length) }}
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-700">{entry.grade}</span>
                        <span className="font-semibold tabular-nums text-[#132a63]">
                          {formatCount(entry.count)}
                        </span>
                        <span className="w-10 text-right tabular-nums text-slate-500">
                          {Math.round((entry.count / enrollmentByGradeTotal) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState message={`No students enrolled in ${dashboardSchoolYearLabel} yet.`} />
              )}
            </Panel>

            <Panel
              title="Enrollment by school year"
              description="Students enrolled each year. Select a bar to view that year."
            >
              {enrollmentBySchoolYearAndGrade.data.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={enrollmentBySchoolYearAndGrade.data}
                      margin={{ top: 20, right: 8, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid stroke="#e7edf8" vertical={false} />
                      <XAxis
                        dataKey="schoolYear"
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#d9e3f5' }}
                        tick={axisTick}
                        tickMargin={6}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                      <Tooltip cursor={{ fill: '#f1f5fb' }} content={<CountTooltip />} />
                      <Bar
                        dataKey="total"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                        isAnimationActive={false}
                        cursor="pointer"
                        onClick={(_, index) =>
                          setSelectedSchoolYearId(enrollmentBySchoolYearAndGrade.data[index]?.id || '')
                        }
                      >
                        {enrollmentBySchoolYearAndGrade.data.map((row) => (
                          <Cell
                            key={row.id}
                            fill={row.id === selectedDashboardSchoolYearId ? brandNavy : mutedBarColor}
                          />
                        ))}
                        <LabelList
                          dataKey="total"
                          position="top"
                          offset={6}
                          style={{ fontSize: 12, fontWeight: 600, fill: brandInk }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="Add a school year in Settings to see enrollment over time." />
              )}
            </Panel>
          </section>

          <Panel
            title="Grade levels across school years"
            description="Enrolled students per grade. Darker cells mean more students."
          >
            {enrollmentBySchoolYearAndGrade.series.length > 0 ? (
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[36rem] border-separate border-spacing-0.5 text-sm">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-500"
                      >
                        Grade level
                      </th>
                      {enrollmentBySchoolYearAndGrade.data.map((row) => {
                        const isSelected = row.id === selectedDashboardSchoolYearId;

                        return (
                          <th
                            key={row.id}
                            scope="col"
                            className={[
                              'whitespace-nowrap border-b-2 px-2 py-2 text-center',
                              isSelected
                                ? 'border-[#f5bb2e] font-semibold text-[#132a63]'
                                : 'border-transparent font-medium text-slate-500',
                            ].join(' ')}
                          >
                            {row.schoolYear}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentBySchoolYearAndGrade.series.map((gradeName) => (
                      <tr key={gradeName}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left font-medium text-slate-700"
                        >
                          {gradeName}
                        </th>
                        {enrollmentBySchoolYearAndGrade.data.map((row) => {
                          const value = row.grades[gradeName];

                          return (
                            <td
                              key={row.id}
                              title={`${gradeName}, ${row.schoolYear}: ${pluralize(value, 'student')}`}
                              className="h-9 min-w-16 rounded px-2 text-center font-semibold tabular-nums"
                              style={getHeatCellStyle(value, heatmapMax)}
                            >
                              {value || '–'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white px-3 pb-1 pt-3 text-left font-semibold text-[#132a63]"
                      >
                        Total
                      </th>
                      {enrollmentBySchoolYearAndGrade.data.map((row) => (
                        <td
                          key={row.id}
                          className="px-2 pb-1 pt-3 text-center font-bold tabular-nums text-[#132a63]"
                        >
                          {formatCount(row.total)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No enrolled students to summarize yet." />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
