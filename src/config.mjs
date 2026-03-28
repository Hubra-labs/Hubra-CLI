import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".config", "hubra");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function normalizeConfig(config) {
  return {
    apiUrl: typeof config?.apiUrl === "string" ? config.apiUrl : "",
    token: typeof config?.token === "string" ? config.token : "",
  };
}

export function getConfigPath() {
  return CONFIG_PATH;
}

export async function readConfig() {
  try {
    const contents = await readFile(CONFIG_PATH, "utf8");

    return normalizeConfig(JSON.parse(contents));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return normalizeConfig(null);
    }

    throw new Error(`Failed to read config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function writeConfig(nextConfig) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(normalizeConfig(nextConfig), null, 2)}\n`, "utf8");
}

export async function updateConfig(key, value) {
  const current = await readConfig();
  const next = {
    ...current,
    [key]: value,
  };

  await writeConfig(next);

  return next;
}
