"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacetimeDBClient = void 0;
const events_1 = require("events");
const websocket_1 = require("websocket");
class Table {
    constructor(name, pkCol) {
        this.applyOperations = (operations) => {
            if (this.pkCol !== undefined) {
                const inserts = [];
                const deleteMap = new Map();
                for (const op of operations) {
                    if (op.op === "insert") {
                        inserts.push(op);
                    }
                    else {
                        deleteMap.set(op.row[this.pkCol], op);
                    }
                }
                for (const op of inserts) {
                    const deleteOp = deleteMap.get(op.row[this.pkCol]);
                    if (deleteOp) {
                        this.update(deleteOp.row_pk, op.row_pk, op.row);
                        deleteMap.delete(op.row[this.pkCol]);
                    }
                    else {
                        this.insert(op.row_pk, op.row);
                    }
                }
                for (const op of deleteMap.values()) {
                    this.delete(op.row_pk);
                }
            }
            else {
                for (const op of operations) {
                    if (op.op === "insert") {
                        this.insert(op.row_pk, op.row);
                    }
                    else {
                        this.delete(op.row_pk);
                    }
                }
            }
        };
        this.update = (oldPk, pk, row) => {
            this.rows.set(pk, row);
            const oldRow = this.rows.get(oldPk);
            this.rows.delete(oldPk);
            this.emitter.emit("update", row, oldRow);
        };
        this.insert = (pk, row) => {
            this.rows.set(pk, row);
            this.emitter.emit("insert", row);
        };
        this.delete = (pk) => {
            const row = this.rows.get(pk);
            this.rows.delete(pk);
            if (row) {
                this.emitter.emit("delete", row);
            }
        };
        this.onInsert = (cb) => {
            this.emitter.on("insert", cb);
        };
        this.onDelete = (cb) => {
            this.emitter.on("delete", cb);
        };
        this.onUpdate = (cb) => {
            this.emitter.on("update", cb);
        };
        this.name = name;
        this.rows = new Map();
        this.emitter = new events_1.EventEmitter();
        this.pkCol = pkCol;
    }
}
class Database {
    constructor() {
        this.getOrCreateTable = (tableName, pkCol) => {
            let table;
            if (!this.tables.has(tableName)) {
                table = new Table(tableName, pkCol);
                this.tables.set(tableName, table);
            }
            else {
                table = this.tables.get(tableName);
            }
            return table;
        };
        this.tables = new Map();
    }
}
class SpacetimeDBClient {
    constructor(host, name_or_address, credentials) {
        this.identity = undefined;
        this.token = undefined;
        this.call = (reducerName, args) => {
            const msg = `{
    "fn": "${reducerName}",
    "args": ${JSON.stringify(args)}
}`;
            this.ws.send(msg);
        };
        let headers = undefined;
        if (credentials) {
            this.identity = credentials.identity;
            this.token = credentials.token;
            headers = {
                "Authorization": `Basic ${Buffer.from("token:" + this.token).toString('base64')}`
            };
        }
        this.emitter = new events_1.EventEmitter();
        this.ws = new websocket_1.w3cwebsocket(`ws://${host}/database/subscribe?name_or_address=${name_or_address}`, 'v1.text.spacetimedb', undefined, headers, undefined, {
            maxReceivedFrameSize: 100000000,
            maxReceivedMessageSize: 100000000,
        });
        this.db = new Database();
        this.ws.onclose = (event) => {
            console.error("Closed: ", event);
        };
        this.ws.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data) {
                if (data['SubscriptionUpdate']) {
                    let subUpdate = data['SubscriptionUpdate'];
                    const tableUpdates = subUpdate["table_updates"];
                    for (const tableUpdate of tableUpdates) {
                        const tableName = tableUpdate["table_name"];
                        const table = this.db.getOrCreateTable(tableName);
                        table.applyOperations(tableUpdate["table_row_operations"]);
                    }
                    this.emitter.emit("initialStateSync");
                }
                else if (data['TransactionUpdate']) {
                    const txUpdate = data['TransactionUpdate'];
                    const subUpdate = txUpdate["subscription_update"];
                    const tableUpdates = subUpdate["table_updates"];
                    for (const tableUpdate of tableUpdates) {
                        const tableName = tableUpdate["table_name"];
                        const table = this.db.getOrCreateTable(tableName);
                        table.applyOperations(tableUpdate["table_row_operations"]);
                    }
                    this.emitter.emit("event", txUpdate['event']);
                }
                else if (data['IdentityToken']) {
                    const identityToken = data['IdentityToken'];
                    const identity = identityToken['identity'];
                    const token = identityToken['token'];
                    this.identity = identity;
                    this.token = token;
                }
            }
        };
    }
}
exports.SpacetimeDBClient = SpacetimeDBClient;
