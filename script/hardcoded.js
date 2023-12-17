/**
 * Run file by: node hardcoded.js [Level] > [Output.csv]
 * 12/17/23: replaced data dictionary to be hardcoded using ./data/dictdata.js file
 */

const fs = require("fs");
const cccedict = require("parse-cc-cedict");
const { csvEscape } = require("./escape");
const { numberedToAccent, fixPinyin } = require("./pinyin");
const { sortDescriptions } = require("./sort-descriptions");
const parsedDictionary = require("./data/dictdata");

const dataDir = "./data";
const dictionaryFile = `${dataDir}/cedict_1_0_ts_utf-8_mdbg.txt`;

function getCSVFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".csv"))
    .map((file) => `${directory}/${file}`);
}

function getUserLevel() {
  return process.argv[2] ? parseInt(process.argv[2]) : null;
}

function readZhuyinColumn(fileName) {
  const contents = fs.readFileSync(`${fileName}`, "utf8");
  const lines = contents.split("\n");
  const headers = lines[0].split(",");
  const zhuyinIndex = headers.indexOf("注音");

  if (zhuyinIndex === -1) {
    throw new Error('Column "注音" not found in the CSV file.');
  }

  return lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells = line.split(",");
      if (cells.length !== headers.length) {
        throw new Error(
          `parse error for line: ${fileName}: ${JSON.stringify(cells)}`
        );
      }

      return cells[zhuyinIndex].trim();
    });
}

function processCSVFiles(importFiles, userLevel) {
  return importFiles
    .map((fileName) => {
      const level = parseInt(/^.*\/(\d+)\.csv$/.exec(fileName)[1]);

      if (userLevel !== null && level !== userLevel) {
        return [];
      }

      const contents = fs.readFileSync(`${fileName}`, "utf8");
      const lines = contents.split("\n");
      const headers = lines[0].split(",");
      const zhuyinColumn = readZhuyinColumn(fileName);

      return lines
        .slice(1)
        .filter((line) => line.trim() !== "")
        .map((line, index) => {
          const cells = line.split(",");
          if (cells.length !== headers.length) {
            throw new Error(
              `parse error for line: ${fileName}, line ${
                index + 1
              }: ${JSON.stringify(cells)}`
            );
          }

          return headers.length === 8
            ? {
                word: cells[1].trim(),
                pinyin: cells[3].trim(),
                level,
                zhuyin: zhuyinColumn[index],
              }
            : {
                word: cells[0].trim(),
                pinyin: cells[2].trim(),
                level,
                zhuyin: zhuyinColumn[index],
              };
        });
    })
    .reduce((p, c) => p.concat(c), []);
}

function sanitizeValue(v) {
  return v
    .replace(/\(.+\)/g, "") // remove brackets
    .replace(/\/.*$/, "") // remove '/' alternate values
    .replace(/['" ]/g, ""); // quotes
}

function processValues(rawValues) {
  return rawValues.map(({ word, pinyin, level, zhuyin }) => ({
    word: sanitizeValue(word),
    pinyin: numberedToAccent(fixPinyin(sanitizeValue(pinyin.toLowerCase()))),
    level,
    zhuyin,
  }));
}

//******* Can remove since hardcoded now *******
// function buildDictionary() {
//   const dictionaryDefs = cccedict.parseFile(dictionaryFile);
//   let dictionary = new Map();
//   for (const def of dictionaryDefs) {
//     if (dictionary.has(def.traditional))
//       dictionary.get(def.traditional).push(def);
//     else dictionary.set(def.traditional, [def]);

//     if (def.traditional !== def.simplified)
//       dictionary.set(def.simplified, dictionary.get(def.traditional));
//   }
//   return dictionary;
// }

function findInDictionary(word, dictionary) {
  let defs = dictionary.get(word);

  if (defs === undefined) {
    process.stderr.write(`Can't find in dictionary: ${word}\n`);
    defs = [];
  }

  return {
    pinyin: Array.from(
      new Set(
        defs.map((d) =>
          numberedToAccent(fixPinyin(d.pronunciation.toLowerCase()))
        )
      )
    ).join(" "),
    translations: defs
      .map((d) => d.definitions)
      .reduce((p, c) => p.concat(c), []),
  };
}

function writeValueLine(value, done, separationCharacter) {
  if (done.has(value.word)) return;

  done.add(value.word);

  const translations = sortDescriptions(value.translations);

  const line = [
    value.word,
    value.pinyin,
    value.otherPinyin,
    `Level ${value.level}`,
    translations.slice(0, 1).join(""),
    translations.slice(1).join(", "),
    value.parent !== undefined ? value.parent.word : "",
    value.parent !== undefined ? value.parent.pinyin : "",
    value.zhuyin,
  ]
    .map(csvEscape)
    .join(separationCharacter);

  process.stdout.write(line + "\n");
}

function findInDictionary(word, dictionary) {
  const entry = dictionary.find(
    (entry) => entry.traditional === word || entry.simplified === word
  );

  if (entry === undefined) {
    process.stderr.write(`Can't find in dictionary: ${word}\n`);
    return { pinyin: "", translations: [] };
  }

  return {
    pinyin: numberedToAccent(fixPinyin(entry.pronunciation.toLowerCase())),
    translations: entry.definitions,
  };
}

function processFiles(importFiles, userLevel, separationCharacter) {
  const dictionary = parsedDictionary;
  const values = processCSVFiles(importFiles, userLevel);
  const done = new Set();
  const lookup = new Map(values.map((v) => [v.word, v]));

  process.stdout.write(
    [
      '"Word"',
      '"Pinyin"',
      '"OtherPinyin"',
      '"Level"',
      '"First Translation"',
      '"Other Translations"',
      '"ParentWord"',
      '"ParentPinyin"',
      '"Zhuyin"',
    ].join(separationCharacter) + "\n"
  );

  for (const value of values) {
    const chars = Array.from(value.word);

    if (chars.length === 0)
      throw new Error(`word has no characters in: ${JSON.stringify(value)}`);

    const dependsOn = chars.length === 1 ? [] : chars;

    for (const char of dependsOn) {
      {
        const def = findInDictionary(char, dictionary);

        let pinyins = lookup.has(char)
          ? [lookup.get(char).pinyin]
          : def.pinyin.split(" ");

        if (pinyins.length === 0) pinyins = [""];

        writeValueLine(
          {
            word: char,
            pinyin: pinyins[0],
            otherPinyin: pinyins.slice(1).join(" "),
            translations: def.translations,
            parent: value,
            level: value.level,
            zhuyin: value.zhuyin,
          },
          done,
          separationCharacter
        );
      }
    }

    const def = findInDictionary(value.word, dictionary);

    writeValueLine(
      {
        ...value,
        otherPinyin: "",
        translations: def.translations,
      },
      done,
      separationCharacter
    );
  }
}

function main() {
  try {
    const importFiles = getCSVFiles(dataDir);
    const userLevel = getUserLevel();

    processFiles(importFiles, userLevel, ",");
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

main();
