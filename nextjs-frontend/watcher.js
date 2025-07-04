const chokidar = require("chokidar");
const { exec } = require("child_process");
const { config } = require("dotenv");
const path = require("path");
const fs = require("fs");

config({ path: ".env.local" });

// Default path if environment variable is not set
const defaultPath = path.join(
  __dirname,
  "..",
  "local-shared-data",
  "openapi.json",
);
const openapiFile = process.env.OPENAPI_OUTPUT_FILE || defaultPath;

// Check if the file exists before watching it
if (fs.existsSync(openapiFile)) {
  console.log(`Watching for changes to OpenAPI file: ${openapiFile}`);

  // Watch the specific file for changes
  chokidar.watch(openapiFile).on("change", (path) => {
    console.log(`File ${path} has been modified. Running generate-client...`);
    exec("npm run generate-client", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  });
} else {
  console.warn(
    `OpenAPI file not found at ${openapiFile}. Watcher not started.`,
  );
}
