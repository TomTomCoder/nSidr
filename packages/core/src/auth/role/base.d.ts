import { z } from '../../zod';
import type { Action, SpaceAction } from '../actions';
import type { IRole } from './types';
export declare const BaseRole: {
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Commenter: "commenter";
    readonly Viewer: "viewer";
};
export declare const baseRolesSchema: z.ZodEnum<{
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Commenter: "commenter";
    readonly Viewer: "viewer";
}>;
export type IBaseRole = z.infer<typeof baseRolesSchema>;
type ExcludeSpaceAction<T> = T extends SpaceAction ? never : T;
export type BasePermission = ExcludeSpaceAction<Action>;
export declare const getBasePermission: (role: IRole) => Record<BasePermission, boolean>;
export {};
