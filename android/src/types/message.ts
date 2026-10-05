export type Message = {
    id: string;
    source: string;
    text: string;
    important: boolean;
    receivedAt?: number;
    origin?: 'notification';
};
