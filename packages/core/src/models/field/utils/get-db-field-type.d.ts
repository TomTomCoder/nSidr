import { FieldType, CellValueType, DbFieldType } from '../constant';
/**
 * Get database field type based on field type, cell value type, and multiplicity
 * This is a pure function that doesn't depend on any services
 */
export declare function getDbFieldType(fieldType: FieldType, cellValueType: CellValueType, isMultipleCellValue?: boolean): DbFieldType;
