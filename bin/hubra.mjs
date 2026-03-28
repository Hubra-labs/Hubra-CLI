#!/usr/bin/env node

import { main } from "../src/cli.mjs";

main(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
