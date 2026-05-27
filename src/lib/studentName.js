export function getMiddleInitial(middleName) {
  const trimmedMiddleName = String(middleName || '').trim();

  return trimmedMiddleName ? `${trimmedMiddleName.charAt(0).toUpperCase()}.` : '';
}

export function formatStudentName(student) {
  if (!student) {
    return 'Unknown student';
  }

  const lastName = String(student.last_name || '').trim();
  const firstName = String(student.first_name || '').trim();
  const middleInitial = getMiddleInitial(student.middle_name);
  const givenName = [firstName, middleInitial].filter(Boolean).join(' ');

  if (lastName && givenName) {
    return `${lastName}, ${givenName}`;
  }

  return lastName || givenName || 'Unknown student';
}

export function getStudentSortKey(student) {
  return [
    student?.last_name,
    student?.first_name,
    student?.middle_name,
    student?.lrn,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .join(' ');
}

export function sortStudentsByName(students) {
  return [...students].sort((firstStudent, secondStudent) =>
    getStudentSortKey(firstStudent).localeCompare(getStudentSortKey(secondStudent)),
  );
}
