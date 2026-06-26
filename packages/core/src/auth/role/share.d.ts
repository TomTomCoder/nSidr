import type { FieldAction, RecordAction, ViewAction } from '../actions';
export type ShareViewAction = ViewAction | FieldAction | RecordAction;
export declare const shareViewPermissions: Record<ShareViewAction, boolean>;
