use clap::{ArgMatches};
use duct::cmd;

pub fn cli() -> clap::Command {
    clap::Command::new("start")
        .about("Starts an english auction game")
        .after_help("Run `english-auction start --help` for more detailed information.\n`")
}

pub async fn exec(_args: &ArgMatches) -> Result<(), anyhow::Error> {
    cmd!("spacetime", "call", "english-auction", "start_tournament").run()?;
    Ok(())
}
