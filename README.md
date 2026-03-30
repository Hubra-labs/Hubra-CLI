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
hubra version
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
hubra send <wallet> <recipient> <mint> <amount>
hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>
hubra stake <wallet> <amount>
hubra earn deposit <wallet> <opportunityId> <amount>
hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>
hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>
```

## Usage Notes

- `hubra <command> --help` prints command-specific usage and examples.
- `hubra config set token ...` persists CLI config under `~/.config/hubra/config.json`.
- High-level commands such as `send`, `convert`, `stake`, and `earn` call the backend `/cli/*` routes directly.
- The backend resolves internal details such as quote/build steps and token metadata, so the normal CLI workflow does not require JSON payload files.
