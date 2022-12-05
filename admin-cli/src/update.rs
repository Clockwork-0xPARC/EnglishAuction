

use clap::{Arg, ArgMatches};
use duct::cmd;







pub fn cli() -> clap::Command {
    clap::Command::new("update")
        .about("Updates the configuration of an initialized game.")
        .after_help("Run `english-auction update --help` for more detailed information.\n`")
        .arg(Arg::new("matches")
                .long("matches")
                .short('m')
                .required(false)
                .help("The number of matches to play in a tournament"))
        .arg(Arg::new("players")
                .long("players")
                .short('p')
                .required(false)
                .help("The number of players to allow to register in the tournament"))
}

pub async fn exec(args: &ArgMatches) -> Result<(), anyhow::Error> {
    let matches = args.get_one::<u32>("matches");
    let players = args.get_one::<u32>("players");

    if let Some(matches) = matches {
        cmd!("spacetime", "call", "english-auction", "set_max_matches", format!("[{}]", matches)).run()?;
    }

    if let Some(players) = players {
        cmd!("spacetime", "call", "english-auction", "set_max_players", format!("[{}]", players)).run()?;
    }

    Ok(())
}
