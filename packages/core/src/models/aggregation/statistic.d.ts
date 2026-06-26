import { CellValueType, FieldType } from '../field';
import { StatisticsFunc } from './statistics-func.enum';
export declare const getValidStatisticFunc: (field?: {
    type: FieldType;
    cellValueType: CellValueType;
    isMultipleCellValue?: boolean;
}) => StatisticsFunc[];
