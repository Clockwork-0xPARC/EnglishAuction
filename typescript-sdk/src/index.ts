// import { Subject } from 'rxjs';
import { SpacetimeDBClient, SpacetimeDBEvent } from './spacetimedb';
import { LetterTile, Player, PlayerTile, TileAuction, TournamentState } from './types';
export * from "./types";

type WSSubscriptionUpdateProp = {
    table_id: number;
    table_row_operations: { op: string; row_pk: string; row: any[] }[];
};

export class EAClient {
    client: SpacetimeDBClient;

    constructor() {
        this.client = new SpacetimeDBClient("english-auction");
    }

    public registerAsPlayer = async (playerName: string): Promise<Player> => {
        this.client.call("register_player", [playerName]);
        return new Promise((resolve, reject) => {
            this.onRegistered(player => {
                resolve(player);
            });
        });
    }

    public makeBid = (auction_index: number, bid: number) => {
        this.client.call("make_bid", [auction_index, bid]);
    }

    public redeemWord = (tile_ids: number[]) => {
        this.client.call("redeem_word", [tile_ids]);
    }
    
    public onInitialStateSync = (cb: () => void) => {
        this.client.emitter.on("initialStateSync", cb);
    }

    public awaitInitialStateSync = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.onInitialStateSync(() => {
                resolve();
            })
        });
    }

    public onRegistered = (cb: (player: Player) => void) => {
        this.onPlayerJoined(p => {
            if (p.id === this.getCredentials()?.identity) {
                cb(p);
            }
        })
    }

    public onTransaction = (cb: (event: SpacetimeDBEvent) => void) => {
        this.client.emitter.on("event", cb);
    }

    public onTournamentStateUpdate = (cb: (ts: TournamentState) => void) => {
        const table = this.client.db.getOrCreateTable("TournamentState");
        table.onInsert((row) => cb({
            version: row[0],
            status: row[1],
            current_match_id: row[2],
        }));
    }

    public onReceiveTile = (cb: (tile: PlayerTile) => void) => {
        const table = this.client.db.getOrCreateTable("PlayerTile");
        table.onInsert((row) => {
            cb({
                tile_id: row[0],
                player_id: row[1],
            });
        })
    }

    public onTileAuction = (cb: (auction: TileAuction) => void) => {
        const table = this.client.db.getOrCreateTable("TileAuction");
        table.onInsert((row) => {
            cb({
                auction_index: row[0],
                tile_id: row[1],
                letter: row[2],
                start_timestamp: row[3],
            });
        })
    }

    public onPlayerJoined = (cb: (player: Player) => void) => {
        const table = this.client.db.getOrCreateTable("Player");
        table.onInsert((row) => {
            const identity = Buffer.from(row[0]['data'], 'utf8').toString('hex');
            cb({
                id: identity,
                points: row[1],
                name: row[2],
            });
        })
    }

    public getCredentials = (): { identity: string, token: string } | undefined => {
        if (this.client.identity) {
            return {
                identity: this.client.identity,
                token: this.client.token!
            };
        }
        return;
    }

    public getTournamentState = () => {
        const table = this.client.db.getOrCreateTable("TournamentState");
        for (const row of table.rows.values()) {
            return {
                version: row[0],
                status: row[1],
                current_match_id: row[2],
            };
        }
        return null;
    }

    public getMyPlayer = (): Player | undefined => {
        const myIdentity = this.getCredentials()?.identity;
        if (!myIdentity) {
            return;
        }
        const table = this.client.db.getOrCreateTable("Player");
        for (const row of table.rows.values()) {
            const identity = Buffer.from(row[0]['data'], 'utf8').toString('hex');
            if (identity === myIdentity) {
                return {
                    id: identity,
                    points: row[1],
                    name: row[2],
                }
            }
        }
        return;
    }

    public getTileMap = (): Map<number, LetterTile> => {
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
    }

    public getMyTiles = (): LetterTile[] => {
        const tileMap = this.getTileMap();
        const table = this.client.db.getOrCreateTable("PlayerTile");
        const tiles: LetterTile[] = [];
        const myIdentity = this.getCredentials()?.identity;
        if (!myIdentity) {
            return tiles;
        }
        for (const row of table.rows.values()) {
            const identity = Buffer.from(row[1]['data'], 'utf8').toString('hex');
            if (identity === myIdentity) {
                tiles.push({...tileMap.get(row[0])!});
            }
        }
        return tiles;
    }

    public getWords = (): string[] => {
        const table = this.client.db.getOrCreateTable("Word");
        const words = [];
        for (const row of table.rows.values()) {
            words.push(row[0]);
        }
        return words;
    }
}

// Everything below this is part of an example bot that uses EAClient
const checkWord = (myTiles: LetterTile[], word: string): LetterTile[] | null => {
    const tilesChosen = [];
    const myTilesRemaining = [...myTiles];
    for (const letter of word) {
        let found = false;
        for (let i = 0; i < myTilesRemaining.length;) {
            const tile = myTilesRemaining[i];
            if (tile.letter == letter) {
                tilesChosen.push({...tile});
                myTilesRemaining.splice(i, 1);
                found = true;
                break;
            } else {
                i++;
            }
        }
        if (!found) {
            return null;
        }
    }
    return tilesChosen;
};

const findRedeemableWord = (myTiles: LetterTile[], words: string[]): LetterTile[] | null => {
    for (const word of words) {
        const result = checkWord(myTiles, word);
        if (result) {
            return result;
        }
    }
    return null;
};

const client = new EAClient();
client.onInitialStateSync(async () => {
    await client.registerAsPlayer("Tyler");
    console.log(client.getCredentials());
    console.log(client.getMyPlayer());
    client.onTileAuction(auction => {
        client.makeBid(auction.auction_index, 1);
    });

    client.onReceiveTile(tile => {
        const myTiles = client.getMyTiles();
        console.log(myTiles);
        let words = client.getWords();
        words = words.filter(word => word.length < 4);
        myTiles.sort((a, b) => a.letter.localeCompare(b.letter));
        const tiles = findRedeemableWord(myTiles, words);
        if (!tiles) {
            return;
        }
        console.log("REDEEMING: ", tiles);
        const tileIds = tiles.map(tile => tile.tile_id);
        client.redeemWord(tileIds);
    });
});

// client.onTransaction((event) => {
//     console.log(event);
// })

// client.onTournamentStateUpdate((ts) => {
//     console.log(ts);
// })


// client.onTileAuction((auction) => {
//     console.log(auction);
// })

// client.onPlayerJoined((player) => {
//     console.log(player);
// })
