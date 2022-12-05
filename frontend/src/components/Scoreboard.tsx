import { useRecoilState } from 'recoil';
import { lobby_state } from '../state/lobby.state';

export const Scoreboard = () => {
    const [lobbyState, ] = useRecoilState(lobby_state);
    const players = lobbyState.players.slice();
    players.sort((a, b) => b.points - a.points);
    return (
        <div className="h-2/5 mt-8 bg-card-color p-4 rounded-lg shadow-2xl">
            <h2 className="text-lg text-center font-bold tracking-widest uppercase text-primary">
                Scoreboard
            </h2>
            {players.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    Unavailable
                </p>
            )}
            <div className="flex flex-col mt-4">
                {players.map((player, index) => (
                    <div className="mb-4" key={index}>
                        <div
                            className="flex justify-between items-center"
                            key={index}
                        >
                            <h3 className="font-bold">{player.name}</h3>
                            <p
                                className="truncate text-yellow-600"
                                key={index}
                            >
                                {player.points}
                            </p>
                        </div>
                        <p
                            className="truncate text-yellow-600 mt-2"
                            key={index}
                        >
                            ID: {player.id}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
