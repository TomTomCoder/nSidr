export declare enum OpName {
    AddTable = "addTable",
    SetTableProperty = "setTableProperty",
    SetRecord = "setRecord",
    AddRecord = "addRecord",
    AddField = "addField",
    AddColumnMeta = "addColumnMeta",
    DeleteColumnMeta = "deleteColumnMeta",
    SetFieldProperty = "setFieldProperty",
    AddView = "addView",
    SetViewProperty = "setViewProperty",
    UpdateViewColumnMeta = "updateViewColumnMeta"
}
export declare function pathMatcher<T>(path: (string | number)[], matchList: string[]): T | null;
