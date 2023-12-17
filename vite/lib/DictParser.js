import dictionary from "cedict_ts.u8";

export const lineRegex = /(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/;

export function parse(contents) {
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
    else console.log(`Invalid line format ${i + 1}: ${line}`);
  });
  return definitions;
}

export function parseFile(contents) {
  return parse(contents);
}

// // Example of a hardcoded file content
// const hardcodedFileContent = `
//     中文 字典 [zhōng wén zì diǎn] /Chinese dictionary/
//     你好 [nǐ hǎo] /hello/
//     // Add more lines as needed
// `;

// Example of using the parseFile function with the hardcoded content
const parsedDefinitions = parseFile(dictionary);
console.log(parsedDefinitions);
