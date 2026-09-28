import { NavLink, useLocation } from 'react-router-dom';
import {
  Boxes,
  GitBranch,
  LayoutDashboard,
  Menu,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { ROLE_LABELS } from '../constants';
import { useRole } from '../context/RoleContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard', end: true },
  { to: '/assets', label: 'Assets', icon: Boxes, permission: 'viewAssets' },
  { to: '/dependencies', label: 'Dependencies', icon: GitBranch, permission: 'viewDependencies' },
  { to: '/retirement', label: 'Retirement', icon: ShieldAlert, permission: 'viewRetirement' },
];

export default function Layout({ children }) {
  const { role, setRole, roles, can, roleLabel } = useRole();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const crumbs = location.pathname.split('/').filter(Boolean);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">GoI</span>
          <div>
            <strong>Asset Inventory</strong>
            <p>National infrastructure register</p>
          </div>
        </div>
        <nav>
          {NAV.filter((item) => can(item.permission)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="main-pane">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
            <Menu size={18} />
          </button>
          <div className="crumbs">
            <span>Home</span>
            {crumbs.map((crumb) => (
              <span key={crumb}> / {decodeURIComponent(crumb)}</span>
            ))}
          </div>
          <div className="top-actions">
            <span className="demo-pill">DEMO MODE</span>
            <label className="role-switch">
              <span>View as</span>
              <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="View as role">
                {roles.map((item) => (
                  <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                ))}
              </select>
            </label>
            <span className="role-chip">{roleLabel}</span>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
