# Hubra CLI

Hubra CLI provides user-facing commands for Hubra transaction flows such as send, convert, stake, earn, DCA, perp, and unstake.

## Requirements

- Node.js 18+
- Hubra backend with the `/cli/*` HTTP routes enabled
- `HUBRA_CLI_API_TOKEN`

## Installation

```bash
npm install -g @hubra-labs/hubra-cli
```

After installation, the `hubra` command is available globally:

```bash
hubra help
```

## Configuration

Set the API token once:

```bash
hubra config set token "<token>"
```

You can also provide the token via environment variable:

```bash
export HUBRA_CLI_API_TOKEN="<token>"
```

## Commands

```bash
hubra help
hubra send --help
hubra convert --help
hubra stake --help
hubra earn deposit --help
hubra earn withdraw --help
hubra perp --help
hubra limit-order --help
hubra dca --help
hubra unstake --help
hubra config show
hubra config path
hubra send 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ RAoEnBNgWR3H4L76UFtXNoJShLQ3yFSUcGPCDEzqmMb HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX 1
hubra convert 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ SOL raSOL 1
hubra stake 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ 1
hubra earn deposit 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ opportunity_123 10
hubra limit-order create 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ SOL raSOL 1 150
hubra dca create 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ SOL raSOL 10 5 86400
```

## Usage Notes

- `hubra <command> --help` prints command-specific usage and examples.
- `hubra config set token ...` persists CLI config under `~/.config/hubra/config.json`.
- High-level commands such as `send`, `convert`, `stake`, and `earn` call the backend `/cli/*` routes directly.
- The backend resolves internal details such as quote/build steps and token metadata, so the normal CLI workflow does not require JSON payload files.
