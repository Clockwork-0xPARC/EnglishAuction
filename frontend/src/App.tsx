import { useRecoilState } from 'recoil';
import { PreStart } from './components/PreStart';
import { Scoreboard } from './components/Scoreboard';
import { tourney_state } from './state/tourney.state';
import toast, { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { lobby_state } from './state/lobby.state';
import { auction_state } from './state/auction.state';
import { winning_bid_state } from './state/winning_bid.state';
import { redeemed_word_state } from './state/redeemed_word.state';
import { EAClient, WinningBid } from '@clockworklabs/english-auction';
import { RedeemedWordList } from './components/RedeemedWordList';

const App = () => {
    const [tourneyState, setTourneyState] = useRecoilState(tourney_state);
    const [, setLobbyState] = useRecoilState(lobby_state);
    const [auctionState, setAuctionState] = useRecoilState(auction_state);
    const [winningBidState, setWinningBidState] = useRecoilState(winning_bid_state);
    const [, setRedeemedWordState] = useRecoilState(redeemed_word_state);

    const auctions = auctionState.auctions.slice().sort((a, b) => b.auction_index - a.auction_index);
    const winningBids = winningBidState.winningBids;
    const winningBidsMap = new Map<number, WinningBid>();
    for (const bid of winningBids) {
        winningBidsMap.set(bid.auction_index, bid);
    }

    const onJoin = (player: string) => {
        toast(t => (
            <div className="flex flex-col">
                <div className="mr-2">
                    <b>
                        <span>{player}</span>
                    </b>{' '}
                    has joined the lobby
                </div>
                <button
                    className="bg-gray-600 rounded-md text-white p-2 mt-2 w-[150px]"
                    onClick={() => toast.dismiss(t.id)}
                >
                    Dismiss
                </button>
            </div>
        ));
    };

    useEffect(() => {
        const client = new EAClient(window.location.hostname + ":3000", window.location.pathname !== "/" ? window.location.pathname : "english-auction");
        client.onTournamentStateUpdate(tournamentState => {
            setTourneyState({
                version: tournamentState.version,
                status: tournamentState.status,
                current_match_id: tournamentState.current_match_id,
                currentMatch: {
                    id: 0,
                    status: 0,
                    skipped_first_round: false,
                    is_last_round: false
                }
            });
        });

        client.onPlayerJoined(player => {
            const players = client.getAllPlayers();
            setLobbyState({
                players,
            });
            onJoin(player.name);
        });

        client.onTournamentPlayer(player => {
            const players = client.getAllPlayers();
            setLobbyState({
                players,
            });
        })

        client.onTileAuction(() => {
            const auctions = client.getAuctions();
            setAuctionState({
                auctions,
            });
        });
        
        client.onWinningBid(() => {
            const winningBids = client.getWinningBids();
            setWinningBidState({
                winningBids,
            });
        });
        
        client.onRedeemedWord(() => {
            const words = client.getRedeemedWords();
            setRedeemedWordState({
                words,
            });
        });

    }, [setAuctionState, setLobbyState, setTourneyState, setWinningBidState, setRedeemedWordState]);

    return (
        <div className="max-w-screen-2xl m-auto p-4 text-white">
            <Toaster position="bottom-right" />
            {tourneyState.status === -1 ? (
                <PreStart />
            ) : (
                <div className="flex w-full h-screen m-auto items-center">
                    <div className="flex flex-col w-1/4 h-full justify-around">
                        <Scoreboard />
                        <RedeemedWordList />
                    </div>
                    <div className="flex flex-col w-2/4 m-auto items-center justify-center">
                        {auctions.length > 0 &&
                            auctions.slice(0, 10).map((x, index) => (
                                <div
                                    key={index}
                                    className="my-4 w-full"
                                    style={{
                                        opacity: index !== 0 ? 0.5 : 1
                                    }}
                                >
                                    <div className="bg-card-color p-8 rounded-xl shadow-lg flex flex-col justify-center items-center">
                                        <h2 className="text-2xl">
                                            {index === 0
                                                ? `Current Round`
                                                : `Prior round`}
                                        </h2>
                                        <p className="my-4 text-lg font-bold text-yellow-500">
                                            Letter: {x.letter}
                                        </p>
                                        {index !== 0 && winningBidsMap.has(x.auction_index) && (
                                            <p className="text-faint">
                                                Bid won by{' '}
                                                <span className="text-primary">
                                                    {winningBidsMap.get(x.auction_index)!.player_name}
                                                </span>{' '}
                                                for {winningBidsMap.get(x.auction_index)!.points} point(s).
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
