import React, { useState } from 'react';
import type { UserProfile, DatabaseBackupRecord, UserRole, AuditLogItem } from '../types/expense';
import { getErrorMessage } from '../lib/errors';
import { UserPlus, Edit2, Trash2, Check, X, Database, RefreshCw, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface AdminSectionProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  onRefreshUsers: () => void;
  onOpenAddModalWithCategory?: (category: string) => void;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  users,
  currentUser,
  onRefreshUsers,
  onOpenAddModalWithCategory,
}) => {
  // User Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('MEMBER');

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MEMBER');

  // Database Backup State
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Activity log state
  const [auditEntries, setAuditEntries] = useState<AuditLogItem[]>([]);

  // Tally Agent answer cache
  const [kbCount, setKbCount] = useState<number | null>(null);
  const [isClearingKb, setIsClearingKb] = useState(false);

  // Sub-tabs in Admin
  const [adminTab, setAdminTab] = useState<'users' | 'family-costs' | 'database' | 'activity'>('users');

  // Fetch Backups
  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();
      if (data.status === 'ok') {
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const res = await fetch('/api/admin/audit-log');
      const data = await res.json();
      if (data.status === 'ok') {
        setAuditEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to load activity log:', err);
    }
  };

  const fetchKbCount = async () => {
    try {
      const res = await fetch('/api/assistant/kb');
      const data = await res.json();
      if (data.status === 'ok') setKbCount(data.count ?? 0);
    } catch (err) {
      console.error('Failed to load assistant cache size:', err);
    }
  };

  const handleClearKb = async () => {
    if (!window.confirm('Clear the Tally Agent’s cached answers for this household? Its next few "how do I" answers will be a little slower while it rebuilds. Nothing about your own money is affected.')) return;
    setIsClearingKb(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/assistant/kb', { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'ok') {
        setKbCount(0);
        setStatusMessage(`Cleared ${data.cleared} cached answer${data.cleared === 1 ? '' : 's'}.`);
      } else {
        setErrorMessage(data.message || 'Could not clear the cache.');
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Could not clear the cache.'));
    } finally {
      setIsClearingKb(false);
    }
  };

  React.useEffect(() => {
    fetchBackups();
    fetchAuditLog();
    fetchKbCount();
  }, []);

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage(data.message || `Added user "${data.user.name}" successfully.`);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole('MEMBER');
        setIsAddingUser(false);
        onRefreshUsers();
      } else {
        setErrorMessage(data.message || 'Failed to add user');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to add user'));
    }
  };

  // Handle Edit User
  const handleSaveEditUser = async (id: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
        }),
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage(`Updated user "${data.user.name}".`);
        setEditingUserId(null);
        onRefreshUsers();
      } else {
        setErrorMessage(data.message || 'Failed to update user');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to update user'));
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Delete user "${name}" from household accounts?`)) return;

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage(`Removed user "${name}".`);
        onRefreshUsers();
      } else {
        setErrorMessage(data.message || 'Failed to delete user');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to delete user'));
    }
  };

  // Create Backup Snapshot
  const handleCreateSnapshot = async () => {
    setIsBackupLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdById: currentUser?.id,
          notes: `Manual snapshot by ${currentUser?.name || 'Admin'} on ${new Date().toLocaleDateString('en-GB')}`,
        }),
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage(`Cloud database snapshot created with ${data.backup.recordCount} records.`);
        fetchBackups();
      } else {
        setErrorMessage(data.message || 'Snapshot failed');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Snapshot failed'));
    } finally {
      setIsBackupLoading(false);
    }
  };

  // Restore Backup Snapshot
  const handleRestoreSnapshot = async (backup: DatabaseBackupRecord) => {
    const warning =
      `Restore the snapshot from ${new Date(backup.createdAt).toLocaleString()} (${backup.recordCount} records)?\n\n` +
      `This replaces every current account, goal, bill, income record and transfer with what’s in that snapshot — anything added or changed since then is permanently lost. This can’t be undone.`;
    if (!window.confirm(warning)) {
      return;
    }

    setIsBackupLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: backup.id }),
      });

      const data = await res.json();
      if (data.status === 'ok') {
        const b = data.breakdown as { accounts: number; goals: number; expenses: number; incomes: number; transfers: number } | undefined;
        setStatusMessage(
          b
            ? `Restored ${data.restoredCount} records — ${b.accounts} accounts, ${b.goals} goals, ${b.expenses} bills, ${b.incomes} income, ${b.transfers} transfers.`
            : `Restored ${data.restoredCount} database records.`
        );
        onRefreshUsers();
      } else {
        setErrorMessage(data.message || 'Restore failed');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Restore failed'));
    } finally {
      setIsBackupLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Admin Header */}
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">
                Household Administration
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Admin Control Panel
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '650px', marginTop: '0.25rem' }}>
              Configure household accounts (Stephen, Wife / Partner, children), manage colleges & sports categories, and trigger database snapshots.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setAdminTab('users')}
              className={adminTab === 'users' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem' }}
            >
              Household Users ({users.length})
            </button>

            <button
              onClick={() => setAdminTab('family-costs')}
              className={adminTab === 'family-costs' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem' }}
            >
              Colleges & Sports Setup
            </button>

            <button
              onClick={() => setAdminTab('database')}
              className={adminTab === 'database' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem' }}
            >
              Database Snapshots
            </button>

            <button
              onClick={() => setAdminTab('activity')}
              className={adminTab === 'activity' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem' }}
            >
              Recent activity
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div style={{
          backgroundColor: 'var(--ha-lime-tint)',
          border: '1px solid var(--ha-lime)',
          borderRadius: 'var(--ha-radius-sm)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--ha-ink)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}>
          <CheckCircle2 size={17} color="var(--ha-ink)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          backgroundColor: 'var(--ha-red-tint)',
          border: '1px solid var(--ha-red)',
          borderRadius: 'var(--ha-radius-sm)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--ha-red)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}>
          <AlertCircle size={17} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: USERS SETUP */}
      {adminTab === 'users' && (
        <div className="ha-card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--ha-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                Household Member Accounts
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                Set up, edit and assign permissions for family members and admin backup accounts.
              </p>
            </div>

            {!isAddingUser && (
              <button
                onClick={() => setIsAddingUser(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem' }}
              >
                <UserPlus size={15} />
                <span>Add household user</span>
              </button>
            )}
          </div>

          {/* Add User Inline Form */}
          {isAddingUser && (
            <form onSubmit={handleCreateUser} style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#fafaf7',
              borderBottom: '1px solid var(--ha-line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                New Household Account
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah, Kid 1, Accountant"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="ha-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@household.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="ha-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Role / Permissions
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="ha-input"
                  >
                    <option value="MEMBER">Member (Standard Family User)</option>
                    <option value="ADMIN">Admin (Household Manager)</option>
                    <option value="BACKUP_ADMIN">Backup Admin (Disaster Recovery)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Save User
                </button>
              </div>
            </form>
          )}

          {/* User List Ledger */}
          <div>
            {users.map((u) => {
              const isEditing = editingUserId === u.id;

              if (isEditing) {
                return (
                  <div key={u.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--ha-line)', backgroundColor: '#fafaf7' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="ha-input"
                        placeholder="Name"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="ha-input"
                        placeholder="Email"
                      />
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="ha-input"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        <option value="BACKUP_ADMIN">Backup Admin</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => handleSaveEditUser(u.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        <Check size={13} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={u.id} className="ha-ledger-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--ha-radius-sm)',
                      backgroundColor: u.role === 'ADMIN' ? 'var(--ha-blue-light)' : u.role === 'BACKUP_ADMIN' ? 'var(--ha-red-tint)' : '#fafaf7',
                      border: '1px solid var(--ha-line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: u.role === 'ADMIN' ? 'var(--ha-blue)' : u.role === 'BACKUP_ADMIN' ? 'var(--ha-red)' : 'var(--ha-ink)',
                      fontSize: '0.9rem',
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                          {u.name}
                        </span>
                        <span className={u.role === 'ADMIN' ? 'ha-badge ha-badge-blue' : u.role === 'BACKUP_ADMIN' ? 'ha-badge ha-badge-red' : 'ha-badge ha-badge-neutral'}>
                          {u.role.replace('_', ' ')}
                        </span>
                        {currentUser?.id === u.id && (
                          <span className="ha-badge ha-badge-lime" style={{ fontSize: '0.68rem' }}>
                            Active Profile
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setEditingUserId(u.id);
                        setEditName(u.name);
                        setEditEmail(u.email);
                        setEditRole(u.role);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.5rem' }}
                      title="Edit user details"
                    >
                      <Edit2 size={14} />
                    </button>

                    {users.length > 1 && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.5rem', color: 'var(--ha-red)' }}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FAMILY & EDUCATION COSTS SETUP */}
      {adminTab === 'family-costs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="ha-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.25rem' }}>
              Colleges, Schools & Sports Cost Center
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', marginBottom: '1.25rem' }}>
              Quickly record and assign higher education tuition, secondary school fees, and extracurricular sports coaching to household members.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* College & University */}
              <div style={{
                backgroundColor: '#fafaf7',
                border: '1px solid var(--ha-line)',
                borderRadius: 'var(--ha-radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="ha-badge ha-badge-blue">Education</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      College / University Tuition
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', lineHeight: 1.4 }}>
                    Standard student contribution fees, semester installments, accommodation & textbooks.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--ha-line)' }}>
                  <span className="tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                    €250.00<span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', fontWeight: 400 }}>/mo</span>
                  </span>
                  <button
                    onClick={() => onOpenAddModalWithCategory?.('education')}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    + Add Tuition
                  </button>
                </div>
              </div>

              {/* School Fees & Transport */}
              <div style={{
                backgroundColor: '#fafaf7',
                border: '1px solid var(--ha-line)',
                borderRadius: 'var(--ha-radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="ha-badge ha-badge-blue">Education</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      School Fees & Bus Transport
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', lineHeight: 1.4 }}>
                    Termly school charges, bus passes, school uniform schemes & canteen subscriptions.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--ha-line)' }}>
                  <span className="tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                    €120.00<span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', fontWeight: 400 }}>/mo</span>
                  </span>
                  <button
                    onClick={() => onOpenAddModalWithCategory?.('education')}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    + Add School Fee
                  </button>
                </div>
              </div>

              {/* Sports & Activities */}
              <div style={{
                backgroundColor: '#fafaf7',
                border: '1px solid var(--ha-line)',
                borderRadius: 'var(--ha-radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="ha-badge ha-badge-neutral">Sports</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      Sports Clubs & Coaching
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', lineHeight: 1.4 }}>
                    Football, swimming academy, tennis club, martial arts & gym memberships.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--ha-line)' }}>
                  <span className="tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                    €45.00<span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', fontWeight: 400 }}>/mo</span>
                  </span>
                  <button
                    onClick={() => onOpenAddModalWithCategory?.('lifestyle')}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    + Add Sports Fee
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE BACKUPS */}
      {adminTab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="ha-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={18} color="var(--ha-blue)" />
                  <span>Prisma PostgreSQL Cloud Snapshots</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                  Generate and restore point-in-time snapshots of your household&apos;s accounts, goals, bills, income and transfers — stored directly in the cloud. A snapshot is also taken automatically every day (kept for the most recent 14), so a manual one here is only needed before something risky, like a restore.
                </p>
              </div>

              <button
                onClick={handleCreateSnapshot}
                disabled={isBackupLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} className={isBackupLoading ? 'spin' : ''} />
                <span>Create Cloud Snapshot</span>
              </button>
            </div>
          </div>

            {/* Backups List */}
            <CollapsibleSection
              id="admin-backups-list"
              title={`Available Cloud Snapshots (${backups.length})`}
              bodyStyle={{ padding: '1rem 1.25rem' }}
            >
              {backups.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', backgroundColor: '#fafaf7', borderRadius: 'var(--ha-radius-sm)', border: '1px solid var(--ha-line)' }}>
                  <p style={{ fontSize: '0.85rem' }}>No snapshots recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {backups.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--ha-radius-sm)',
                        backgroundColor: '#fafaf7',
                        border: '1px solid var(--ha-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {b.notes || 'Point-in-time Snapshot'}
                          {b.isAutomatic && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                color: 'var(--ha-blue)',
                                backgroundColor: 'var(--ha-blue-light)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '999px',
                              }}
                            >
                              Automatic
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                          {new Date(b.createdAt).toLocaleString()} • {b.recordCount} records
                        </div>
                      </div>

                      <button
                        onClick={() => handleRestoreSnapshot(b)}
                        disabled={isBackupLoading}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <div className="ha-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} color="var(--ha-blue)" />
                    <span>Tally Agent cache</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', maxWidth: '620px' }}>
                    The assistant reuses its previous answers to &quot;how do I&quot; questions so a repeat is instant. Those cached answers don&apos;t refresh when the help guide changes — clear the cache so the next such question is answered fresh. Questions about your own money are never cached and aren&apos;t affected.
                    {kbCount !== null && <> Currently <strong>{kbCount}</strong> cached answer{kbCount === 1 ? '' : 's'}.</>}
                  </p>
                </div>

                <button
                  onClick={handleClearKb}
                  disabled={isClearingKb || kbCount === 0}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                >
                  <RefreshCw size={14} className={isClearingKb ? 'spin' : ''} />
                  <span>Clear cached answers</span>
                </button>
              </div>
            </div>
        </div>
      )}

      {adminTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="ha-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} color="var(--ha-blue)" />
              <span>Recent activity</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
              Deletions, backup restores, member removal, and role changes — the actions worth being able to look back on. Not a full edit history.
            </p>
          </div>

          <CollapsibleSection id="admin-activity-list" title={`Activity (${auditEntries.length})`} bodyStyle={{ padding: '1rem 1.25rem' }}>
            {auditEntries.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', backgroundColor: '#fafaf7', borderRadius: 'var(--ha-radius-sm)', border: '1px solid var(--ha-line)' }}>
                <p style={{ fontSize: '0.85rem' }}>Nothing logged yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {auditEntries.map((entry) => {
                  const actionLabel: Record<string, string> = {
                    DELETE: `Deleted ${entry.entityType.toLowerCase()}`,
                    ROLE_CHANGE: 'Changed role',
                    MEMBER_REMOVED: 'Removed member',
                    BACKUP_RESTORE: 'Restored backup',
                  };
                  // Some entries carry a self-contained sentence in entityLabel
                  // and read better without the generic "Deleted x:" prefix.
                  const headline = entry.entityType === 'AssistantKbEntry' && entry.entityLabel
                    ? entry.entityLabel
                    : `${actionLabel[entry.action] || entry.action}${entry.entityLabel ? `: ${entry.entityLabel}` : ''}`;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--ha-radius-sm)',
                        backgroundColor: '#fafaf7',
                        border: '1px solid var(--ha-line)',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        {headline}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                        {new Date(entry.createdAt).toLocaleString()} · {entry.actorName}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};
