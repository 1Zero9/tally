import React, { useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types/expense';
import { getErrorMessage } from '../lib/errors';
import { X, UserPlus, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface WorkspaceInfo {
  id: string;
  name: string;
}

interface ShareWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onMembersUpdated: () => void;
}

export const ShareWorkspaceModal: React.FC<ShareWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onMembersUpdated,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspace');
      const data = await res.json();
      if (data.status === 'ok' && data.workspace) {
        setWorkspace(data.workspace);
        setMembers(data.workspace.users || []);
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkspace();
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
          workspaceId: workspace?.id,
        }),
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setStatusMessage(`Successfully added ${data.user.name} to your household!`);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('MEMBER');
        fetchWorkspace();
        onMembersUpdated();
      } else {
        setErrorMessage(data.message || 'Failed to invite user');
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to invite user'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--ha-radius-sm)',
              backgroundColor: 'var(--ha-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={18} color="var(--ha-blue)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
                Share Household Workspace
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                Invite family members so they can collaborate and manage expenses together
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Notifications */}
          {statusMessage && (
            <div style={{
              backgroundColor: 'var(--ha-lime-tint)',
              border: '1px solid var(--ha-lime)',
              borderRadius: 'var(--ha-radius-sm)',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--ha-ink)',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}>
              <CheckCircle2 size={16} color="var(--ha-ink)" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div style={{
              backgroundColor: 'var(--ha-red-tint)',
              border: '1px solid var(--ha-red)',
              borderRadius: 'var(--ha-radius-sm)',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--ha-red)',
              fontSize: '0.82rem',
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Direct Invite by Email — the only way new members are added */}
          <form onSubmit={handleInviteUser} style={{
            backgroundColor: '#fafaf7',
            border: '1px solid var(--ha-line)',
            borderRadius: 'var(--ha-radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                Directly invite member by email
              </span>
              <UserPlus size={15} color="var(--ha-blue)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Email address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="wife@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Name / Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>Role:</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  style={{
                    backgroundColor: 'var(--ha-white)',
                    border: '1px solid var(--ha-line)',
                    borderRadius: 'var(--ha-radius-sm)',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.78rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="MEMBER">Member (Can view and edit expenses)</option>
                  <option value="ADMIN">Admin (Can manage users & backups)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                <span>{isLoading ? 'Inviting...' : 'Invite to workspace'}</span>
              </button>
            </div>
          </form>

          {/* 3. Current Workspace Members */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
              Current workspace members ({members.length})
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--ha-radius-sm)',
                    backgroundColor: '#fafaf7',
                    border: '1px solid var(--ha-line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--ha-radius-sm)',
                      backgroundColor: m.role === 'ADMIN' ? 'var(--ha-blue-light)' : 'var(--ha-white)',
                      border: '1px solid var(--ha-line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: m.role === 'ADMIN' ? 'var(--ha-blue)' : 'var(--ha-ink)',
                    }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        {m.name} {currentUser?.id === m.id && '(You)'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                        {m.email}
                      </div>
                    </div>
                  </div>

                  <span className={m.role === 'ADMIN' ? 'ha-badge ha-badge-blue' : 'ha-badge ha-badge-neutral'} style={{ fontSize: '0.68rem' }}>
                    {m.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--ha-line)',
          backgroundColor: '#fafaf7',
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
