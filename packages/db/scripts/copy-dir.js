import fs from 'fs-extra';
import { fileURLToPath } from "url";
import {join} from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function run() {
  const source = join(__dirname, '..', 'drizzle')
  const target = join(__dirname, '..', 'dist/drizzle')
  console.log({
    source,
    target
  })
  fs.copySync(source, target, { overwrite: true })
  console.log('Drizzle files copied successfully!')
}

run();