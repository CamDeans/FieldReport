import { rm } from "fs/promises";
import path from "path";

export default async function globalSetup() {
  await rm(path.join(process.cwd(), ".fieldreport"), { recursive: true, force: true });
}
