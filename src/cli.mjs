import { apiRequest, fetchManifest } from "./api-client.mjs";
import { getConfigPath, readConfig, updateConfig } from "./config.mjs";

const COMMAND_SPECS = {
  send: {
    description: "Build a token send transaction.",
    usage: ["hubra send <wallet> <recipient> <mint> <amount>", "hubra send --help"],
    examples: [
      "hubra send 7EUXTWW8ppz8oHwPSXzW1StxQxLQrbtFs9bmMaZ9eEFJ RAoEnBNgWR3H4L76UFtXNoJShLQ3yFSUcGPCDEzqmMb HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX 1",
    ],
  },
  convert: {
    description: "Resolve tokens, quote, and build a conversion transaction.",
    usage: ["hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>", "hubra convert --help"],
    examples: [
      "hubra convert 7EUX... So11111111111111111111111111111111111111112 HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX 1",
      "hubra convert 7EUX... SOL raSOL 1",
    ],
    notes: ["Use --slippage-mode auto to override the default slippage mode."],
  },
  burn: {
    description: "Build close-account transactions for token accounts.",
    usage: ["hubra burn <wallet> <mint1> [mint2 ...]", "hubra burn --help"],
    examples: ["hubra burn 7EUX... EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  stake: {
    description: "Build a staking transaction.",
    usage: ["hubra stake <wallet> <amount>", "hubra stake --help"],
    examples: ["hubra stake 7EUX... 1"],
  },
  earn: {
    description: "Build earn deposit and withdrawal transactions.",
    usage: ["hubra earn <subcommand> ...", "hubra earn --help"],
    subcommands: {
      deposit: {
        description: "Build an earn deposit transaction.",
        usage: ["hubra earn deposit <wallet> <opportunityId> <amount>", "hubra earn deposit --help"],
        examples: ["hubra earn deposit 7EUX... opportunity_123 10"],
        notes: ["Use --leverage <number> for multiply-style flows."],
      },
      withdraw: {
        description: "Build an earn withdrawal transaction.",
        usage: ["hubra earn withdraw <wallet> <positionTokenOrMint> <amount>", "hubra earn withdraw --help"],
        examples: ["hubra earn withdraw 7EUX... raSOL 1.5"],
      },
    },
  },
  perp: {
    description: "Build perpetual futures transactions.",
    usage: ["hubra perp <subcommand> ...", "hubra perp --help"],
    subcommands: {
      open: {
        description: "Build an open-position transaction.",
        usage: ["hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>", "hubra perp open --help"],
        examples: ["hubra perp open 7EUX... SOL long 100 5"],
        notes: ["Use --slippage-bps <number> to override the default slippage."],
      },
      close: {
        description: "Build a close-position transaction.",
        usage: ["hubra perp close <wallet> <market> <side>", "hubra perp close --help"],
        examples: ["hubra perp close 7EUX... SOL short"],
        notes: ["Use --slippage-bps <number> to override the default slippage."],
      },
    },
  },
  "limit-order": {
    description: "Create or cancel a limit order.",
    usage: ["hubra limit-order <subcommand> ...", "hubra limit-order --help"],
    subcommands: {
      create: {
        description: "Build a limit-order creation transaction.",
        usage: ["hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>", "hubra limit-order create --help"],
        examples: ["hubra limit-order create 7EUX... SOL raSOL 1 150"],
      },
      cancel: {
        description: "Build a limit-order cancellation transaction.",
        usage: ["hubra limit-order cancel <wallet> <orderKey>", "hubra limit-order cancel --help"],
        examples: ["hubra limit-order cancel 7EUX... 7y4...orderKey"],
      },
    },
  },
  dca: {
    description: "Create or cancel recurring orders.",
    usage: ["hubra dca <subcommand> ...", "hubra dca --help"],
    subcommands: {
      create: {
        description: "Build a DCA creation transaction.",
        usage: ["hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>", "hubra dca create --help"],
        examples: ["hubra dca create 7EUX... SOL raSOL 10 5 86400"],
      },
      cancel: {
        description: "Build a DCA cancellation transaction.",
        usage: ["hubra dca cancel <wallet> <orderKey>", "hubra dca cancel --help"],
        examples: ["hubra dca cancel 7EUX... 7y4...orderKey"],
      },
    },
  },
  unstake: {
    description: "Build an unstake transaction for LSTs or native stake accounts.",
    usage: ["hubra unstake <wallet> <amount> [--token <mintOrSymbol> | --stake-account <address> --total-balance <amount>]", "hubra unstake --help"],
    examples: [
      "hubra unstake 7EUX... 1 --token raSOL",
      "hubra unstake 7EUX... 1 --stake-account 8F5...stake --total-balance 10",
    ],
    notes: ["Use --mode slow or --mode instant for native stake accounts."],
  },
  tx: {
    description: "Submit user-signed Hubra transactions.",
    usage: ["hubra tx sign-and-send <signedTransaction...>", "hubra tx --help"],
    subcommands: {
      "sign-and-send": {
        description: "Submit one or more signed base64 transactions.",
        usage: ["hubra tx sign-and-send <signedTransaction...>", "hubra tx sign-and-send --help"],
        examples: ["hubra tx sign-and-send <base64Transaction>"],
      },
    },
  },
};

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseOptions(argv) {
  const positionals = [];
  const options = {
    flags: {},
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];

      if (!next || next.startsWith("--")) {
        options.flags[key] = true;
        continue;
      }

      options.flags[key] = next;
      i += 1;
      continue;
    }

    positionals.push(token);
  }

  return { positionals, options };
}

function isHelpToken(value) {
  return value === "help" || value === "--help" || value === "-h";
}

function printSpecHelp(commandName, spec, subcommandName) {
  const title = subcommandName ? `${commandName} ${subcommandName}` : commandName;
  const sections = ["Hubra CLI", "", title, `  ${spec.description}`, "", "Usage:"];

  for (const line of spec.usage) {
    sections.push(`  ${line}`);
  }

  if (spec.notes?.length) {
    sections.push("", "Notes:");
    for (const note of spec.notes) {
      sections.push(`  ${note}`);
    }
  }

  if (spec.subcommands) {
    sections.push("", "Subcommands:");
    for (const [name, childSpec] of Object.entries(spec.subcommands)) {
      sections.push(`  ${name.padEnd(14)} ${childSpec.description}`);
    }
  }

  if (spec.examples?.length) {
    sections.push("", "Examples:");
    for (const example of spec.examples) {
      sections.push(`  ${example}`);
    }
  }

  console.log(sections.join("\n"));
}

function printMainHelp() {
  const lines = Object.entries(COMMAND_SPECS).map(([name, spec]) => `  ${name.padEnd(12)} ${spec.description}`);

  console.log(`Hubra CLI

Usage:
  hubra <command> [<subcommand>] ...
  hubra <command> --help
  hubra config show
  hubra config path
  hubra config set api-url <value>
  hubra config set token <value>

Commands:
${lines.join("\n")}

Examples:
  hubra send 7EUX... RAoE... HUBsve... 1
  hubra convert 7EUX... SOL raSOL 1
  hubra stake 7EUX... 1
  hubra earn deposit 7EUX... opportunity_123 10
  hubra config set token "<token>"
`);
}

function requireArg(positionals, index, message) {
  const value = positionals[index];

  if (!value) {
    throw new Error(message);
  }

  return value;
}

function parseNumber(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return parsed;
}

function parseOptionalNumber(value, fieldName) {
  if (value == null) {
    return undefined;
  }

  return parseNumber(value, fieldName);
}

async function runCommand(path, body) {
  const response = await apiRequest(path, {
    method: "POST",
    body,
  });

  printJson(response);
}

async function handleManifest() {
  const manifest = await fetchManifest();
  printJson(manifest);
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

async function handleSend(positionals) {
  const wallet = requireArg(positionals, 1, "Usage: hubra send <wallet> <recipient> <mint> <amount>");
  const recipient = requireArg(positionals, 2, "Usage: hubra send <wallet> <recipient> <mint> <amount>");
  const mint = requireArg(positionals, 3, "Usage: hubra send <wallet> <recipient> <mint> <amount>");
  const amount = parseNumber(requireArg(positionals, 4, "Usage: hubra send <wallet> <recipient> <mint> <amount>"), "amount");

  await runCommand("/cli/send", {
    wallet,
    recipient,
    mint,
    amount,
  });
}

async function handleConvert(positionals, options) {
  const wallet = requireArg(positionals, 1, "Usage: hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>");
  const from = requireArg(positionals, 2, "Usage: hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>");
  const to = requireArg(positionals, 3, "Usage: hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>");
  const amount = parseNumber(
    requireArg(positionals, 4, "Usage: hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>"),
    "amount"
  );

  await runCommand("/cli/convert", {
    wallet,
    from,
    to,
    amount,
    slippageMode: options.flags["slippage-mode"] || undefined,
  });
}

async function handleBurn(positionals) {
  const wallet = requireArg(positionals, 1, "Usage: hubra burn <wallet> <mint1> [mint2 ...]");
  const mints = positionals.slice(2);

  if (mints.length === 0) {
    throw new Error("Usage: hubra burn <wallet> <mint1> [mint2 ...]");
  }

  await runCommand("/cli/burn", {
    wallet,
    mints,
  });
}

async function handleStake(positionals) {
  const wallet = requireArg(positionals, 1, "Usage: hubra stake <wallet> <amount>");
  const amount = parseNumber(requireArg(positionals, 2, "Usage: hubra stake <wallet> <amount>"), "amount");

  await runCommand("/cli/stake", {
    wallet,
    amount,
  });
}

async function handleEarn(positionals, options) {
  const subcommand = positionals[1];

  if (!subcommand) {
    printSpecHelp("earn", COMMAND_SPECS.earn);
    return;
  }

  if (subcommand === "deposit") {
    const wallet = requireArg(positionals, 2, "Usage: hubra earn deposit <wallet> <opportunityId> <amount>");
    const opportunityId = requireArg(positionals, 3, "Usage: hubra earn deposit <wallet> <opportunityId> <amount>");
    const amount = parseNumber(requireArg(positionals, 4, "Usage: hubra earn deposit <wallet> <opportunityId> <amount>"), "amount");

    await runCommand("/cli/earn/deposit", {
      wallet,
      opportunityId,
      amount,
      leverage: parseOptionalNumber(options.flags.leverage, "leverage"),
    });
    return;
  }

  if (subcommand === "withdraw") {
    const wallet = requireArg(positionals, 2, "Usage: hubra earn withdraw <wallet> <positionTokenOrMint> <amount>");
    const positionToken = requireArg(positionals, 3, "Usage: hubra earn withdraw <wallet> <positionTokenOrMint> <amount>");
    const amount = parseNumber(
      requireArg(positionals, 4, "Usage: hubra earn withdraw <wallet> <positionTokenOrMint> <amount>"),
      "amount"
    );

    await runCommand("/cli/earn/withdraw", {
      wallet,
      positionToken,
      amount,
    });
    return;
  }

  throw new Error(`Unknown earn subcommand: ${subcommand}`);
}

async function handlePerp(positionals, options) {
  const subcommand = positionals[1];

  if (!subcommand) {
    printSpecHelp("perp", COMMAND_SPECS.perp);
    return;
  }

  if (subcommand === "open") {
    const wallet = requireArg(positionals, 2, "Usage: hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>");
    const market = requireArg(positionals, 3, "Usage: hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>");
    const side = requireArg(positionals, 4, "Usage: hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>");
    const collateralUsd = parseNumber(
      requireArg(positionals, 5, "Usage: hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>"),
      "collateralUsd"
    );
    const leverage = parseNumber(requireArg(positionals, 6, "Usage: hubra perp open <wallet> <market> <side> <collateralUsd> <leverage>"), "leverage");

    await runCommand("/cli/perp/open", {
      wallet,
      market,
      side,
      collateralUsd,
      leverage,
      slippageBps: parseOptionalNumber(options.flags["slippage-bps"], "slippageBps"),
    });
    return;
  }

  if (subcommand === "close") {
    const wallet = requireArg(positionals, 2, "Usage: hubra perp close <wallet> <market> <side>");
    const market = requireArg(positionals, 3, "Usage: hubra perp close <wallet> <market> <side>");
    const side = requireArg(positionals, 4, "Usage: hubra perp close <wallet> <market> <side>");

    await runCommand("/cli/perp/close", {
      wallet,
      market,
      side,
      slippageBps: parseOptionalNumber(options.flags["slippage-bps"], "slippageBps"),
    });
    return;
  }

  throw new Error(`Unknown perp subcommand: ${subcommand}`);
}

async function handleLimitOrder(positionals, options) {
  const subcommand = positionals[1];

  if (!subcommand) {
    printSpecHelp("limit-order", COMMAND_SPECS["limit-order"]);
    return;
  }

  if (subcommand === "create") {
    const wallet = requireArg(positionals, 2, "Usage: hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>");
    const from = requireArg(positionals, 3, "Usage: hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>");
    const to = requireArg(positionals, 4, "Usage: hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>");
    const amount = parseNumber(
      requireArg(positionals, 5, "Usage: hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>"),
      "amount"
    );
    const targetPrice = parseNumber(
      requireArg(positionals, 6, "Usage: hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>"),
      "targetPrice"
    );

    await runCommand("/cli/limit-order/create", {
      wallet,
      from,
      to,
      amount,
      targetPrice,
      slippageMode: options.flags["slippage-mode"] || undefined,
    });
    return;
  }

  if (subcommand === "cancel") {
    const wallet = requireArg(positionals, 2, "Usage: hubra limit-order cancel <wallet> <orderKey>");
    const orderKey = requireArg(positionals, 3, "Usage: hubra limit-order cancel <wallet> <orderKey>");

    await runCommand("/cli/limit-order/cancel", {
      wallet,
      orderKey,
    });
    return;
  }

  throw new Error(`Unknown limit-order subcommand: ${subcommand}`);
}

async function handleDca(positionals) {
  const subcommand = positionals[1];

  if (!subcommand) {
    printSpecHelp("dca", COMMAND_SPECS.dca);
    return;
  }

  if (subcommand === "create") {
    const wallet = requireArg(positionals, 2, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>");
    const from = requireArg(positionals, 3, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>");
    const to = requireArg(positionals, 4, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>");
    const totalAmount = parseNumber(
      requireArg(positionals, 5, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>"),
      "totalAmount"
    );
    const numberOfOrders = parseNumber(
      requireArg(positionals, 6, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>"),
      "numberOfOrders"
    );
    const intervalSeconds = parseNumber(
      requireArg(positionals, 7, "Usage: hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>"),
      "intervalSeconds"
    );

    await runCommand("/cli/dca/create", {
      wallet,
      from,
      to,
      totalAmount,
      numberOfOrders,
      intervalSeconds,
    });
    return;
  }

  if (subcommand === "cancel") {
    const wallet = requireArg(positionals, 2, "Usage: hubra dca cancel <wallet> <orderKey>");
    const orderKey = requireArg(positionals, 3, "Usage: hubra dca cancel <wallet> <orderKey>");

    await runCommand("/cli/dca/cancel", {
      wallet,
      orderKey,
    });
    return;
  }

  throw new Error(`Unknown dca subcommand: ${subcommand}`);
}

async function handleUnstake(positionals, options) {
  const wallet = requireArg(positionals, 1, "Usage: hubra unstake <wallet> <amount> [--token <mintOrSymbol> | --stake-account <address> --total-balance <amount>]");
  const amount = parseNumber(
    requireArg(positionals, 2, "Usage: hubra unstake <wallet> <amount> [--token <mintOrSymbol> | --stake-account <address> --total-balance <amount>]"),
    "amount"
  );

  await runCommand("/cli/unstake", {
    wallet,
    amount,
    token: options.flags.token || undefined,
    stakeAccountAddress: options.flags["stake-account"] || undefined,
    totalBalance: parseOptionalNumber(options.flags["total-balance"], "totalBalance"),
    mode: options.flags.mode || undefined,
  });
}

async function handleTx(positionals) {
  const subcommand = positionals[1];

  if (!subcommand) {
    printSpecHelp("tx", COMMAND_SPECS.tx);
    return;
  }

  if (subcommand === "sign-and-send") {
    const base64Transactions = positionals.slice(2);

    if (base64Transactions.length === 0) {
      throw new Error("Usage: hubra tx sign-and-send <signedTransaction...>");
    }

    await runCommand("/cli/transactions/sign-and-send", {
      base64Transactions,
    });
    return;
  }

  throw new Error(`Unknown tx subcommand: ${subcommand}`);
}

async function handleCommand(command, positionals, options) {
  if (command === "send") {
    await handleSend(positionals);
    return;
  }

  if (command === "convert") {
    await handleConvert(positionals, options);
    return;
  }

  if (command === "burn") {
    await handleBurn(positionals);
    return;
  }

  if (command === "stake") {
    await handleStake(positionals);
    return;
  }

  if (command === "earn") {
    await handleEarn(positionals, options);
    return;
  }

  if (command === "perp") {
    await handlePerp(positionals, options);
    return;
  }

  if (command === "limit-order") {
    await handleLimitOrder(positionals, options);
    return;
  }

  if (command === "dca") {
    await handleDca(positionals);
    return;
  }

  if (command === "unstake") {
    await handleUnstake(positionals, options);
    return;
  }

  if (command === "tx") {
    await handleTx(positionals);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

export async function main(argv) {
  const { positionals, options } = parseOptions(argv.slice(2));
  const command = positionals[0] ?? "help";

  if (command === "help") {
    printMainHelp();
    return;
  }

  if (command === "manifest") {
    await handleManifest();
    return;
  }

  if (command === "config") {
    await handleConfig(positionals);
    return;
  }

  const spec = COMMAND_SPECS[command];

  if (!spec) {
    throw new Error(`Unknown command: ${command}`);
  }

  const maybeSubcommand = positionals[1];

  if (options.help || isHelpToken(maybeSubcommand)) {
    if (spec.subcommands && maybeSubcommand && spec.subcommands[maybeSubcommand]) {
      printSpecHelp(command, spec.subcommands[maybeSubcommand], maybeSubcommand);
      return;
    }

    printSpecHelp(command, spec);
    return;
  }

  await handleCommand(command, positionals, options);
}
