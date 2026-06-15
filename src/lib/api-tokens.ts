import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const FILE = path.join(process.cwd(), ".data", "api-tokens.json");

async function readStore(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(store: Record<string, string>) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2));
}

export async function getTokenForUser(userId: string): Promise<string | null> {
  const store = await readStore();
  return store[userId] ?? null;
}

export async function createTokenForUser(userId: string): Promise<string> {
  const store = await readStore();
  const token = randomBytes(32).toString("hex");
  store[userId] = token;
  await writeStore(store);
  return token;
}

export async function getUserIdForToken(token: string): Promise<string | null> {
  const store = await readStore();
  const entry = Object.entries(store).find(([, v]) => v === token);
  return entry ? entry[0] : null;
}
