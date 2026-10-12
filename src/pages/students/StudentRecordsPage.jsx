import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionTabs from '../../components/ui/SectionTabs.jsx';
import StudentsPage from './StudentsPage.jsx';

export default function StudentRecordsPage({ graduatedOnly = false }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Student records" description="View student details, update contact information, and find graduates. Register new students in Enrolment." />
      <SectionTabs label="Student records views" items={[{ label: 'Students', path: '/students' }, { label: 'Graduated students', path: '/students/graduated' }]} />
      <StudentsPage embedded graduatedOnly={graduatedOnly} />
    </div>
  );
}
