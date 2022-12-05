/// <reference types="node" />
import { EventEmitter } from "events";
import { w3cwebsocket as WSClient } from 'websocket';
export type SpacetimeDBEvent = {
    timestamp: number;
    status: string;
    caller_identity: string;
    energy_quanta_used: number;
    function_call?: {
        reducer: string;
        arg_bytes: number[];
    };
};
declare class Table {
    name: string;
    rows: Map<string, Array<any>>;
    emitter: EventEmitter;
    pkCol?: number;
    constructor(name: string, pkCol?: number);
    applyOperations: (operations: {
        op: string;
        row_pk: string;
        row: any[];
    }[]) => void;
    update: (oldPk: string, pk: string, row: Array<any>) => void;
    insert: (pk: string, row: Array<any>) => void;
    delete: (pk: string) => void;
    onInsert: (cb: (row: Array<any>) => void) => void;
    onDelete: (cb: (row: Array<any>) => void) => void;
    onUpdate: (cb: (row: Array<any>, oldRow: Array<any>) => void) => void;
}
declare class Database {
    tables: Map<string, Table>;
    constructor();
    getOrCreateTable: (tableName: string, pkCol?: number) => Table;
}
export declare class SpacetimeDBClient {
    ws: WSClient;
    identity?: string;
    token?: string;
    db: Database;
    emitter: EventEmitter;
    constructor(host: string, name_or_address: string, credentials?: {
        identity: string;
        token: string;
    });
    call: (reducerName: String, args: Array<any>) => void;
}
export {};
