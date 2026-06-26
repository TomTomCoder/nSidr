"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidStatisticFunc = void 0;
const lodash_1 = require("lodash");
const field_1 = require("../field");
const statistics_func_enum_1 = require("./statistics-func.enum");
const getValidStatisticFunc = (field) => {
    let statisticSet = [];
    if (!field) {
        return statisticSet;
    }
    const { type, cellValueType, isMultipleCellValue } = field;
    if (type === field_1.FieldType.Link) {
        statisticSet = [
            statistics_func_enum_1.StatisticsFunc.Count,
            statistics_func_enum_1.StatisticsFunc.Empty,
            statistics_func_enum_1.StatisticsFunc.Filled,
            statistics_func_enum_1.StatisticsFunc.PercentEmpty,
            statistics_func_enum_1.StatisticsFunc.PercentFilled,
        ];
        return statisticSet;
    }
    if ([field_1.FieldType.User, field_1.FieldType.CreatedBy, field_1.FieldType.LastModifiedBy].includes(type)) {
        statisticSet = [
            statistics_func_enum_1.StatisticsFunc.Count,
            statistics_func_enum_1.StatisticsFunc.Empty,
            statistics_func_enum_1.StatisticsFunc.Filled,
            statistics_func_enum_1.StatisticsFunc.PercentEmpty,
            statistics_func_enum_1.StatisticsFunc.PercentFilled,
        ];
        if (!isMultipleCellValue) {
            statisticSet.splice(3, 0, statistics_func_enum_1.StatisticsFunc.Unique);
            statisticSet.push(statistics_func_enum_1.StatisticsFunc.PercentUnique);
        }
        return statisticSet;
    }
    switch (cellValueType) {
        case field_1.CellValueType.String: {
            statisticSet = [
                statistics_func_enum_1.StatisticsFunc.Count,
                statistics_func_enum_1.StatisticsFunc.Empty,
                statistics_func_enum_1.StatisticsFunc.Filled,
                statistics_func_enum_1.StatisticsFunc.Unique,
                statistics_func_enum_1.StatisticsFunc.PercentEmpty,
                statistics_func_enum_1.StatisticsFunc.PercentFilled,
                statistics_func_enum_1.StatisticsFunc.PercentUnique,
            ];
            break;
        }
        case field_1.CellValueType.Number: {
            statisticSet = [
                statistics_func_enum_1.StatisticsFunc.Sum,
                statistics_func_enum_1.StatisticsFunc.Average,
                statistics_func_enum_1.StatisticsFunc.Min,
                statistics_func_enum_1.StatisticsFunc.Max,
                statistics_func_enum_1.StatisticsFunc.Count,
                statistics_func_enum_1.StatisticsFunc.Empty,
                statistics_func_enum_1.StatisticsFunc.Filled,
                statistics_func_enum_1.StatisticsFunc.Unique,
                statistics_func_enum_1.StatisticsFunc.PercentEmpty,
                statistics_func_enum_1.StatisticsFunc.PercentFilled,
                statistics_func_enum_1.StatisticsFunc.PercentUnique,
            ];
            break;
        }
        case field_1.CellValueType.DateTime: {
            statisticSet = [
                statistics_func_enum_1.StatisticsFunc.Count,
                statistics_func_enum_1.StatisticsFunc.Empty,
                statistics_func_enum_1.StatisticsFunc.Filled,
                statistics_func_enum_1.StatisticsFunc.Unique,
                statistics_func_enum_1.StatisticsFunc.PercentEmpty,
                statistics_func_enum_1.StatisticsFunc.PercentFilled,
                statistics_func_enum_1.StatisticsFunc.PercentUnique,
                statistics_func_enum_1.StatisticsFunc.EarliestDate,
                statistics_func_enum_1.StatisticsFunc.LatestDate,
                statistics_func_enum_1.StatisticsFunc.DateRangeOfDays,
                statistics_func_enum_1.StatisticsFunc.DateRangeOfMonths,
            ];
            break;
        }
        case field_1.CellValueType.Boolean: {
            statisticSet = [
                statistics_func_enum_1.StatisticsFunc.Count,
                statistics_func_enum_1.StatisticsFunc.Checked,
                statistics_func_enum_1.StatisticsFunc.UnChecked,
                statistics_func_enum_1.StatisticsFunc.PercentChecked,
                statistics_func_enum_1.StatisticsFunc.PercentUnChecked,
            ];
            break;
        }
    }
    if (type === field_1.FieldType.Attachment) {
        (0, lodash_1.pullAll)(statisticSet, [statistics_func_enum_1.StatisticsFunc.Unique, statistics_func_enum_1.StatisticsFunc.PercentUnique]);
        statisticSet.push(statistics_func_enum_1.StatisticsFunc.TotalAttachmentSize);
    }
    return statisticSet;
};
exports.getValidStatisticFunc = getValidStatisticFunc;
