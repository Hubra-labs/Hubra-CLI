# Hubra CLI

Node.js CLI for the Hubra gasless HTTP API.

## Requirements

- Node.js 18+
- Hubra backend with the `/gasless/*` HTTP routes enabled
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
hubra config show
hubra config path
hubra manifest
hubra routes
hubra call gasless_manifest
hubra call gasless_convert_quote --json '{"fromToken": {...}, "toToken": {...}, "amount": 1, "slippageMode": "auto"}'
hubra call gasless_send_build --file ./payload.json
hubra request /gasless/manifest
hubra request /gasless/send/build --method POST --file ./payload.json
```

## Usage Notes

- `hubra manifest` fetches the backend manifest.
- `hubra routes` prints a compact route list derived from the manifest.
- `hubra config set token ...` persists CLI config under `~/.config/hubra/config.json`.
- `hubra call <routeId>` resolves the route via the manifest first, then submits the request.
- `hubra request <path>` sends a raw request by path.
