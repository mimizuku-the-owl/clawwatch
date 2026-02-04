import { readFile, writeFile } from "node:fs/promises";

export async function readText(path: string): Promise<string> {
  return await readFile(path, "utf-8");
}

export async function writeText(path: string, content: string): Promise<number> {
  await writeFile(path, content, "utf-8");
  return Buffer.byteLength(content, "utf-8");
}
