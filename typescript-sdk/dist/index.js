"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAClient = void 0;
const spacetimedb_1 = require("./spacetimedb");
const buffer_1 = require("buffer");
__exportStar(require("./types"), exports);
class EAClient {
    constructor(host, name_or_address, credentials) {
        this.registerAsPlayer = async (playerName) => {
            this.client.call("register_player", [playerName]);
            return new Promise((resolve, reject) => {
                this.onRegistered(player => {
                    resolve(player);
                });
            });
        };
        this.makeBid = (auction_index, bid) => {
            this.client.call("make_bid", [auction_index, bid]);
        };
        this.redeemWord = (tile_ids) => {
            this.client.call("redeem_word", [tile_ids]);
        };
        this.onInitialStateSync = (cb) => {
            this.client.emitter.on("initialStateSync", cb);
        };
        this.awaitInitialStateSync = async () => {
            return new Promise((resolve, reject) => {
                this.onInitialStateSync(() => {
                    resolve();
                });
            });
        };
        this.onRegistered = (cb) => {
            var _a;
            let identity = (_a = this.getCredentials()) === null || _a === void 0 ? void 0 : _a.identity;
            if (identity) {
                for (const player of this.getAllPlayers()) {
                    if (player.id === identity) {
                        cb(player);
                    }
                }
            }
            this.onPlayerJoined(p => {
                var _a;
                if (p.id === ((_a = this.getCredentials()) === null || _a === void 0 ? void 0 : _a.identity)) {
                    cb(p);
                }
            });
        };
        this.onTransaction = (cb) => {
            this.client.emitter.on("event", cb);
        };
        this.onTournamentStateUpdate = (cb) => {
            const table = this.client.db.getOrCreateTable("TournamentState");
            table.onInsert((row) => cb({
                version: row[0],
                status: row[1],
                current_match_id: row[2],
            }));
        };
        this.onReceiveTile = (cb) => {
            const table = this.client.db.getOrCreateTable("PlayerTile");
            table.onInsert((row) => {
                cb({
                    tile_id: row[0],
                    player_id: row[1],
                });
            });
        };
        this.onTournamentPlayer = (cb) => {
            const table = this.client.db.getOrCreateTable("TournamentPlayer");
            table.onInsert((row) => {
                cb({
                    id: row[0],
                    points: row[1],
                    name: row[2],
                });
            });
        };
        this.onTileAuction = (cb) => {
            const table = this.client.db.getOrCreateTable("TileAuction");
            table.onInsert((row) => {
                cb({
                    auction_index: row[0],
                    tile_id: row[1],
                    letter: row[2],
                    start_timestamp: row[3],
                });
            });
        };
        this.onWinningBid = (cb) => {
            const table = this.client.db.getOrCreateTable("WinningBid");
            table.onInsert((row) => {
                cb({
                    auction_index: row[0],
                    player_name: row[1],
                    letter: row[2],
                    points: row[3],
                });
            });
        };
        this.onPlayerJoined = (cb) => {
            const table = this.client.db.getOrCreateTable("Player");
            table.onInsert((row) => {
                const identity = buffer_1.Buffer.from(row[0]['data'], 'utf8').toString('hex');
                cb({
                    id: identity,
                    points: row[1],
                    name: row[2],
                });
            });
        };
        this.onPlayerUpdate = (cb) => {
            const table = this.client.db.getOrCreateTable("Player");
            table.onUpdate((row) => {
                const identity = buffer_1.Buffer.from(row[0]['data'], 'utf8').toString('hex');
                cb({
                    id: identity,
                    points: row[1],
                    name: row[2],
                });
            });
        };
        this.onRedeemedWord = (cb) => {
            const table = this.client.db.getOrCreateTable("RedeemedWord");
            table.onInsert((row) => {
                cb({
                    player_name: row[0],
                    word: row[1],
                    points: row[2],
                    timestamp: row[3],
                });
            });
        };
        this.getCredentials = () => {
            if (this.client.identity) {
                return {
                    identity: this.client.identity,
                    token: this.client.token
                };
            }
            return;
        };
        this.getTournamentState = () => {
            const table = this.client.db.getOrCreateTable("TournamentState");
            for (const row of table.rows.values()) {
                return {
                    version: row[0],
                    status: row[1],
                    current_match_id: row[2],
                };
            }
            return null;
        };
        this.getAllPlayers = () => {
            const players = [];
            const table = this.client.db.getOrCreateTable("Player");
            for (const row of table.rows.values()) {
                const identity = buffer_1.Buffer.from(row[0]['data'], 'utf8').toString('hex');
                players.push({
                    id: identity,
                    points: row[1],
                    name: row[2],
                });
            }
            return players;
        };
        this.getMyPlayer = () => {
            var _a;
            const myIdentity = (_a = this.getCredentials()) === null || _a === void 0 ? void 0 : _a.identity;
            if (!myIdentity) {
                return;
            }
            const table = this.client.db.getOrCreateTable("Player");
            for (const row of table.rows.values()) {
                const identity = buffer_1.Buffer.from(row[0]['data'], 'utf8').toString('hex');
                if (identity === myIdentity) {
                    return {
                        id: identity,
                        points: row[1],
                        name: row[2],
                    };
                }
            }
            return;
        };
        this.getTileMap = () => {
            const table = this.client.db.getOrCreateTable("LetterTile");
            const tileMap = new Map();
            for (const row of table.rows.values()) {
                tileMap.set(row[0], {
                    tile_id: row[0],
                    letter: row[1],
                    point_value: row[2]
                });
            }
            return tileMap;
        };
        this.getMyTiles = () => {
            var _a;
            const tileMap = this.getTileMap();
            const table = this.client.db.getOrCreateTable("PlayerTile");
            const tiles = [];
            const myIdentity = (_a = this.getCredentials()) === null || _a === void 0 ? void 0 : _a.identity;
            if (!myIdentity) {
                return tiles;
            }
            for (const row of table.rows.values()) {
                const identity = buffer_1.Buffer.from(row[1]['data'], 'utf8').toString('hex');
                if (identity === myIdentity) {
                    tiles.push(Object.assign({}, tileMap.get(row[0])));
                }
            }
            return tiles;
        };
        this.getWords = () => {
            const table = this.client.db.getOrCreateTable("Word");
            const words = [];
            for (const row of table.rows.values()) {
                words.push(row[0]);
            }
            return words;
        };
        this.getAuctions = () => {
            const auctionTable = this.client.db.getOrCreateTable("TileAuction");
            const auctions = [];
            for (const row of auctionTable.rows.values()) {
                auctions.push({
                    auction_index: row[0],
                    tile_id: row[1],
                    letter: row[2],
                    start_timestamp: row[3],
                });
            }
            auctions.sort((a, b) => a.auction_index - b.auction_index)
                .reverse();
            return auctions;
        };
        this.getWinningBids = () => {
            const winningBidTable = this.client.db.getOrCreateTable("WinningBid");
            const bids = [];
            for (const row of winningBidTable.rows.values()) {
                bids.push({
                    auction_index: row[0],
                    player_name: row[1],
                    letter: row[2],
                    points: row[3],
                });
            }
            bids.sort((a, b) => a.auction_index - b.auction_index)
                .reverse();
            return bids;
        };
        this.getRedeemedWords = () => {
            const table = this.client.db.getOrCreateTable("RedeemedWord");
            const things = [];
            for (const row of table.rows.values()) {
                things.push({
                    player_name: row[0],
                    word: row[1],
                    points: row[2],
                    timestamp: row[3],
                });
            }
            things.sort((a, b) => b.timestamp - a.timestamp);
            return things;
        };
        this.getMatchResultMap = () => {
            const table = this.client.db.getOrCreateTable("MatchResult");
            const map = new Map();
            for (const row of table.rows.values()) {
                const matchResult = {
                    id: row[0],
                    points: row[1],
                    name: row[2],
                    match_id: row[3],
                };
                let list = map.get(matchResult.match_id);
                if (!list) {
                    list = [];
                    map.set(matchResult.match_id, list);
                }
                list.push(matchResult);
            }
            return map;
        };
        this.getTournamentPlayers = () => {
            const table = this.client.db.getOrCreateTable("TournamentPlayer");
            const things = [];
            for (const row of table.rows.values()) {
                things.push({
                    id: row[0],
                    points: row[1],
                    name: row[2],
                });
            }
            return things;
        };
        this.client = new spacetimedb_1.SpacetimeDBClient(host, name_or_address, credentials);
        this.client.db.getOrCreateTable("Player", 2);
    }
}
exports.EAClient = EAClient;
