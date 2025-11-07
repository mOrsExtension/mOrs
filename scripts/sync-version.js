// Sync package.json version to manifest.json
const fs = require("fs");
const packageJson = require("../package.json");
const manifest = require("../manifest.json");

manifest.version = packageJson.version;

fs.writeFileSync("./manifest.json", JSON.stringify(manifest, null, 2) + "\n");

console.log(`Updated manifest.json to version ${packageJson.version}`);
