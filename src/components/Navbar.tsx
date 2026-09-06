import React, { useState } from 'react';
import type { UserProfile } from '../types/expense';
import { Plus, Search, Settings, HelpCircle, LogOut, ShieldCheck, Menu, X, ChevronDown, Eye, EyeOff, ScanLine, Bug } from 'lucide-react';
import { TallyLogo } from './TallyLogo';
import { APP_VERSION, MOBILE_APP_VERSION } from '../data/changelog';

export type TabId = 'overview' | 'all' | 'ai-tech' | 'utilities' | 'education' | 'big-ticket' | 'insurance' | 'income' | 'calendar' | 'insights' | 'reports' | 'accounts' | 'moneymap' | 'flow' | 'goals' | 'planned' | 'admin';

export const SPENDING_TABS: TabId[] = ['all', 'ai-tech', 'utilities', 'education', 'big-ticket', 'insurance'];

const PRIMARY_NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'all', label: 'Spending' },
  { id: 'calendar', label: 'Bills' },
  { id: 'income', label: 'Income' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'insights', label: 'Insights' },
  { id: 'reports', label: 'Reports' },
];

// Journey destinations remain directly visible in the dedicated navigation
// rail so nobody needs to learn a hidden grouping or dropdown.
const JOURNEY_NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'goals', label: 'Goals' },
  { id: 'planned', label: 'Planned' },
  { id: 'moneymap', label: 'Money Map' },
];

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  onOpenSettings: () => void;
  onOpenHelpModal: () => void;
  onOpenBugLog: () => void;
  onFocusAsk: () => void;
  onLogout: () => void;
  currentUser: UserProfile | null;
  isPrivacyBlurred: boolean;
  onTogglePrivacyBlur: () => void;
  onOpenChangelog: (variant?: 'desktop' | 'mobile') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenScanModal,
  onOpenSettings,
  onOpenHelpModal,
  onOpenBugLog,
  onFocusAsk,
  onLogout,
  currentUser,
  isPrivacyBlurred,
  onTogglePrivacyBlur,
  onOpenChangelog,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNav = (tab: TabId) => {
    onTabChange(tab);
    setIsDrawerOpen(false);
  };

  return (
    <div className="ha-navbar">
      <header className="ha-navbar-shell">
        <div className="ha-navbar-top">
          {/* Brand */}
          <div
            className="ha-brand"
            onClick={() => handleNav('overview')}
          >
            <TallyLogo size={34} />
            <div className="ha-brand-copy">
              <h1>
                Tally
              </h1>
              <p className="hide-mobile">
                Your household, in balance.
              </p>
            </div>
            <button
              className="hide-mobile ha-version-badge"
              onClick={(e) => { e.stopPropagation(); onOpenChangelog('desktop'); }}
              title="View changelog"
            >
              v{APP_VERSION}
            </button>
          </div>

          <div className="desktop-only ha-navbar-actions">
            <button className="btn btn-ghost ha-nav-action" title="Ask Tally" onClick={onFocusAsk}>
              <Search size={15} />
              <span>Ask Tally</span>
            </button>

            <button
              className={`btn btn-ghost ha-nav-action${isPrivacyBlurred ? ' is-active' : ''}`}
              title={isPrivacyBlurred ? 'Reveal screen' : 'Blur screen for privacy'}
              onClick={onTogglePrivacyBlur}
            >
              {isPrivacyBlurred ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{isPrivacyBlurred ? 'Blurred' : 'Privacy'}</span>
            </button>

            <button className="btn btn-ghost ha-nav-action" title="Scan a bill" onClick={onOpenScanModal}>
              <ScanLine size={15} />
              <span>Scan</span>
            </button>

            <button onClick={onOpenAddModal} className="btn btn-primary ha-navbar-primary">
              <Plus size={14} />
              <span>Add expense</span>
            </button>

            <button className="ha-icon-btn" title="Settings & preferences" onClick={onOpenSettings}>
              <Settings size={17} />
            </button>

            {currentUser && (
              <div className="ha-profile-wrap">
                <button
                  onClick={() => setIsAvatarMenuOpen((v) => !v)}
                  className="ha-profile-button"
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: currentUser.role === 'ADMIN' ? 'var(--ha-blue-light)' : currentUser.role === 'BACKUP_ADMIN' ? 'var(--ha-red-tint)' : '#e7e8ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: currentUser.role === 'ADMIN' ? 'var(--ha-blue)' : currentUser.role === 'BACKUP_ADMIN' ? 'var(--ha-red)' : 'var(--ha-ink)',
                  }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hide-mobile" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown size={14} color="var(--ha-muted)" />
                </button>

                {isAvatarMenuOpen && (
                  <>
                    <div className="ha-dropdown-overlay" onClick={() => setIsAvatarMenuOpen(false)} />
                    <div className="ha-dropdown">
                      {isAdmin && (
                        <button className="ha-dropdown-item" onClick={() => { handleNav('admin'); setIsAvatarMenuOpen(false); }}>
                          <ShieldCheck size={15} />
                          <span>Admin & users</span>
                        </button>
                      )}
                      <button className="ha-dropdown-item" onClick={() => { onOpenHelpModal(); setIsAvatarMenuOpen(false); }}>
                        <HelpCircle size={15} />
                        <span>Help guide</span>
                      </button>
                      <button className="ha-dropdown-item" onClick={() => { onOpenBugLog(); setIsAvatarMenuOpen(false); }}>
                        <Bug size={15} />
                        <span>Bug log</span>
                      </button>
                      <div className="ha-dropdown-divider" />
                      <button className="ha-dropdown-item destructive" onClick={() => { onLogout(); setIsAvatarMenuOpen(false); }}>
                        <LogOut size={15} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="mobile-menu-btn">
            <button
              className="ha-icon-btn"
              title={isPrivacyBlurred ? 'Reveal screen' : 'Blur screen for privacy'}
              onClick={onTogglePrivacyBlur}
              style={isPrivacyBlurred ? { backgroundColor: 'var(--ha-blue-light)', color: 'var(--ha-blue)' } : undefined}
            >
              {isPrivacyBlurred ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
            <button className="ha-icon-btn" title="Scan a bill" onClick={onOpenScanModal}>
              <ScanLine size={19} />
            </button>
            <button className="ha-icon-btn" title="Add expense" onClick={onOpenAddModal}>
              <Plus size={19} />
            </button>
            <button className="ha-icon-btn" title="Menu" onClick={() => setIsDrawerOpen(true)}>
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* A dedicated navigation rail keeps destinations predictable and prevents
            the accidental two-row wrapping visible in the previous header. A
            thin divider visually separates the core sections from the money-
            journey group below — a grouping cue only, every destination stays
            a single direct click either side of it. */}
        <nav className="desktop-only ha-navbar-nav" aria-label="Main navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = item.id === 'all' ? SPENDING_TABS.includes(activeTab) : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`ha-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
          <span className="ha-navbar-nav-divider" aria-hidden="true" />
          {JOURNEY_NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`ha-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
          <div className="mobile-drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--ha-line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TallyLogo size={24} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--ha-font-display)' }}>Tally</span>
                <button
                  onClick={() => { setIsDrawerOpen(false); onOpenChangelog('mobile'); }}
                  style={{
                    background: 'none',
                    border: '1px solid var(--ha-line)',
                    borderRadius: 'var(--ha-radius-sm)',
                    padding: '0.1rem 0.4rem',
                    color: 'var(--ha-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  v{MOBILE_APP_VERSION}
                </button>
              </div>
              <button className="ha-icon-btn" onClick={() => setIsDrawerOpen(false)} title="Close menu" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--ha-line)' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--ha-radius-sm)',
                  backgroundColor: 'var(--ha-blue-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--ha-blue)',
                }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>{currentUser.role}</div>
                </div>
              </div>
            )}

            <div style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column' }}>
              {PRIMARY_NAV_ITEMS.map((item) => {
                const isActive = item.id === 'all' ? SPENDING_TABS.includes(activeTab) : activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="ha-dropdown-item"
                    style={{ fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--ha-blue)' : 'var(--ha-ink)' }}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.85rem 0.75rem 0.35rem' }}>
                Money journey
              </div>
              {JOURNEY_NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="ha-dropdown-item"
                    style={{ fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--ha-blue)' : 'var(--ha-ink)' }}
                  >
                    {item.label}
                  </button>
                );
              })}
              {isAdmin && (
                <button onClick={() => handleNav('admin')} className="ha-dropdown-item" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  <ShieldCheck size={15} />
                  <span>Admin & users</span>
                </button>
              )}

              <div className="ha-dropdown-divider" />

              <button onClick={() => { onOpenSettings(); setIsDrawerOpen(false); }} className="ha-dropdown-item">
                <Settings size={15} />
                <span>Settings & preferences</span>
              </button>
              <button onClick={() => { onOpenHelpModal(); setIsDrawerOpen(false); }} className="ha-dropdown-item">
                <HelpCircle size={15} />
                <span>Help guide</span>
              </button>
              <button onClick={() => { onOpenBugLog(); setIsDrawerOpen(false); }} className="ha-dropdown-item">
                <Bug size={15} />
                <span>Bug log</span>
              </button>
              <button onClick={() => { onLogout(); setIsDrawerOpen(false); }} className="ha-dropdown-item destructive">
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
