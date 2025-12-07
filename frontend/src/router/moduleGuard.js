import { useModuleStore } from '../modules/modules/stores/modules';
import { useAuthStore } from '../modules/auth/stores/auth';

export function useAuthGuard() {
  const guardModuleAccess = async (to) => {
    if (!to.meta.moduleKey) return true;
    const moduleStore = useModuleStore();
    const authStore = useAuthStore();

    // Hydrate user/profile if needed
    if (!authStore.user && authStore.token) {
      try {
        await authStore.refreshProfile();
      } catch (e) {
        // ignore
      }
    }

    // Fetch modules if needed
    if (!moduleStore.modules.length) {
      try {
        await moduleStore.fetchModules();
      } catch (e) {
        // ignore
      }
    }

    // Ensure permissions loaded
    if ((!authStore.permissionNames || !authStore.permissionNames.length) && authStore.token) {
      try {
        await authStore.refreshProfile();
      } catch (e) {
        // ignore
      }
    }

    const enabled = moduleStore.isEnabled(to.meta.moduleKey);
    const hasAccess = moduleStore.hasAccess(to.meta.moduleKey, authStore.permissionNames || []);

    if (!enabled || !hasAccess) {
      return { name: 'module-disabled', params: { key: to.meta.moduleKey } };
    }
    return true;
  };

  return { guardModuleAccess };
}
