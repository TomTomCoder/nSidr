"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceOrderBy = exports.replaceGroupBy = exports.replaceSearch = exports.replaceFilter = void 0;
const lodash_1 = require("lodash");
// replace all value in fieldId key with real fieldId
function replaceFilter(filter, fieldMap, to) {
    const traverse = (filterItem) => {
        if (filterItem && 'fieldId' in filterItem) {
            // Replace fieldId with real id from fieldMap
            filterItem.fieldId = fieldMap[filterItem.fieldId]?.[to];
        }
        else if (filterItem && 'filterSet' in filterItem) {
            // Recursively traverse nested filterSet
            filterItem.filterSet.forEach((item) => traverse(item));
        }
    };
    const transformedFilter = (0, lodash_1.cloneDeep)(filter);
    traverse(transformedFilter);
    return transformedFilter;
}
exports.replaceFilter = replaceFilter;
function replaceSearch(search, fieldMap, to) {
    const [searchValue, fieldKeys, hideNotMatchRow] = search;
    if (!fieldKeys) {
        return search;
    }
    const fieldIds = fieldKeys
        .split(',')
        .map((key) => fieldMap[key.trim()]?.[to])
        .join(',');
    return hideNotMatchRow ? [searchValue, fieldIds, hideNotMatchRow] : [searchValue, fieldIds];
}
exports.replaceSearch = replaceSearch;
function replaceGroupBy(groupBy, fieldMap, to) {
    if (!groupBy) {
        return groupBy;
    }
    return groupBy.map((item) => ({
        ...item,
        fieldId: fieldMap[item.fieldId]?.[to],
    }));
}
exports.replaceGroupBy = replaceGroupBy;
function replaceOrderBy(orderBy, fieldMap, to) {
    return orderBy.map((item) => ({
        ...item,
        fieldId: fieldMap[item.fieldId]?.[to],
    }));
}
exports.replaceOrderBy = replaceOrderBy;
