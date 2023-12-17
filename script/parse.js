const { readFileSync, writeFileSync } = require("fs");
const path = require("path");

const lineRegex = /(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/;

function parse(contents) {
  const definitions = [];
  const lines = contents.split("\n");
  lines.forEach((line, i) => {
    if (line.startsWith("#") || line === "") return; // skip comments and blanks
    const match = lineRegex.exec(line);
    if (match !== null)
      definitions.push({
        traditional: match[1],
        simplified: match[2],
        pronunciation: match[3],
        definitions: match[4].split("/"),
      });
    else process.stderr.write(`Invalid line format ${i + 1}: ${line}\n`);
  });
  return definitions;
}

function parseFile(filename) {
  const contents = readFileSync(filename, "utf-8");
  return parse(contents);
}

// Specify the relative path to the "data" folder
const dataFolder = "data";

// Specify the input file name (relative to the script's location)
const inputFile = path.join(__dirname, dataFolder, "cedict_ts.u8");

// Parse the file
const result = parseFile(inputFile);

// Specify the output file name
const outputFile = "output.json";

// Write the result to a JSON file
writeFileSync(outputFile, JSON.stringify(result, null, 2));

console.log(`Result has been written to ${outputFile}`);
