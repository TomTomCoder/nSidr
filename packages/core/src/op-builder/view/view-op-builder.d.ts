import type { IOtOperation } from '../../models/op';
import { AddViewBuilder } from './add-view';
import { SetViewPropertyBuilder } from './set-view-property';
import { UpdateViewColumnMetaBuilder } from './update-view-column-meta';
export declare class ViewOpBuilder {
    static editor: {
        setViewProperty: SetViewPropertyBuilder;
        updateViewColumnMeta: UpdateViewColumnMetaBuilder;
    };
    static creator: AddViewBuilder;
    static ops2Contexts(ops: IOtOperation[]): (import("./set-view-property").ISetViewPropertyOpContext | import("./update-view-column-meta").IUpdateViewColumnMetaOpContext)[];
    static detect(op: IOtOperation): import("./set-view-property").ISetViewPropertyOpContext | import("./update-view-column-meta").IUpdateViewColumnMetaOpContext | null;
}
