import { createClient } from '@supabase/supabase-js';
import { Edit, Plus, Power, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import NotificationToast from '../../components/ui/NotificationToast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase.js';

const emptyForm = {
  user_id: '',
  email: '',
  password: '',
  confirm_password: '',
  full_name: '',
  role: 'staff',
  status: 'active',
};

function createIsolatedAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function isFunctionUnavailableError(error) {
  return (
    error?.name === 'FunctionsFetchError' ||
    error?.name === 'FunctionsRelayError' ||
    (error?.name === 'FunctionsHttpError' && error?.context?.status === 404)
  );
}

async function getFunctionErrorMessage(error) {
  let message = error.message;

  if (error.context && typeof error.context.clone === 'function') {
    try {
      const errorBody = await error.context.clone().json();
      message = errorBody.error || errorBody.message || message;
    } catch {
      message = error.message;
    }
  }

  return message;
}

function StatusBadge({ status }) {
  const isActive = status === 'active';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize',
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {status || 'inactive'}
    </span>
  );
}

function StaffFormModal({
  isOpen,
  mode,
  formData,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {mode === 'edit' ? 'Edit Staff Profile' : 'Create Staff Account'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'edit'
                ? 'Update this account profile and access status.'
                : 'Create a login account and staff profile in one step.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close staff form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          {mode === 'edit' ? (
            <label className="block text-sm font-medium text-slate-700">
              Auth User ID
              <input
                type="text"
                name="user_id"
                value={formData.user_id}
                onChange={onChange}
                disabled
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Email Address
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  required
                  autoComplete="off"
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Temporary Password
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={onChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Full Name
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={onChange}
              required
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select
                name="role"
                value={formData.role}
                onChange={onChange}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                value={formData.status}
                onChange={onChange}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving
                ? 'Saving...'
                : mode === 'edit'
                  ? 'Save Profile'
                  : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffManagementPage() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, role, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setProfiles([]);
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openAddModal = () => {
    setFormMode('add');
    setSelectedProfile(null);
    setFormData(emptyForm);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const openEditModal = (staffProfile) => {
    setFormMode('edit');
    setSelectedProfile(staffProfile);
    setFormData({
      user_id: staffProfile.user_id || '',
      email: '',
      password: '',
      confirm_password: '',
      full_name: staffProfile.full_name || '',
      role: staffProfile.role || 'staff',
      status: staffProfile.status || 'active',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setSelectedProfile(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (formMode === 'edit' && !formData.user_id.trim()) {
      return 'Auth User ID is required.';
    }

    if (formMode === 'add') {
      if (!formData.email.trim()) {
        return 'Email address is required.';
      }

      if (!formData.email.includes('@')) {
        return 'Enter a valid email address.';
      }

      if (formData.password.length < 6) {
        return 'Temporary password must be at least 6 characters.';
      }

      if (formData.password !== formData.confirm_password) {
        return 'Passwords do not match.';
      }
    }

    if (!formData.full_name.trim()) {
      return 'Full name is required.';
    }

    if (!['admin', 'staff'].includes(formData.role)) {
      return 'Role must be admin or staff.';
    }

    if (!['active', 'inactive'].includes(formData.status)) {
      return 'Status must be active or inactive.';
    }

    return '';
  };

  const checkDuplicateProfile = async (userId) => {
    let query = supabase.from('profiles').select('id').eq('user_id', userId);

    if (selectedProfile?.id) {
      query = query.neq('id', selectedProfile.id);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  };

  const createAccountWithSignUpFallback = async (payload) => {
    const signUpClient = createIsolatedAuthClient();
    const { data, error } = await signUpClient.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          role: payload.role,
        },
      },
    });

    await signUpClient.auth.signOut();

    if (error) {
      throw new Error(
        `Unable to create the login account. Deploy the create-staff-account Edge Function, or enable email sign-ups in Supabase Auth. ${error.message}`,
      );
    }

    const createdUserId = data.user?.id;

    if (!createdUserId) {
      throw new Error('Supabase did not return a user ID for the new staff account.');
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('This email address is already registered.');
    }

    const duplicateExists = await checkDuplicateProfile(createdUserId);

    if (duplicateExists) {
      throw new Error('A profile is already linked to this login account.');
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: createdUserId,
      full_name: payload.full_name,
      role: payload.role,
      status: payload.status,
    });

    if (profileError) {
      throw new Error(
        `The login account was created, but the profile could not be linked: ${profileError.message}`,
      );
    }

    return createdUserId;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);

    try {
      let accountCreatedWithSignUpFallback = false;
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        role: formData.role,
        status: formData.status,
      };

      if (formMode === 'edit' && selectedProfile) {
        const duplicateExists = await checkDuplicateProfile(formData.user_id.trim());

        if (duplicateExists) {
          throw new Error('A profile is already linked to this Auth User ID.');
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: payload.full_name,
            role: payload.role,
            status: payload.status,
          })
          .eq('id', selectedProfile.id);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase.functions.invoke('create-staff-account', {
          body: payload,
        });

        if (error) {
          if (isFunctionUnavailableError(error)) {
            await createAccountWithSignUpFallback(payload);
            accountCreatedWithSignUpFallback = true;
          } else {
            throw new Error(await getFunctionErrorMessage(error));
          }
        } else if (!data?.user_id) {
          throw new Error('Account was created, but no user ID was returned.');
        }
      }

      setSuccessMessage(
        formMode === 'edit'
          ? 'Staff profile updated successfully.'
          : accountCreatedWithSignUpFallback
            ? 'Staff account created. This Supabase project requires email confirmation, so the staff member must confirm their email or an admin must confirm it in Supabase before login.'
          : 'Staff account created successfully.',
      );
      setIsFormOpen(false);
      setSelectedProfile(null);
      await fetchProfiles();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save staff profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (staffProfile) => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const nextStatus = staffProfile.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: nextStatus })
        .eq('id', staffProfile.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(`Account marked as ${nextStatus}.`);
      await fetchProfiles();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update account status.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestToggleStatus = (staffProfile) => {
    const nextStatus = staffProfile.status === 'active' ? 'inactive' : 'active';
    setPendingStatusChange({ staffProfile, nextStatus });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const confirmToggleStatus = async () => {
    if (!pendingStatusChange) {
      return;
    }

    await toggleStatus(pendingStatusChange.staffProfile);
    setPendingStatusChange(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        title="Staff Management"
        description="Manage profile roles and access status for OLGTPS admin and staff accounts."
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={16} />
            Create Staff Account
          </button>
        }
      />

      <NotificationToast
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage('')}
        onDismissError={() => setErrorMessage('')}
      />

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading staff accounts...
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No staff profiles found.
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Auth User ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((staffProfile) => {
                  const isCurrentUser = staffProfile.id === profile?.id;

                  return (
                    <tr key={staffProfile.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {staffProfile.full_name || 'Unnamed user'}
                        {isCurrentUser ? (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {staffProfile.user_id}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {staffProfile.role}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={staffProfile.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(staffProfile)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestToggleStatus(staffProfile)}
                            disabled={isSaving || isCurrentUser}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Power size={14} />
                            {staffProfile.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StaffFormModal
        isOpen={isFormOpen}
        mode={formMode}
        formData={formData}
        isSaving={isSaving}
        onChange={handleChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingStatusChange)}
        title={`${pendingStatusChange?.nextStatus === 'active' ? 'Activate' : 'Deactivate'} account?`}
        message={`This will mark "${pendingStatusChange?.staffProfile?.full_name || 'this staff account'}" as ${pendingStatusChange?.nextStatus}.`}
        confirmLabel={pendingStatusChange?.nextStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={pendingStatusChange?.nextStatus === 'inactive' ? 'danger' : 'default'}
        isProcessing={isSaving}
        onConfirm={confirmToggleStatus}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}

export default StaffManagementPage;
