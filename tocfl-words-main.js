// Run script using the command node tocfl-words-main.js
// following the command line questions

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { csvEscape, unEscape } = require("./escape");

const OUTPUT_FOLDER = "./output";

function readContentsFromFile(fileName) {
  return fs.readFileSync(fileName, "utf8");
}

function parseTsvContents(contents) {
  return contents
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t").map(unEscape))
    .filter((cells) => cells.length > 0) // remove final new-line;
    .filter((cells) => cells[6] === "") // remove extras
    .map((cells) => {
      cells[3] = `Level ${cells[3]}`;
      return cells.slice(0, 6);
    });
}

function writeHeaderToFile(fileName, headers) {
  fs.writeFileSync(fileName, headers);
}

function appendLineToFile(fileName, line) {
  const escaped = line.map((cell) => csvEscape(cell)).join(separationCharacter);
  fs.appendFileSync(fileName, escaped + "\n");
}

function getUserLevel() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter the desired level: ", (level) => {
      rl.close();
      resolve(parseInt(level));
    });
  });
}

function getOutputFileName() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter the desired output file name: ", (fileName) => {
      rl.close();
      // Append .csv if not already present
      const normalizedFileName = fileName.endsWith(".csv")
        ? fileName
        : fileName + ".csv";
      const fullPath = path.join(OUTPUT_FOLDER, normalizedFileName);
      resolve(fullPath);
    });
  });
}

async function main() {
  const inputFileName = "./dist/tocfl-and-chars.tsv";

  const contents = readContentsFromFile(inputFileName);
  const lines = parseTsvContents(contents);

  // Get user input for the desired level
  const userLevel = await getUserLevel();

  // Get user input for the desired output file name
  const outputFileName = await getOutputFileName();

  // Ensure the "output" folder exists
  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER);
  }

  // write header
  const headers =
    [
      "Word",
      "Pinyin",
      "OtherPinyin",
      "Level",
      "First Translation",
      "Other Translations",
    ]
      .map((v) => `"${v}"`)
      .join(separationCharacter) + "\n";
  writeHeaderToFile(outputFileName, headers);

  // write lines filtered by user input level
  for (const line of lines) {
    const level = parseInt(line[3].replace("Level ", ""));
    if (isNaN(level) || level !== userLevel) {
      continue;
    }
    appendLineToFile(outputFileName, line);
  }

  console.log(`Filtered CSV file has been written to: ${outputFileName}`);
}

let separationCharacter = ",";
if (process.argv.length > 2 && process.argv[2] === "--tabs") {
  separationCharacter = "\t";
}

main();
