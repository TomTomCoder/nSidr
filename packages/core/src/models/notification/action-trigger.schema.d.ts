import { z } from 'zod';
export declare const tableActionKeys: z.ZodEnum<{
    setRecord: "setRecord";
    addRecord: "addRecord";
    addField: "addField";
    deleteRecord: "deleteRecord";
    setField: "setField";
    deleteField: "deleteField";
    taskProcessing: "taskProcessing";
    taskCompleted: "taskCompleted";
    taskCancelled: "taskCancelled";
    taskFailed: "taskFailed";
}>;
export declare const viewActionKeys: z.ZodEnum<{
    applyViewFilter: "applyViewFilter";
    applyViewGroup: "applyViewGroup";
    applyViewStatisticFunc: "applyViewStatisticFunc";
    showViewField: "showViewField";
}>;
export declare const actionTriggerBufferSchema: z.ZodEnum<{
    setRecord: "setRecord";
    addRecord: "addRecord";
    addField: "addField";
    deleteRecord: "deleteRecord";
    setField: "setField";
    deleteField: "deleteField";
    taskProcessing: "taskProcessing";
    taskCompleted: "taskCompleted";
    taskCancelled: "taskCancelled";
    taskFailed: "taskFailed";
}>;
export type ITableActionKey = z.infer<typeof actionTriggerBufferSchema>;
export type IViewActionKey = z.infer<typeof viewActionKeys>;
