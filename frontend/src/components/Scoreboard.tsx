import { useRecoilState } from 'recoil';
import { lobby_state } from '../state/lobby.state';

export const Scoreboard = () => {
    const [lobbyState, setLobbyState] = useRecoilState(lobby_state);

    return (
        <div className="h-2/5 mt-8 bg-card-color p-4 rounded-lg shadow-2xl">
            <h2 className="text-lg text-center font-bold tracking-widest uppercase text-primary">
                Scoreboard
            </h2>
            {lobbyState.players.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    Unavailable
                </p>
            )}
            <div className="flex flex-col mt-4">
                {lobbyState.players.map((player, index) => (
                    <div
                        className="mb-4 flex justify-between items-center"
                        key={index}
                    >
                        <h3 className="font-bold">Player {index}</h3>
                        <p
                            className="truncate text-yellow-600 mt-2"
                            key={index}
                        >
                            {player.points}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
