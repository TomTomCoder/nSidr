import { z } from '../../zod';
export declare const Role: {
    readonly Owner: "owner";
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Commenter: "commenter";
    readonly Viewer: "viewer";
};
export declare const RoleLevel: string[];
export declare const BillableRoles: readonly ["owner", "creator", "editor"];
export declare const roleSchema: z.ZodEnum<{
    readonly Owner: "owner";
    readonly Creator: "creator";
    readonly Editor: "editor";
    readonly Commenter: "commenter";
    readonly Viewer: "viewer";
}>;
export type IRole = z.infer<typeof roleSchema>;
