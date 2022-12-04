import { useRecoilState } from 'recoil';
import { MAX_PLAYERS } from '../constants';
import { lobby_state } from '../state/lobby.state';

export const LobbyList = () => {
    const [lobbyState, ] = useRecoilState(lobby_state);

    return (
        <div className="flex-1 my-12 bg-card-color p-4 rounded-lg shadow-2xl">
            <div className="flex justify-between">
                <h2 className="text-lg font-bold text-primary tracking-widest uppercase">
                    Lobby
                </h2>
                <p className="text-faint text-lg">
                    {lobbyState.players.length} / {MAX_PLAYERS}
                </p>
            </div>
            <div className="flex flex-col mt-4">
                {lobbyState.players.map((player, index) => (
                    <div className="mb-4" key={index}>
                        <h3 className="font-bold">{player.name}</h3>
                        <p
                            className="truncate text-yellow-600 mt-2"
                            key={index}
                        >
                            ID: {player.id}
                        </p>
                    </div>
                ))}
            </div>
            {lobbyState.players.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    No players
                </p>
            )}
        </div>
    );
};
