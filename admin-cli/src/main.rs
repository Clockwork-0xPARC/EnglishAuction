use std::process::exit;
use clap::{ArgMatches, Command};
use clap::error::{ContextKind, ContextValue};

mod init;
mod start;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error>{
    let (cmd, subcommand_args) = match_subcommand_or_exit(get_command());
    exec_subcommand(&cmd, &subcommand_args).await?;
    Ok(())
}

fn get_command() -> Command {
    Command::new("english-auction")
        .args_conflicts_with_subcommands(true)
        .subcommand_required(true)
        .subcommands(get_subcommands())
        .help_template(
            "\
EnglishAuction admin tool for 0xPARC demo day

Usage:
{usage}

Options:
{options}

Commands:
{subcommands}
",
        )
}

pub fn match_subcommand_or_exit(command: Command) -> (String, ArgMatches) {
    let mut command_clone = command.clone();
    let result = command.try_get_matches();
    let args = match result {
        Ok(args) => args,
        Err(e) => match e.kind() {
            clap::error::ErrorKind::MissingSubcommand => {
                let cmd = e
                    .context()
                    .find_map(|c| match c {
                        (ContextKind::InvalidSubcommand, &ContextValue::String(ref cmd)) => {
                            Some(cmd.split_ascii_whitespace().last().unwrap())
                        }
                        _ => None,
                    })
                    .expect("The InvalidArg to be present in the context of UnknownArgument.");
                match command_clone.find_subcommand_mut(cmd) {
                    Some(subcmd) => subcmd.print_help().unwrap(),
                    None => command_clone.print_help().unwrap(),
                }
                exit(0);
            }
            _ => {
                e.exit();
            }
        },
    };
    let (cmd, subcommand_args) = args.subcommand().unwrap();
    (cmd.to_string(), subcommand_args.clone())
}
pub fn get_subcommands() -> Vec<Command> {
    vec![
        init::cli(),
        start::cli(),
    ]
}
pub async fn exec_subcommand(cmd: &str, args: &ArgMatches) -> Result<(), anyhow::Error> {
    match cmd {
        "init" => init::exec(args).await,
        "start" => start::exec(args).await,
        unknown => Err(anyhow::anyhow!("Invalid subcommand: {}", unknown)),
    }
}
