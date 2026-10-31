import type { AxiosInstance } from 'axios';

export declare function getAccessToken(): string | null;
export declare function setAccessToken(token: string | null): void;
export declare function silentRefresh(): Promise<string | null>;

export declare const axiosInstance: AxiosInstance;
export declare const axios: AxiosInstance;
export default axiosInstance;

