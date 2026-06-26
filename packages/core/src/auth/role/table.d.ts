import { z } from '../../zod';
import type { TableAction, FieldAction, RecordAction, ViewAction } from '../actions';
export declare const TableRole: {
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Viewer: "viewer";
};
export declare const tableRolesSchema: z.ZodEnum<{
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Viewer: "viewer";
}>;
export type ITableRole = z.infer<typeof tableRolesSchema>;
export type TablePermission = ViewAction | FieldAction | RecordAction | TableAction;
