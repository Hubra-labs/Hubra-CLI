# Hubra CLI

Node.js CLI for the Hubra gasless HTTP API.

## Requirements

- Node.js 18+
- Hubra backend with the `/gasless/*` HTTP routes enabled
- `HUBRA_API_URL`
- `HUBRA_CLI_API_TOKEN`

## Install locally

```bash
cd /Users/amir/development/hubra-cli
npm link
```

This exposes the `hubra` command locally.

## Install globally from a folder

```bash
npm install -g /Users/amir/development/hubra-cli
```

After that, users can run:

```bash
hubra help
```

## Publish flow

If you want users to install it with:

```bash
npm install -g hubra-cli
```

then publish this package to npm.

## Configuration

One-time config:

```bash
hubra config set api-url "https://<your-convex-site>"
hubra config set token "<token>"
```

You can still override with env vars:

```bash
export HUBRA_API_URL="https://<your-convex-site>"
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

## Notes

- `hubra manifest` fetches the backend manifest.
- `hubra routes` prints a compact route list derived from the manifest.
- `hubra config set api-url ...` and `hubra config set token ...` persist CLI config under `~/.config/hubra/config.json`.
- `hubra call <routeId>` resolves the route via the manifest first, then submits the request.
- `hubra request <path>` sends a raw request by path.
