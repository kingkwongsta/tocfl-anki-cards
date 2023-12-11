/**
 * Use the following command in terminal
 * node [filename.js] [level] > [output.csv]
 */

const fs = require("fs");
const cccedict = require("parse-cc-cedict");

const { csvEscape } = require("./escape");
const { numberedToAccent, fixPinyin } = require("./pinyin");
const { sortDescriptions } = require("./sort-descriptions");

const dataDir = "./data";
const dictionaryFile = `${dataDir}/cedict_1_0_ts_utf-8_mdbg.txt`;

// Get all CSV files in the 'data' folder
const importFiles = fs
  .readdirSync(dataDir)
  .filter((file) => file.endsWith(".csv"))
  .map((file) => `${dataDir}/${file}`);

// Get user-specified level from command line arguments
const userLevel = process.argv[2] ? parseInt(process.argv[2]) : null;

/**
 * Read the Zhuyin (注音) column from a CSV file
 * @param {string} fileName
 * @returns {string[]}
 */
function readZhuyinColumn(fileName) {
  const contents = fs.readFileSync(`${fileName}`, "utf8");
  const lines = contents.split("\n");
  const headers = lines[0].split(",");

  // Find the index of the "注音" column
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

let separationCharacter = ",";
let files;

if (process.argv.length > 2 && process.argv[2] === "--tabs") {
  separationCharacter = "\t";
  files = process.argv.slice(3);
} else {
  files = process.argv.slice(2);
}

/** @type {{word: string, pinyin: string, level: number, zhuyin: string }[]} */
const rawValues = importFiles
  .map((fileName) => {
    const level = parseInt(/^.*\/(\d+)\.csv$/.exec(fileName)[1]);

    // Filter based on user-specified level
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

/** Remove brackets and slash alternatives
 * @param {string} v
 */
const sanitizeValue = (v) =>
  v
    .replace(/\(.+\)/g, "") // remove brackets
    .replace(/\/.*$/, "") // remove '/' alternate values
    .replace(/['" ]/g, ""); // quotes

const values = rawValues.map(({ word, pinyin, level, zhuyin }) => ({
  word: sanitizeValue(word),
  pinyin: numberedToAccent(fixPinyin(sanitizeValue(pinyin.toLowerCase()))),
  level,
  zhuyin,
}));

// This is where we output the new CSV file
{
  const dictionaryDefs = cccedict.parseFile(dictionaryFile);
  let dictionary = new Map();
  for (const def of dictionaryDefs) {
    if (dictionary.has(def.traditional))
      dictionary.get(def.traditional).push(def);
    else dictionary.set(def.traditional, [def]);

    if (def.traditional !== def.simplified)
      dictionary.set(def.simplified, dictionary.get(def.traditional));
  }

  function findInDic(word) {
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

  /** @type{Set<string>} */
  let done = new Set();
  const lookup = new Map(values.map((v) => [v.word, v]));

  /** @param {{word: string, pinyin: string, otherPinyin: string, translations: string[], level: number, parent?: {word: string, pinyin: string}, zhuyin: string}} value */
  function writeValueLine(value) {
    if (done.has(value.word)) return;

    done.add(value.word);

    const translations = sortDescriptions(value.translations);

    const line = [
      value.word,
      value.pinyin,
      value.otherPinyin,
      value.level.toString(),
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

  // write csv header
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
    /** @type {string[]} */
    const chars = Array.from(value.word);

    if (chars.length === 0)
      throw new Error(`word has no characters in: ${JSON.stringify(value)}`);

    const dependsOn = chars.length === 1 ? [] : chars;

    for (const char of dependsOn) {
      {
        const def = findInDic(char);

        const pinyins = lookup.has(char)
          ? [lookup.get(char).pinyin]
          : def.pinyin.split(" ");

        if (pinyins.length === 0) pinyins = [""];

        writeValueLine({
          word: char,
          pinyin: pinyins[0],
          otherPinyin: pinyins.slice(1).join(" "),
          translations: def.translations,
          parent: value,
          level: value.level,
          zhuyin: value.zhuyin,
        });
      }
    }

    const def = findInDic(value.word);

    writeValueLine({
      ...value,
      otherPinyin: "",
      translations: def.translations,
    });
  }
}
