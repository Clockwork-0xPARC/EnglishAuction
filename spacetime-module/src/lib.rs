use rand::{SeedableRng, Rng};
use rand_chacha::ChaCha8Rng;
use spacetimedb::{spacetimedb, Hash, println};

#[spacetimedb(table)]
pub struct TournamentState {
    #[unique]
    version: u32, // The ID of this match

    /// 0 = setup stage: adding words, adding letters, registering players, etc.
    /// 1 = playing rounds
    /// 2 = tournament is done and a winner has been picked
    status: u32,

    /// The match ID of the current match. during setup when there is no match this value is set
    /// to -1. When the game is actually started this value will be >= 0.
    current_match_id: i32,

    /// The number of matches to play in a tournament
    num_matches: u32,

    /// The identity of the person who owns this tournament (admin)
    owner: Hash,

    /// The number of players allowed in the match
    max_players: u32,
}

impl TournamentState {
    fn singleton() -> TournamentState {
        TournamentState::filter_by_version(0).expect("Tournament state must be initialized.")
    }
}

#[spacetimedb(table)]
pub struct MatchState {
    #[unique]
    id: u32, // The ID of this match

    /// 0 = playing
    /// 1 = finished
    status: u32,
    skipped_first_round: bool, // Has the first round been skipped yet? (allows for initial bets)
    is_last_round: bool, // Whether or not the current round is the final auction round
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
    #[unique]
    name: String,
}

#[spacetimedb(table)]
pub struct PlayerTile {
    #[unique]
    tile_id: u32,
    player_id: Hash,
}

#[spacetimedb(table)]
pub struct BagTile {
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

#[spacetimedb(table)]
struct WinningBid {
    #[unique]
    auction_index: u32,
    player_name: String,
    letter: String,
    points: u32,
}

#[spacetimedb(table)]
struct RedeemedWord {
    #[unique]
    player_name: String,
    word: String,
    points: u32,
    timestamp: u64,
}

/// This should be called asap when the module is instantiated. Players cannot do anything
/// until this setup process is completed.
#[spacetimedb(reducer)]
pub fn init_tournament(sender: Hash, _timestamp: u64) {
    //TODO: Eventually this will be converted to the module init() function and we will have to register
    // the owner separately

    if TournamentState::filter_by_version(0).is_some() {
        panic!("Tournament has already been initialized!");
    }

    TournamentState::insert(TournamentState {
        version: 0,
        status: 0,
        current_match_id: -1,
        num_matches: 10,
        owner: sender,
        max_players: 5
    });
}

/// Sets the number of matches to play in a tournament
#[spacetimedb(reducer)]
pub fn set_num_matches(_sender: Hash, _timestamp: u64, num_matches: u32) {
    let Some(mut ts) = TournamentState::filter_by_version(0) else {
        panic!("Tournament has not been initialized!");
    };
    ts.num_matches = num_matches;
    TournamentState::update_by_version(0, ts);
}

/// Sets the maximum number of players allowed in the match
#[spacetimedb(reducer)]
pub fn set_max_players(_sender: Hash, _timestamp: u64, max_players: u32) {
    let Some(mut ts) = TournamentState::filter_by_version(0) else {
        panic!("Tournament has not been initialized!");
    };
    ts.max_players = max_players;
    TournamentState::update_by_version(0, ts);
}

/// Adds a set of letters to the database. These letters must all have unique tile ids.
#[spacetimedb(reducer)]
pub fn add_letters(_sender: Hash, _timestamp: u64, letters: Vec<LetterTile>) {
    let ts = TournamentState::singleton();
    if ts.status != 0 {
        println!("Tournament is not in setup state!");
        panic!();
    }
    // TODO: assert!(sender.eq(&ts.owner), "You are not the admin user!");

    for letter in letters {
        if LetterTile::filter_by_tile_id(letter.tile_id).is_some() {
            println!("Tile added twice: {}", letter.tile_id);
            panic!();
        }
        LetterTile::insert(letter);
    }
    println!("Letters added.");
}

/// Adds a set of words to the database. These words must all be unique.
#[spacetimedb(reducer)]
pub fn add_words(_sender: Hash, _timestamp: u64, words: Vec<String>) {
    let ts = TournamentState::singleton();
    if ts.status != 0 {
        println!("Tournament is not in setup state!");
        panic!();
    }
    // TODO: assert!(sender.eq(&ts.owner), "You are not the admin user!");

    for word in words {
        Word::insert(Word { word })
    }
    println!("Words added.");
}

/// Called by players to register themself for the round. The tournament must be in the setup
/// stage in order for this to be successful.
#[spacetimedb(reducer)]
pub fn register_player(sender: Hash, _timestamp: u64, name: String) {
    if name.len() == 0 {
        println!("Invalid player name: {}", name);
        panic!();
    }

    let ts = TournamentState::singleton();

    for player in Player::iter() {
        if player.name.to_lowercase() == name.to_lowercase() {
            println!("Name already taken.");
            panic!();
        }
    }

    let num_players: u32 = Player::iter().count() as u32;
    if num_players < ts.max_players {
        Player::insert(Player { id: sender, points: 100, name});
        return;
    }

    println!("Already at max players: {}/{}", num_players, ts.max_players);
    panic!();
}

/// Starts a tournament that either has not been started or is in the finished status.
#[spacetimedb(reducer)]
pub fn start_tournament(_sender: Hash, timestamp: u64) {
    // TODO: assert!(sender.eq(&ts.owner), "You are not the admin user!");
    let mut ts = TournamentState::singleton();
    if ts.status != 0 && ts.status != 2 {
        println!("Tournament not in setup or complete state.");
        panic!();
    }

    // Start the tournament!
    ts.status = 1;
    ts.current_match_id = -1;
    TournamentState::update_by_version(0, ts);

    // Call reset round to start the game
    reset_match(timestamp);
}

/// Called at the start of every round. This will automatically increase the current match id
/// in the tournament state. If there are no matches remaining it will also end the tournament.
pub fn reset_match(timestamp: u64) {
    let mut ts = TournamentState::singleton();
    let new_match_id = ts.current_match_id + 1;
    if new_match_id as u32 >= ts.num_matches {
        println!("We're done playing for now, thanks for playing!");
        ts.status = 2;
        TournamentState::update_by_version(0, ts);

        // TODO: Important: Determine winner here!!
        return;
    }

    // Update the current match ID
    ts.current_match_id = new_match_id;
    TournamentState::update_by_version(0, ts);

    // Insert new match metadata
    MatchState::insert(MatchState {
        id: new_match_id as u32,
        status: 0,
        skipped_first_round: false,
        is_last_round: false,
    });

    // Reset the BagTile table
    for tile in BagTile::iter() {
        BagTile::delete_by_tile_id(tile.tile_id);
    }
    for tile in LetterTile::iter() {
        BagTile::insert(BagTile { tile_id: tile.tile_id, letter: tile.letter });
    }

    // Reset all players letters, they are about to receive new letters
    for tile in PlayerTile::iter() {
        PlayerTile::delete_by_tile_id(tile.tile_id);
    }

    // Randomly distribute 5 letters to each player
    let mut tiles = BagTile::iter().collect::<Vec<_>>();
    let mut rng = ChaCha8Rng::seed_from_u64(timestamp);
    for player in Player::iter() {
        for _ in 0..5 {
            if tiles.len() == 0 {
                println!("Ran out of letters");
                panic!();
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

    // This match is now started!
}

#[spacetimedb(reducer, repeat = 1s)]
pub fn run_auction(timestamp: u64, _delta_time: u64) {
    let Some(ts) = TournamentState::filter_by_version(0) else {
        println!("Cannot run auction yet, the tournament has not been initialized!");
        return;
    };

    if ts.status != 1 {
        println!("Tournament not in playing state");
        return;
    }

    let Some(mut current_match) = MatchState::filter_by_id(ts.current_match_id as u32) else {
        println!("No current match!");
        return;
    };

    // This match is complete and we are likely waiting to setup the next match
    if current_match.status == 1 {
        return;
    }

    // We must skip the first round so that everyone has at least one second to bid
    if !current_match.skipped_first_round {
        current_match.skipped_first_round = true;
        MatchState::update_by_id(current_match.id, current_match);
        return;
    }

    // If this is the final round we will determine a round winner and reset the game
    if current_match.is_last_round {
        let match_id = current_match.id;
        current_match.status = 1;
        MatchState::update_by_id(current_match.id, current_match);

        // // TODO: Assign some match points here to the winner of the match? Maybe wait here for a bit before next round?
        let mut most_points: Vec<Player> = Vec::<Player>::new();
        let winner_points = 0;
        for player in Player::iter() {
            if player.points == winner_points {
                most_points.push(player);
            } else if player.points > winner_points {
                most_points.clear();
                most_points.push(player);
            }
        }

        if most_points.len() == 1 {
            println!("Player '{}' won match {} with {} points!", most_points[0].name, match_id, winner_points);
            // TODO give them something for winning!
        } else if most_points.len() > 1 {
            let mut players = most_points[0].name.to_string();
            for player_name in most_points {
                players.push_str(player_name.name.as_ref());
            }
            println!("Match {} resulted in a tie between these players: {}", match_id, players);

            // TODO: What if there are multiple winners?
        } else {
            println!("Nobody won match {}", match_id);
        }

        reset_match(timestamp);
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
            let player_name = player.name.clone();
            player.points -= max_bid.points;
            PlayerTile::insert(PlayerTile {
                player_id: player.id,
                tile_id: curr_auction.tile_id,
            });
            println!("Player {} won the auction", player.name);
            Player::update_by_id(player.id, player);
            WinningBid::insert(WinningBid {
                auction_index: curr_auction.auction_index,
                player_name,
                points: max_bid.points,
                letter: curr_auction.letter,
            });
        } else {
            println!("Nobody won the auction")
            // Do nothing and move on.
        };
        curr_auction_index as i32
    } else {
        -1
    };

    let mut tiles = BagTile::iter().collect::<Vec<_>>();
    if tiles.len() == 0 {
        current_match.is_last_round = true;
        MatchState::update_by_id(current_match.id, current_match);
        return;
    }

    let mut rng = ChaCha8Rng::seed_from_u64(timestamp);
    let tile_index = rng.gen_range(0..tiles.len());
    let chosen = tiles.swap_remove(tile_index);

    BagTile::delete_by_tile_id(chosen.tile_id);
    TileAuction::insert(TileAuction {
        auction_index: (prev_auction_index + 1) as u32,
        tile_id: chosen.tile_id,
        letter: chosen.letter.clone(),
        start_timestamp: timestamp,
    });

    println!("Now auctioning letter: {} Remaining Letters: {}", chosen.letter, BagTile::iter().count());
}

/// This reducer is called by players to set/increase their bid. Players are allowed to have more
/// than one bid per round. Players are not allowed to bid for future rounds or rounds that have
/// already happened.
#[spacetimedb(reducer)]
pub fn make_bid(sender: Hash, timestamp: u64, auction_index: u32, points: u32) {
    let Some(player) = Player::filter_by_id(sender) else {
        println!("Sender is not a player.");
        panic!();
    };

    if points == 0 {
        println!("Must bid at least 1 point.");
        panic!();
    }

    if points > player.points {
        println!("Not enough points.");
        panic!();
    }

    let Some(curr_auction_index) = TileAuction::iter().map(|a| a.auction_index).max_by(|a, b| a.cmp(b)) else {
        println!("No auction running.");
        panic!();
    };

    if auction_index != curr_auction_index {
        println!("Can only bid for current auction.");
        panic!();
    }

    let player = Player::filter_by_id(sender).unwrap();

    println!("{} bids for {}", player.name, points);
    PlayerBid::insert(PlayerBid {
        player_id: sender,
        auction_index,
        points,
        timestamp,
    });
}

/// This is called by players to spend their letters to gain points which can then be used
/// to buy more letters at an auction
#[spacetimedb(reducer)]
pub fn redeem_word(sender: Hash, timestamp: u64, tile_ids: Vec<u32>) {
    let mut word = String::new();
    let mut point_value = 0;

    if tile_ids.len() == 0 {
        println!("Must submit at least one tile.");
        panic!();
    }

    for tile_id in &tile_ids {
        let pt = PlayerTile::filter_by_tile_id(*tile_id).expect(&format!("F: You do not own the tile with id {}", tile_id));
        if pt.player_id != sender {
            println!("You do not own the tile with id {}", tile_id);
            panic!();
        }
        let lt = LetterTile::filter_by_tile_id(*tile_id).expect(&format!("Invalid tile id {}.", tile_id));
        point_value += lt.point_value;
        word.push_str(&lt.letter);
    }

    for tile_id in &tile_ids {
        PlayerTile::delete_by_tile_id(*tile_id);
    }

    if !check_word(&word) {
        println!("No such word '{}'.", word);
        panic!();
    }

    let mut player = Player::filter_by_id(sender).expect("Not a player.");
    player.points += point_value;

    println!("Player {} redeemed word '{}' for {} points!", player.name, word, point_value);
    RedeemedWord::insert(RedeemedWord {
        player_name: player.name.clone(),
        word,
        points: point_value,
        timestamp,
    });
    Player::update_by_id(player.id, player);
}

fn check_word(word: &str) -> bool {
    for w in Word::iter() {
        if word == w.word {
            return true;
        }
    }
    false
}
