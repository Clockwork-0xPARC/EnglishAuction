import { SpacetimeDBClient, SpacetimeDBEvent } from './spacetimedb';
export * from "./types";
import { LetterTile, Player, PlayerTile, RedeemedWord, TileAuction, TournamentState, WinningBid } from './types';
export declare class EAClient {
    client: SpacetimeDBClient;
    constructor(host: string, name_or_address: string, credentials?: {
        identity: string;
        token: string;
    });
    registerAsPlayer: (playerName: string) => Promise<Player>;
    makeBid: (auction_index: number, bid: number) => void;
    redeemWord: (tile_ids: number[]) => void;
    onInitialStateSync: (cb: () => void) => void;
    awaitInitialStateSync: () => Promise<void>;
    onRegistered: (cb: (player: Player) => void) => void;
    onTransaction: (cb: (event: SpacetimeDBEvent) => void) => void;
    onTournamentStateUpdate: (cb: (ts: TournamentState) => void) => void;
    onReceiveTile: (cb: (tile: PlayerTile) => void) => void;
    onTileAuction: (cb: (auction: TileAuction) => void) => void;
    onWinningBid: (cb: (winningBid: WinningBid) => void) => void;
    onPlayerJoined: (cb: (player: Player) => void) => void;
    onPlayerUpdate: (cb: (player: Player) => void) => void;
    onRedeemedWord: (cb: (word: RedeemedWord) => void) => void;
    getCredentials: () => {
        identity: string;
        token: string;
    } | undefined;
    getTournamentState: () => {
        version: any;
        status: any;
        current_match_id: any;
    } | null;
    getAllPlayers: () => Player[];
    getMyPlayer: () => Player | undefined;
    getTileMap: () => Map<number, LetterTile>;
    getMyTiles: () => LetterTile[];
    getWords: () => string[];
    getAuctions: () => TileAuction[];
    getWinningBids: () => WinningBid[];
    getRedeemedWords: () => RedeemedWord[];
}
