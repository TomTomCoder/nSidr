import type { ManipulateType } from 'dayjs';
import dayjs from 'dayjs';
export declare class DateUtil {
    private readonly timeZone;
    private readonly useUTC;
    static readonly NORM_YEAR_PATTERN = "YYYY";
    static readonly NORM_MONTH_PATTERN = "YYYY-MM";
    static readonly NORM_DATE_PATTERN = "YYYY-MM-DD";
    static readonly NORM_DATETIME_MINUTE_PATTERN = "YYYY-MM-DD HH:mm";
    static readonly NORM_DATETIME_PATTERN = "YYYY-MM-DD HH:mm:ss";
    static readonly NORM_DATETIME_MS_PATTERN = "YYYY-MM-DD HH:mm:ss.SSS";
    static readonly UTC_SIMPLE_PATTERN = "YYYY-MM-DDTHH:mm:ss";
    static readonly UTC_SIMPLE_MS_PATTERN = "YYYY-MM-DDTHH:mm:ss.SSS";
    static readonly UTC_WITH_ZONE_OFFSET_PATTERN = "YYYY-MM-DDTHH:mm:ssZ";
    static readonly UTC_MS_WITH_ZONE_OFFSET_PATTERN = "YYYY-MM-DDTHH:mm:ss.SSSZ";
    constructor(timeZone: string, useUTC?: boolean);
    /**
     * Current time
     *
     * @param date Date
     * @return Current time
     */
    date(date?: dayjs.ConfigType): dayjs.Dayjs;
    /**
     * Current time, in the format YYYY-MM-DD HH:mm:ss
     *
     * @return The current time in standard form string
     */
    now(): string;
    /**
     * Current date, in the format YYYY-MM-DD
     *
     * @return Standard form string of the current date
     */
    today(): string;
    /**
     * Offset days
     *
     * @param offset offset days, positive numbers offset to the future, negative numbers offset to history
     * @param date Date
     * @return offset date
     */
    offsetDay(offset: number, date?: dayjs.Dayjs): dayjs.Dayjs;
    /**
     * Offset week
     *
     * @param offset offset week, positive number offset to future, negative number offset to history
     * @param date Date
     * @return offset date
     */
    offsetWeek(offset: number, date?: dayjs.Dayjs): dayjs.Dayjs;
    /**
     * Offset month
     *
     * @param offset offset months, positive offset to the future, negative offset to history
     * @param date Date
     * @return offset date
     */
    offsetMonth(offset: number, date?: dayjs.Dayjs): dayjs.Dayjs;
    /**
     * Get the time after the specified date offset from the specified time, the generated offset date does not affect the original date
     *
     * @param dateField The granularity size of the offset (hour, day, month, etc.) {@link ManipulateType}
     * @param offset offset, positive number is backward offset, negative number is forward offset
     * @param date the base date
     * @return offset date
     */
    offset(dateField: ManipulateType, offset: number, date?: dayjs.Dayjs): dayjs.Dayjs;
    /**
     * Tomorrow
     *
     * @return Tomorrow
     */
    tomorrow(): dayjs.Dayjs;
    /**
     * Yesterday
     *
     * @return yesterday
     */
    yesterday(): dayjs.Dayjs;
    /**
     * Last week
     *
     * @return Last week
     */
    lastWeek(): dayjs.Dayjs;
    /**
     * Next week
     *
     * @return Next week
     */
    nextWeek(): dayjs.Dayjs;
    /**
     * Last month
     *
     * @return Last month
     */
    lastMonth(): dayjs.Dayjs;
    /**
     * Next month
     *
     * @return Next month
     */
    nextMonth(): dayjs.Dayjs;
}
