import { readConfig } from "./config.mjs";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function getRuntimeConfig() {
  const fileConfig = await readConfig();

  return {
    apiUrl: process.env.HUBRA_API_URL || fileConfig.apiUrl,
    token: process.env.HUBRA_CLI_API_TOKEN || fileConfig.token,
  };
}

async function getHeaders() {
  const { token } = await getRuntimeConfig();

  if (!token) {
    throw new Error("Missing Hubra CLI token. Set HUBRA_CLI_API_TOKEN or run `hubra config set token <value>`.");
  }

  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

export async function getApiBaseUrl() {
  const { apiUrl } = await getRuntimeConfig();

  if (!apiUrl) {
    throw new Error("Missing Hubra API URL. Set HUBRA_API_URL or run `hubra config set api-url <value>`.");
  }

  return normalizeBaseUrl(apiUrl);
}

export async function apiRequest(path, { method = "GET", body = null } = {}) {
  const url = `${await getApiBaseUrl()}${path}`;
  const options = {
    method,
    headers: await getHeaders(),
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed: ${response.status} ${response.statusText}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function fetchManifest() {
  const response = await apiRequest("/cli/manifest");

  if (!response?.ok || !response.result) {
    throw new Error("Manifest response is missing result payload");
  }

  return response.result;
}
