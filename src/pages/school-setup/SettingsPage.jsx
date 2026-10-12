import SectionTabs from '../../components/ui/SectionTabs.jsx';
import SchoolSetupPage from './SchoolSetupPage.jsx';
import UserAccountsPage from './UserAccountsPage.jsx';

const settingsTabs = [
  { label: 'School setup', path: '/settings' },
  { label: 'User accounts', path: '/settings/users' },
];

export default function SettingsPage({ section = 'setup' }) {
  const tabs = <SectionTabs label="Settings views" items={settingsTabs} />;

  return section === 'users' ? <UserAccountsPage tabs={tabs} /> : <SchoolSetupPage tabs={tabs} />;
}
