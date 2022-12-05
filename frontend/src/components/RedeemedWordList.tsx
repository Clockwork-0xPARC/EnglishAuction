import { useRecoilState } from 'recoil';
import { redeemed_word_state } from '../state/redeemed_word.state';

export const RedeemedWordList = () => {
    const [redeemedWordState, ] = useRecoilState(redeemed_word_state);
    const words = redeemedWordState.words.slice();

    return (
        <div className="flex-1 my-12 bg-card-color p-4 rounded-lg shadow-2xl">
            <div className="flex justify-center">
                <h2 className="text-lg font-bold text-primary tracking-widest uppercase">
                    Recently redeemed words
                </h2>
            </div>
            <div className="flex flex-col mt-4 max-h-96 overflow-scroll">
                {words.map((word, index) => (
                    <div className="flex mb-2 justify-between" key={index}>
                        <h3 className="font-bold">{word.player_name}</h3>
                        <span>
                            "{word.word}" (
                            <span
                                className="text-yellow-600"
                                key={index}
                            >{word.points}</span>
                            {" "}points)
                        </span>
                    </div>
                ))}
            </div>
            {words.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    No words 
                </p>
            )}
        </div>
    );
};
