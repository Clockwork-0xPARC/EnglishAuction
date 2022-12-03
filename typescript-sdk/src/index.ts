import { ICloseEvent, w3cwebsocket as WSClient } from 'websocket';
export * from "./types";

type WSSubscriptionUpdateProp = {
    table_id: number;
    table_row_operations: { op: string; row_pk: string; row: any[] }[];
};

type WSEventProp = {
    timestamp: number;
    status: string;
    caller_identity: string;
    energy_quanta_used: number;
    function_call?: {
        reducer: string;
        arg_bytes: number[];
    };
};

class Database {
    public tables: Map<string, Map<string, Array<any>>>

    constructor() {
        this.tables = new Map();
    }
}

export class EAClient {
    ws: WSClient;
    public db: Database;

    constructor(name_or_address: string) {
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
                let subUpdate = data['SubscriptionUpdate'];
                if (subUpdate) {
                    const tableUpdates = subUpdate["table_updates"];
                    for (const tableUpdate of tableUpdates) {
                        const tableName = tableUpdate["table_name"];
                        let tableMap: Map<string, Array<any>>; 
                        if (!this.db.tables.has(tableName)) {
                            tableMap = new Map();
                            this.db.tables.set(tableName, tableMap);
                        } else {
                            tableMap = this.db.tables.get(tableName)!;
                        }
                        for (const op of tableUpdate["table_row_operations"]) {
                            if (op["op"] === "insert") {
                                tableMap.set(op["row_pk"], op["row"])
                            } else {
                                tableMap.delete(op["row_pk"])
                            }
                        }
                    }
                }
            }
        };
    }
}

const client = new EAClient("english-auction");
const ts = client.db.tables.get("TournamentState");
console.log(ts);
const words = client.db.tables.get("Word");
console.log(words);
