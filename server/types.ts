// export interface ActionResponse { success: boolean, message: string }

export interface ActionResponse {
    data?: any[];
    success: boolean;
    message: string;
    meta?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number
    }
}

