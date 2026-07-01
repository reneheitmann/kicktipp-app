import { supabase } from '../../lib/supabaseClient'
import type { PermissionKey, RolePermission, UserRole } from '../../types/database'

export async function listRolePermissions(): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role')
    .order('permission_key')
  if (error) throw error
  return data
}

export async function setRolePermission(
  role: UserRole,
  permissionKey: PermissionKey,
  granted: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .update({ granted, updated_at: new Date().toISOString() })
    .eq('role', role)
    .eq('permission_key', permissionKey)
  if (error) throw error
}
