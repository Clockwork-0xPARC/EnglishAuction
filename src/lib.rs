use rand::{SeedableRng, Rng};
use rand_chacha::ChaCha8Rng;
use spacetimedb::{spacetimedb, println, Hash};

const MAX_PLAYERS: u32 = 5;

#[spacetimedb(table)]
pub struct TournamentState {
    #[unique]
    version: u32, // Should always be zero?
    status: u32, // 0 = adding_words, 1 = registering players, 2 = waiting, 3 = playing, 4 = finished
    curr_match_index: u32,
    skip_one_round: bool,
}

#[spacetimedb(table)]
pub struct Word {
    word: String,
}

#[spacetimedb(table)]
pub struct Player {
    #[unique]
    id: Hash,
    points: u32,
}

#[spacetimedb(table)]
pub struct PlayerTile {
    player_id: Hash,
    #[unique]
    tile_id: u32,
}

#[spacetimedb(table)]
pub struct Match {
    index: u32,
}

#[spacetimedb(table)]
pub struct BagTile {
    match_index: u32,
    #[unique]
    tile_id: u32,
    letter: String,
}

#[spacetimedb(table)]
pub struct LetterTile {
    #[unique]
    tile_id: u32,
    letter: String,
    point_value: u32,
}

#[spacetimedb(table)]
pub struct TileAuction {
    #[unique]
    auction_index: u32,
    tile_id: u32,
    letter: String,
    start_timestamp: u64,
}

// TODO: Supposed to be private
#[derive(Clone)]
#[spacetimedb(table)]
struct PlayerBid {
    player_id: Hash,
    auction_index: u32,
    points: u32,
    timestamp: u64,
}

// fn get_bag_letter_count() -> u32 {
//     let mut count = 0;
//     for letter in BagLetter::iter() {
//         count += letter.count;
//     }
//     return count;
// }

// fn get_letter_count() -> u32 {
//     let mut count = 0;
//     for letter in Letter::iter() {
//         count += letter.count;
//     }
//     return count;
// }

#[spacetimedb(reducer)]
pub fn init_tournament(sender: Hash, _timestamp: u64, letters: Vec<LetterTile>) {
    // TODO: check sender

    if TournamentState::filter_by_version(0).is_some() {
        panic!("Tournament already initalized");
    }

    TournamentState::insert(TournamentState {
        version: 0,
        status: 0,
        curr_match_index: 0,
        skip_one_round: true,
    });

    for letter in letters {
        LetterTile::insert(letter);
    }

    for i in 0..10 {
        Match::insert(Match { index: i });
    }
}


#[spacetimedb(reducer)]
pub fn add_words(sender: Hash, _timestamp: u64, words: Vec<String>, final_words: bool) {
    // TODO: check sender

    let mut ts = if let Some(ts) = TournamentState::filter_by_version(0) {
        if ts.status != 0 {
            panic!("Tournament not adding words.");
        }
        ts
    } else {
        panic!("Tournament not created.");
    };

    for word in words {
        Word::insert(Word { word })
    }

    if final_words {
        ts.status = 1;
        TournamentState::update_by_version(0, ts);
    }
}

#[spacetimedb(reducer)]
pub fn register_player(sender: Hash, _timestamp: u64) {
    let num_players: u32 = Player::iter().count() as u32;
    if num_players < MAX_PLAYERS {
        if num_players == MAX_PLAYERS - 1 {
            let mut ts = TournamentState::filter_by_version(0).unwrap();
            ts.status = 2;
            TournamentState::update_by_version(0, ts);
        }
        Player::insert(Player { id: sender, points: 100 });
        return;
    }
    panic!("Already at max players.");
}

#[spacetimedb(reducer)]
pub fn run_next_match(sender: Hash, timestamp: u64) {
    // TODO: check sender

    let mut ts = if let Some(ts) = TournamentState::filter_by_version(0) {
        if ts.status != 2 {
            panic!("Tournament not waiting.");
        }
        ts
    } else {
        panic!("Tournament not created.");
    };

    ts.status = 3;
    ts.skip_one_round = true;
    let match_index = ts.curr_match_index;
    TournamentState::update_by_version(0, ts);

    for tile in LetterTile::iter() {
        BagTile::insert(BagTile { match_index, tile_id: tile.tile_id, letter: tile.letter });
    }

    // Randomly distribute 5 letters to each player
    let mut tiles = BagTile::iter().collect::<Vec<_>>();
    let mut rng = ChaCha8Rng::seed_from_u64(timestamp);
    for player in Player::iter() {
        for _ in 0..5 {
            if tiles.len() == 0 {
                panic!("Ran out of letters");
            }
            let tile_index = rng.gen_range(0..tiles.len());
            let chosen = tiles.swap_remove(tile_index);
            BagTile::delete_by_tile_id(chosen.tile_id);
            PlayerTile::insert(PlayerTile {
                player_id: player.id,
                tile_id: chosen.tile_id,
            });
        }
    }
}

#[spacetimedb(reducer, repeat = 1s)]
pub fn run_auction(timestamp: u64, _delta_time: u64) {
    let mut ts = if let Some(ts) = TournamentState::filter_by_version(0) {
        if ts.status != 3 {
            panic!("Tournament not playing.");
        }
        ts
    } else {
        panic!("Tournament not created.");
    };

    if ts.skip_one_round {
        ts.skip_one_round = false;
        TournamentState::update_by_version(0, ts);
        return;
    }

    let prev_auction_index = if let Some(curr_auction_index) = TileAuction::iter().map(|a| a.auction_index).max_by(|a, b| a.cmp(b)) {
        // determine winner
        // deduct points
        // award the tile to the winner
        let mut max_bid: Option<PlayerBid> = None;
        for bid in PlayerBid::filter_by_auction_index(curr_auction_index) {
            let player = Player::filter_by_id(bid.player_id).unwrap();
            if bid.points <= player.points {
                match max_bid.clone() {
                    Some(mb) =>  {
                        if mb.points < bid.points {
                            max_bid = Some(bid);
                        } else if mb.points == bid.points && mb.timestamp > bid.timestamp {
                            max_bid = Some(bid);
                        }
                    },
                    None => {
                        max_bid = Some(bid);
                    },
                }
            }
        }

        if let Some(max_bid) = max_bid {
            let curr_auction = TileAuction::filter_by_auction_index(curr_auction_index).unwrap();
            let mut player = Player::filter_by_id(max_bid.player_id).unwrap();
            player.points -= max_bid.points;
            PlayerTile::insert(PlayerTile {
                player_id: player.id,
                tile_id: curr_auction.tile_id,
            });
            Player::update_by_id(player.id, player);
        } else {
            // Do nothing and move on.
        };
        curr_auction_index as i32
    } else {
        -1
    };

    let mut tiles = BagTile::iter().collect::<Vec<_>>();
    if tiles.len() == 0 {
        // TODO: we're done, stop the match and wrap up.
        return;
    }

    let mut rng = ChaCha8Rng::seed_from_u64(timestamp);
    let tile_index = rng.gen_range(0..tiles.len());
    let chosen = tiles.swap_remove(tile_index);

    BagTile::delete_by_tile_id(chosen.tile_id);
    TileAuction::insert(TileAuction {
        auction_index: (prev_auction_index + 1) as u32,
        tile_id: chosen.tile_id,
        letter: chosen.letter,
        start_timestamp: timestamp,
    });
}

#[spacetimedb(reducer)]
pub fn make_bid(sender: Hash, timestamp: u64, auction_index: u32, points: u32) {
    let Some(player) = Player::filter_by_id(sender) else {
        panic!("Sender is not a player.");
    };
    
    if points == 0 {
        panic!("Must bid at least 1 point.");
    }

    if points > player.points {
        panic!("Not enough points.");
    }

    let Some(curr_auction_index) = TileAuction::iter().map(|a| a.auction_index).max_by(|a, b| a.cmp(b)) else {
        panic!("No auction running.");
    };

    if auction_index != curr_auction_index {
        panic!("Can only bid for current auction.");
    }

    PlayerBid::insert(PlayerBid {
        player_id: sender,
        auction_index,
        points,
        timestamp,
    });
}

#[spacetimedb(reducer)]
pub fn redeem_word(sender: Hash, _timestamp: u64, tile_ids: Vec<u32>) {
    let mut word = String::new();
    let mut point_value = 0;

    if tile_ids.len() == 0 {
        panic!("Must submit at least one tile.");
    }

    for tile_id in &tile_ids {
        let pt = PlayerTile::filter_by_tile_id(*tile_id).expect("You do not own the tile.");
        assert!(pt.player_id == sender, "You do not own the tile with id {}", tile_id);
        let lt = LetterTile::filter_by_tile_id(*tile_id).expect(&format!("Invalid tile id {}.", tile_id));
        point_value += lt.point_value;
        word.push_str(&lt.letter);
    }

    for tile_id in &tile_ids {
        PlayerTile::delete_by_tile_id(*tile_id);
    }

    let mut found = false;
    for w in Word::iter() {
        if word == w.word {
            found = true;
            break;
        }
    }

    if !found {
        panic!("No such word '{}'.", word);
    }

    let mut player = Player::filter_by_id(sender).expect("Not a player.");
    player.points += point_value;
    Player::update_by_id(player.id, player);
}