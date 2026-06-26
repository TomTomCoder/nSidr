import type { FieldKeyType } from '../record/record';
import type { IFilter } from './filter';
import type { IGroup } from './group';
import type { ISortItem } from './sort';
export declare function replaceFilter(filter: IFilter, fieldMap: Record<string, {
    id: string;
    name: string;
    dbFieldName: string;
}>, to: FieldKeyType): IFilter;
export declare function replaceSearch(search: [string] | [string, string] | [string, string, boolean], fieldMap: Record<string, {
    id: string;
    name: string;
    dbFieldName: string;
}>, to: FieldKeyType): [string] | [string, string] | [string, string, boolean];
export declare function replaceGroupBy(groupBy: IGroup, fieldMap: Record<string, {
    id: string;
    name: string;
    dbFieldName: string;
}>, to: FieldKeyType): IGroup;
export declare function replaceOrderBy(orderBy: ISortItem[], fieldMap: Record<string, {
    id: string;
    name: string;
    dbFieldName: string;
}>, to: FieldKeyType): ISortItem[];
