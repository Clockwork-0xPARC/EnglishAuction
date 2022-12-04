import { atom } from 'recoil';
import { TileAuction } from 'english-auction';

export const auction_state = atom<{ auctions: TileAuction[] }>({
    key: 'auction_state',
    default: {
        auctions: []
    }
});
