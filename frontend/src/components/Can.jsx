import { useRole } from '../context/RoleContext';

export function Can({ permission, children, fallback = null }) {
  const { can } = useRole();
  return can(permission) ? children : fallback;
}
