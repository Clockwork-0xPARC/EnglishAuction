use std::cmp::min;
use std::fs::read_to_string;
use clap::{Arg, ArgMatches};
use duct::cmd;
use serde::Deserialize;
use serde::Serialize;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use clap::ArgAction::SetTrue;

#[derive(Deserialize)]
struct TileJson {
    letter: String,
    count: u32,
    scrabble_value: u32,
}

#[derive(Serialize)]
// #[spacetimedb(table)]
struct LetterTile {
    // #[unique]
    tile_id: u32,
    letter: String,
    point_value: u32,
}

pub fn cli() -> clap::Command {
    clap::Command::new("init")
        .about("Initializes an english auction game with words and letters")
        .after_help("Run `english-auction start --help` for more detailed information.\n`")
        .arg(
            Arg::new("words")
                .long("words")
                .short('w')
                .required(true)
                .value_parser(clap::value_parser!(PathBuf))
                .help("The file that contains a list of acceptable words"))
        .arg(
            Arg::new("letters")
                .long("letters")
                .short('l')
                .required(true)
                .value_parser(clap::value_parser!(PathBuf))
                .help("The file that contains an enumeration of letters"))
        .arg(
            Arg::new("path")
                .long("path")
                .short('p')
                .required(false)
                .value_parser(clap::value_parser!(PathBuf))
                .default_missing_value(".")
                .help("The path to the english auction repository"))
        .arg(
            Arg::new("clear")
                .long("clear")
                .required(false)
                .action(SetTrue)
                .help("adds --clear-database during publish"))
}

pub async fn exec(args: &ArgMatches) -> Result<(), anyhow::Error> {
    let word_file = args.get_one::<PathBuf>("words").unwrap();
    let letter_file = args.get_one::<PathBuf>("letters").unwrap();
    let english_auction_path = args.get_one::<PathBuf>("path").unwrap();
    let clear = args.get_flag("clear");

    let word_list: Vec<String> = serde_json::from_str(read_to_string(word_file)?.as_ref()).unwrap();
    let letter_list: Vec<TileJson> = serde_json::from_str(read_to_string(letter_file)?.as_ref()).unwrap();

    let mut tiles = Vec::<LetterTile>::new();
    let mut idx = 1;
    for letter in letter_list {
        for _ in 0..letter.count {
            tiles.push(LetterTile {
                tile_id: idx,
                letter: letter.letter.clone(),
                point_value: letter.scrabble_value,
            });
            idx += 1;
        }
    }

    if clear {
        cmd!("spacetime", "publish", "english-auction", "--clear-database").dir(english_auction_path).run()?;
    } else {
        cmd!("spacetime", "publish", "english-auction").dir(english_auction_path).run()?;
    }
    thread::sleep(Duration::from_secs(3));
    cmd!("spacetime", "call", "english-auction", "init_tournament").dir(english_auction_path).run()?;
    let tiles_str = serde_json::to_string(&tiles).unwrap();
    cmd!("spacetime", "call", "english-auction", "add_letters", format!("[{}]", tiles_str)).dir(english_auction_path).run()?;

    let batch_size = 10000;
    let mut word_idx = 0;
    while word_idx < word_list.len() {
        let end = word_idx + batch_size;
        let batch = &word_list[word_idx..min(end, word_list.len())];

        cmd!("spacetime", "call", "english-auction", "add_words", format!("[[\"{}\"]]", batch.join("\", \""))).dir(english_auction_path).run()?;
        word_idx += end - word_idx;
    }

    Ok(())
}
