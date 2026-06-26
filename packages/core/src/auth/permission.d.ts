import type { Action } from './actions';
import type { IRole } from './role/types';
export declare const checkPermissions: (role: IRole, actions: Action[]) => boolean;
export declare const getPermissions: (role: IRole) => Action[];
export declare const getPermissionMap: (role: IRole) => Record<Action, boolean>;
export declare const hasPermission: (role: IRole, action: Action) => boolean;
export declare const isRestrictedRole: (role: IRole) => boolean;
