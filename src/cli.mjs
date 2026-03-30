import { createRequire } from "node:module";

import { apiRequest, fetchManifest } from "./api-client.mjs";
import { getConfigPath, readConfig, updateConfig } from "./config.mjs";

const require = createRequire(import.meta.url);
const { version: CLI_VERSION } = require("../package.json");

const HUBRA_INTRO = "Hubra - unified API for fully gasless swaps, staking, and perps on Solana.";
const HUBRA_REPO_URL = "https://github.com/Hubra-labs/Hubra-CLI";
const HUBRA_WORDMARK = {
  H: ["##   ##", "##   ##", "##   ##", "#######", "##   ##", "##   ##", "##   ##"],
  U: ["##   ##", "##   ##", "##   ##", "##   ##", "##   ##", "##   ##", " ##### "],
  B: ["###### ", "##   ##", "##   ##", "###### ", "##   ##", "##   ##", "###### "],
  R: ["###### ", "##   ##", "##   ##", "###### ", "## ##  ", "##  ## ", "##   ##"],
  A: [" ##### ", "##   ##", "##   ##", "#######", "##   ##", "##   ##", "##   ##"],
};
const ANSI = {
  reset: "\u001B[0m",
  bold: "\u001B[1m",
  underline: "\u001B[4m",
  accent: "\u001B[38;5;75m",
  shadow: "\u001B[38;5;32m",
  link: "\u001B[38;5;75m",
  warm: "\u001B[38;5;117m",
  white: "\u001B[38;5;230m",
};

const COMMAND_SPECS = {
  version: {
    description: "Print the installed CLI version.",
    usage: ["hubra version", "hubra --version"],
    examples: ["hubra version", "hubra --version"],
  },
  send: {
    description: "Build a token send transaction.",
    usage: ["hubra send <wallet> <recipient> <mint> <amount>", "hubra send --help"],
    examples: [
      "hubra send <wallet> <recipient> <mint> <amount>",
    ],
  },
  convert: {
    description: "Resolve tokens, quote, and build a conversion transaction.",
    usage: ["hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>", "hubra convert --help"],
    examples: [
      "hubra convert <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount>",
      "hubra convert <wallet> SOL raSOL <amount>",
    ],
    notes: ["Use --slippage-mode auto to override the default slippage mode."],
  },
  burn: {
    description: "Build close-account transactions for token accounts.",
    usage: ["hubra burn <wallet> <mint1> [mint2 ...]", "hubra burn --help"],
    examples: ["hubra burn <wallet> <mint1> [mint2 ...]"],
  },
  stake: {
    description: "Build a staking transaction.",
    usage: ["hubra stake <wallet> <amount>", "hubra stake --help"],
    examples: ["hubra stake <wallet> <amount>"],
  },
  earn: {
    description: "Build earn deposit and withdrawal transactions.",
    usage: ["hubra earn <subcommand> ...", "hubra earn --help"],
    subcommands: {
      deposit: {
        description: "Build an earn deposit transaction.",
        usage: ["hubra earn deposit <wallet> <opportunityId> <amount>", "hubra earn deposit --help"],
        examples: ["hubra earn deposit <wallet> <opportunityId> <amount>"],
        notes: ["Use --leverage <number> for multiply-style flows."],
      },
      withdraw: {
        description: "Build an earn withdrawal transaction.",
        usage: ["hubra earn withdraw <wallet> <positionTokenOrMint> <amount>", "hubra earn withdraw --help"],
        examples: ["hubra earn withdraw <wallet> <positionTokenOrMint> <amount>"],
      },
    },
  },
  perp: {
    description: "Build perpetual futures transactions.",
    usage: ["hubra perp <subcommand> ...", "hubra perp --help"],
    subcommands: {
      open: {
        description: "Build an open-position transaction.",
        usage: ["hubra perp open <wallet> <side> <collateralUsd> <leverage>", "hubra perp open --help"],
        examples: ["hubra perp open <wallet> <side> <collateralUsd> <leverage>"],
        notes: ["Hubra resolves the perp market internally.", "Use --slippage-bps <number> to override the default slippage."],
      },
      close: {
        description: "Build a close-position transaction.",
        usage: ["hubra perp close <wallet> [side]", "hubra perp close --help"],
        examples: ["hubra perp close <wallet>", "hubra perp close <wallet> <side>"],
        notes: [
          "Hubra resolves the perp market internally.",
          "If the wallet has multiple open positions, pass an optional side to narrow the close target.",
          "Use --slippage-bps <number> to override the default slippage.",
        ],
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
        examples: ["hubra limit-order create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <amount> <targetPrice>"],
      },
      cancel: {
        description: "Build a limit-order cancellation transaction.",
        usage: ["hubra limit-order cancel <wallet> <orderKey>", "hubra limit-order cancel --help"],
        examples: ["hubra limit-order cancel <wallet> <orderKey>"],
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
        examples: ["hubra dca create <wallet> <fromMintOrSymbol> <toMintOrSymbol> <totalAmount> <numberOfOrders> <intervalSeconds>"],
      },
      cancel: {
        description: "Build a DCA cancellation transaction.",
        usage: ["hubra dca cancel <wallet> <orderKey>", "hubra dca cancel --help"],
        examples: ["hubra dca cancel <wallet> <orderKey>"],
      },
    },
  },
  unstake: {
    description: "Build an unstake transaction for LSTs or native stake accounts.",
    usage: ["hubra unstake <wallet> <amount> [--token <mintOrSymbol> | --stake-account <address> --total-balance <amount>]", "hubra unstake --help"],
    examples: [
      "hubra unstake <wallet> <amount> --token <mintOrSymbol>",
      "hubra unstake <wallet> <amount> --stake-account <address> --total-balance <amount>",
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

function printVersion() {
  console.log(CLI_VERSION);
}

function supportsAnsi() {
  return Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb" && process.env.HUBRA_NO_COLOR !== "1";
}

function paint(text, ...codes) {
  if (!supportsAnsi()) {
    return text;
  }

  return `${codes.join("")}${text}${ANSI.reset}`;
}

function stripAnsi(text) {
  return text.replace(/\u001B\[[0-9;]*m/g, "");
}

function visibleLength(text) {
  return stripAnsi(text).length;
}

function padLine(text, width) {
  return `${text}${" ".repeat(Math.max(width - visibleLength(text), 0))}`;
}

function wrapText(text, width) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function getBannerWidth() {
  const columns = Number.isFinite(process.stdout.columns) ? process.stdout.columns : 80;
  return columns < 56 ? columns : Math.min(columns, 108);
}

function alignBannerSides(left, right, width) {
  if (!right) {
    return padLine(left, width);
  }

  const spacing = width - visibleLength(left) - visibleLength(right);
  if (spacing < 1) {
    return left;
  }

  return `${left}${" ".repeat(spacing)}${right}`;
}

function alignRight(text, width) {
  const padding = Math.max(width - visibleLength(text), 0);
  return `${" ".repeat(padding)}${text}`;
}

function buildWordmarkRows(word) {
  const letters = word.split("").map((letter) => HUBRA_WORDMARK[letter]);
  const gap = "   ";

  return Array.from({ length: letters[0].length }, (_, rowIndex) => letters.map((rows) => rows[rowIndex]).join(gap));
}

function addWordmarkShadow(rows) {
  const height = rows.length + 1;
  const width = Math.max(...rows.map((row) => row.length)) + 1;
  const canvas = Array.from({ length: height }, () => Array.from({ length: width }, () => " "));

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== "#") {
        continue;
      }

      if (canvas[y + 1]?.[x + 1] === " ") {
        canvas[y + 1][x + 1] = "▓";
      }
    }
  }

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === "#") {
        canvas[y][x] = "█";
      }
    }
  }

  return canvas.map((row) => row.join("").replace(/\s+$/u, ""));
}

function paintWordmarkRow(row) {
  if (!supportsAnsi()) {
    return row.replace(/▓/gu, "▒");
  }

  let output = "";

  for (const char of row) {
    if (char === "█") {
      output += paint(char, ANSI.bold, ANSI.accent);
      continue;
    }

    if (char === "▓") {
      output += paint(char, ANSI.shadow);
      continue;
    }

    output += char;
  }

  return output;
}

function formatSectionHeading(label) {
  return supportsAnsi() ? paint(`${label}:`, ANSI.bold, ANSI.accent) : `${label}:`;
}

function formatCommandLabel(label, width) {
  const padded = label.padEnd(width);
  return supportsAnsi() ? paint(padded, ANSI.bold, ANSI.link) : padded;
}

function renderBanner() {
  const width = getBannerWidth();
  const wordmarkRows = addWordmarkShadow(buildWordmarkRows("HUBRA")).map(paintWordmarkRow);
  const version = paint(`v${CLI_VERSION}`, ANSI.bold, ANSI.white);
  const repoUrl = paint(HUBRA_REPO_URL, ANSI.underline, ANSI.link);
  const introLines = wrapText(HUBRA_INTRO, width).map((line) => paint(line, ANSI.warm));
  const lines = [...wordmarkRows];

  if (width >= visibleLength(wordmarkRows[0]) + 2 + visibleLength(version)) {
    lines[0] = alignBannerSides(lines[0], version, width);
  } else {
    lines.push(alignRight(version, width));
  }

  if (width >= visibleLength(wordmarkRows[2]) + 2 + visibleLength(repoUrl)) {
    lines[2] = alignBannerSides(lines[2], repoUrl, width);
  } else {
    lines.push("", alignRight(repoUrl, width));
  }

  lines.push(...introLines);

  return lines.join("\n");
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
  const sections = [
    renderBanner(),
    "",
    formatSectionHeading("Command"),
    `  hubra ${title}`,
    `  ${spec.description}`,
    "",
    formatSectionHeading("Usage"),
  ];

  for (const line of spec.usage) {
    sections.push(`  ${line}`);
  }

  if (spec.notes?.length) {
    sections.push("", formatSectionHeading("Notes"));
    for (const note of spec.notes) {
      sections.push(`  ${note}`);
    }
  }

  if (spec.subcommands) {
    sections.push("", formatSectionHeading("Subcommands"));
    for (const [name, childSpec] of Object.entries(spec.subcommands)) {
      sections.push(`  ${formatCommandLabel(name, 14)} ${childSpec.description}`);
    }
  }

  if (spec.examples?.length) {
    sections.push("", formatSectionHeading("Examples"));
    for (const example of spec.examples) {
      sections.push(`  ${example}`);
    }
  }

  console.log(sections.join("\n"));
}

function printMainHelp() {
  const lines = Object.entries(COMMAND_SPECS).map(
    ([name, spec]) => `  ${formatCommandLabel(name, 12)} ${spec.description}`
  );

  console.log(`${renderBanner()}

${formatSectionHeading("Usage")}
  hubra <command> [<subcommand>] ...
  hubra <command> --help
  hubra version
  hubra --version
  hubra config show
  hubra config path
  hubra config set api-url <value>
  hubra config set token <value>

${formatSectionHeading("Commands")}
${lines.join("\n")}

${formatSectionHeading("Examples")}
  hubra version
  hubra send <wallet> <recipient> <mint> <amount>
  hubra convert <wallet> SOL raSOL <amount>
  hubra stake <wallet> <amount>
  hubra earn deposit <wallet> <opportunityId> <amount>
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
    const wallet = requireArg(positionals, 2, "Usage: hubra perp open <wallet> <side> <collateralUsd> <leverage>");
    const side = requireArg(positionals, 3, "Usage: hubra perp open <wallet> <side> <collateralUsd> <leverage>");
    const collateralUsd = parseNumber(
      requireArg(positionals, 4, "Usage: hubra perp open <wallet> <side> <collateralUsd> <leverage>"),
      "collateralUsd"
    );
    const leverage = parseNumber(requireArg(positionals, 5, "Usage: hubra perp open <wallet> <side> <collateralUsd> <leverage>"), "leverage");

    await runCommand("/cli/perp/open", {
      wallet,
      side,
      collateralUsd,
      leverage,
      slippageBps: parseOptionalNumber(options.flags["slippage-bps"], "slippageBps"),
    });
    return;
  }

  if (subcommand === "close") {
    const wallet = requireArg(positionals, 2, "Usage: hubra perp close <wallet> [side]");
    const side = positionals[3];

    await runCommand("/cli/perp/close", {
      wallet,
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
  if (command === "version") {
    printVersion();
    return;
  }

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

  if (command === "--version" || command === "-v" || options.flags.version === true) {
    printVersion();
    return;
  }

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
