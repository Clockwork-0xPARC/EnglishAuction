import { EventEmitter } from "node:events";
import { ICloseEvent, w3cwebsocket as WSClient } from 'websocket';

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

class Table {
    public name: string;
    public rows: Map<string, Array<any>>;
    public emitter: EventEmitter;

    constructor(name: string) {
        this.name = name;
        this.rows = new Map();
        this.emitter = new EventEmitter();
    }

    insert = (pk: string, row: Array<any>) => {
        this.rows.set(pk, row);
        this.emitter.emit("insert", row);
    }
    
    delete = (pk: string) => {
        const row = this.rows.get(pk);
        this.rows.delete(pk);
        if (row) {
            this.emitter.emit("delete", row);
        }
    }

    onInsert = (cb: (row: Array<any>) => void) => {
        this.emitter.on("insert", cb);
    }
    
    onDelete = (cb: (row: Array<any>) => void) => {
        this.emitter.on("delete", cb);
    }
}

class Database {
    tables: Map<string, Table>

    constructor() {
        this.tables = new Map();
    }

    getOrCreateTable = (tableName: string) => {
        let table;
        if (!this.tables.has(tableName)) {
            table = new Table(tableName);
            this.tables.set(tableName, table);
        } else {
            table = this.tables.get(tableName)!;
        }
        return table;
    }
}

export class SpacetimeDBClient {
    ws: WSClient;
    public db: Database;
    public emitter: EventEmitter;

    constructor(name_or_address: string) {
        this.emitter = new EventEmitter();
        this.ws = new WSClient(
            `ws://localhost:3000/database/subscribe?name_or_address=${name_or_address}`,
            'v1.text.spacetimedb',
            undefined,
            undefined,
            undefined,
            {
                maxReceivedFrameSize: 100000000,
                maxReceivedMessageSize: 100000000,
            }
        );
        this.db = new Database();
        this.ws.onmessage = (message: any) => {
            const data = JSON.parse(message.data);
            if (data) {
                if (data['SubscriptionUpdate']) {
                    let subUpdate = data['SubscriptionUpdate'];
                    const tableUpdates = subUpdate["table_updates"];
                    for (const tableUpdate of tableUpdates) {
                        const tableName = tableUpdate["table_name"];
                        const table = this.db.getOrCreateTable(tableName);
                        for (const op of tableUpdate["table_row_operations"]) {
                            if (op["op"] === "insert") {
                                table.insert(op["row_pk"], op["row"])
                            } else {
                                table.delete(op["row_pk"])
                            }
                        }
                    }
                    this.emitter.emit("initialStateSync");
                } else if (data['TransactionUpdate']) {
                    const txUpdate = data['TransactionUpdate'];
                    const subUpdate = txUpdate["subscription_update"];
                    const tableUpdates = subUpdate["table_updates"];
                    for (const tableUpdate of tableUpdates) {
                        const tableName = tableUpdate["table_name"];
                        const table = this.db.getOrCreateTable(tableName);
                        for (const op of tableUpdate["table_row_operations"]) {
                            if (op["op"] === "insert") {
                                table.insert(op["row_pk"], op["row"])
                            } else {
                                table.delete(op["row_pk"])
                            }
                        }
                    }
                    this.emitter.emit("event", txUpdate['event']);
                } else if (data['IdentityToken']) {

                }
            }
        };
    }

    call = (reducerName: String, args: Array<any>) => {
        this.ws.send(`{
            "fn": "${reducerName}",
            "args": ${JSON.stringify(args)}
        }`);
    }
}