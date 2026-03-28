import { apiRequest, fetchManifest, parsePayloadSource, resolveRoute } from "./api-client.mjs";
import { getConfigPath, readConfig, updateConfig } from "./config.mjs";

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Hubra CLI

Usage:
  hubra help
  hubra manifest
  hubra routes
  hubra config path
  hubra config show
  hubra config set api-url <value>
  hubra config set token <value>
  hubra call <routeId> [--json <json>] [--file <path>]
  hubra request <path> [--method <GET|POST>] [--json <json>] [--file <path>]

Environment:
  HUBRA_API_URL
  HUBRA_CLI_API_TOKEN
`);
}

function parseOptions(argv) {
  const positionals = [];
  const options = {
    method: undefined,
    json: undefined,
    file: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--method") {
      options.method = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--json") {
      options.json = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--file") {
      options.file = argv[i + 1];
      i += 1;
      continue;
    }

    positionals.push(token);
  }

  return { positionals, options };
}

async function handleManifest() {
  const manifest = await fetchManifest();
  printJson(manifest);
}

async function handleRoutes() {
  const manifest = await fetchManifest();
  const routes = manifest.routes ?? [];

  const output = routes.map((route) => ({
    id: route.id,
    method: route.method,
    path: route.path,
    summary: route.summary,
  }));

  printJson(output);
}

async function handleCall(positionals, options) {
  const routeId = positionals[1];

  if (!routeId) {
    throw new Error("Missing route id. Usage: hubra call <routeId> [--json <json>] [--file <path>]");
  }

  const { route } = await resolveRoute(routeId);
  const body = await parsePayloadSource(options);
  const method = route.method ?? "GET";

  if (method === "GET" && body !== null) {
    throw new Error(`Route ${routeId} is GET and does not accept a request body`);
  }

  const response = await apiRequest(route.path, {
    method,
    body,
  });

  printJson(response);
}

async function handleRequest(positionals, options) {
  const path = positionals[1];

  if (!path) {
    throw new Error("Missing path. Usage: hubra request <path> [--method <GET|POST>] [--json <json>] [--file <path>]");
  }

  const method = (options.method ?? "GET").toUpperCase();
  const body = await parsePayloadSource(options);

  if (method === "GET" && body !== null) {
    throw new Error("GET requests cannot be sent with --json or --file");
  }

  const response = await apiRequest(path, {
    method,
    body,
  });

  printJson(response);
}

async function handleConfig(positionals) {
  const subcommand = positionals[1];

  if (!subcommand || subcommand === "show") {
    const config = await readConfig();
    printJson({
      path: getConfigPath(),
      config,
    });
    return;
  }

  if (subcommand === "path") {
    console.log(getConfigPath());
    return;
  }

  if (subcommand === "set") {
    const key = positionals[2];
    const value = positionals[3];

    if (!key || !value) {
      throw new Error("Usage: hubra config set <api-url|token> <value>");
    }

    if (key !== "api-url" && key !== "token") {
      throw new Error("Config key must be one of: api-url, token");
    }

    const configKey = key === "api-url" ? "apiUrl" : "token";
    const next = await updateConfig(configKey, value);

    printJson({
      ok: true,
      path: getConfigPath(),
      config: next,
    });
    return;
  }

  throw new Error(`Unknown config command: ${subcommand}`);
}

export async function main(argv) {
  const { positionals, options } = parseOptions(argv.slice(2));
  const command = positionals[0] ?? "help";

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "manifest") {
    await handleManifest();
    return;
  }

  if (command === "routes") {
    await handleRoutes();
    return;
  }

  if (command === "config") {
    await handleConfig(positionals);
    return;
  }

  if (command === "call") {
    await handleCall(positionals, options);
    return;
  }

  if (command === "request") {
    await handleRequest(positionals, options);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}
