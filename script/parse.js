const { readFileSync } = require("fs");

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
    else console.error(`Invalid line format ${i + 1}: ${line}`);
  });
  return definitions;
}

function parseFile(filename) {
  const contents = readFileSync(filename, "utf-8");
  return parse(contents);
}

module.exports = { parse, parseFile };
