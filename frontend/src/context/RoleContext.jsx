import { createContext, useContext, useMemo, useState } from 'react';
import { ROLE_LABELS, ROLE_STORAGE_KEY, ROLES } from '../constants';
import { hasPermission } from '../permissions';

const RoleContext = createContext(null);

function readStoredRole() {
  try {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    return ROLES.includes(stored) ? stored : 'USER';
  } catch {
    return 'USER';
  }
}

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(readStoredRole);

  const value = useMemo(() => {
    const setRole = (nextRole) => {
      const resolved = ROLES.includes(nextRole) ? nextRole : 'USER';
      setRoleState(resolved);
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, resolved);
      } catch {
        /* ignore quota / private mode */
      }
    };

    return {
      role,
      roleLabel: ROLE_LABELS[role],
      roles: ROLES,
      setRole,
      can: (permission) => hasPermission(role, permission),
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}
