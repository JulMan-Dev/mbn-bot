import { ApiUrl, ApiVersion } from "kdecole-api";

export const API_VERSION: ApiVersion = ApiVersion[process.env.API ?? "PROD_MON_BUREAU_NUMERIQUE"];
export const API_URL: ApiUrl = ApiUrl[process.env.API ?? "PROD_MON_BUREAU_NUMERIQUE"];

export const VACATIONS: [Date, Date][] = [
    [null, new Date(2022, 8, 1)],
    [new Date(2022, 9, 22), new Date(2022, 10, 7)],
    [new Date(2022, 11, 17), new Date(2023, 0, 3)],
    [new Date(2023, 1, 11), new Date(2023, 1, 27)],
    [new Date(2023, 3, 15), new Date(2023, 4, 2)],
    [new Date(2023, 5, 8), null]
];
