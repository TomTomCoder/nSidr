import type { Action } from '../actions';
import { type IRole } from './types';
export declare const RolePermission: Record<IRole, Record<Action, boolean>>;
