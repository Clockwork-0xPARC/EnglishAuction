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

    public registerAsPlayer = (playerName: string) => {
        this.client.call("register_player", [playerName]);
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
            cb({
                id: row[0],
                points: row[1],
            });
        })
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

    public getMyPoints = (): number => {
        const table = this.client.db.getOrCreateTable("Player");
        for (const row of table.rows.values()) {
            console.log(row);
        }
        return 0;
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

const client = new EAClient();
client.onInitialStateSync(() => {
    client.getMyPoints();
    // console.log(client.client.db.tables.keys());
    // client.registerAsPlayer("Tyler");
});

client.onTransaction(event => {
    // console.log(event);
})

// client.onTransaction((event) => {
//     console.log(event);
// })

// client.onTournamentStateUpdate((ts) => {
//     console.log(ts);
// })

// client.onReceiveTile((tile) => {
//     console.log(tile);
// })

// client.onTileAuction((auction) => {
//     console.log(auction);
// })

// client.onPlayerJoined((player) => {
//     console.log(player);
// })
