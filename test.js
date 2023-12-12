const fs = require("fs");
const cccedict = require("parse-cc-cedict");
const { csvEscape } = require("./escape");
const { numberedToAccent, fixPinyin } = require("./pinyin");
const { sortDescriptions } = require("./sort-descriptions");

const DATA_DIR = "./data";
const DICTIONARY_FILE = `${DATA_DIR}/cedict_1_0_ts_utf-8_mdbg.txt`;
const SEPARATION_CHARACTER = ",";

const CSV_HEADER = [
  '"Word"',
  '"Pinyin"',
  '"OtherPinyin"',
  '"Level"',
  '"First Translation"',
  '"Other Translations"',
  '"ParentWord"',
  '"ParentPinyin"',
  '"Zhuyin"',
].join(SEPARATION_CHARACTER);

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

function sanitizeValue(v) {
  return v
    .replace(/\(.+\)/g, "") // remove brackets
    .replace(/\/.*$/, "") // remove '/' alternate values
    .replace(/['" ]/g, ""); // quotes
}

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

function writeValueLine(value, done) {
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
    .join(SEPARATION_CHARACTER);

  process.stdout.write(line + "\n");
}

function processFiles(importFiles, userLevel, separationCharacter) {
  const dictionaryDefs = cccedict.parseFile(DICTIONARY_FILE);
  let dictionary = new Map();

  for (const def of dictionaryDefs) {
    if (dictionary.has(def.traditional))
      dictionary.get(def.traditional).push(def);
    else dictionary.set(def.traditional, [def]);

    if (def.traditional !== def.simplified)
      dictionary.set(def.simplified, dictionary.get(def.traditional));
  }

  /** @type{Set<string>} */
  let done = new Set();
  const lookup = new Map(importFiles.map((v) => [v.word, v]));

  process.stdout.write(CSV_HEADER + "\n");

  for (const value of importFiles) {
    const chars = Array.from(value.word);

    if (chars.length === 0)
      throw new Error(`word has no characters in: ${JSON.stringify(value)}`);

    const dependsOn = chars.length === 1 ? [] : chars;

    for (const char of dependsOn) {
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
        done
      );
    }

    const def = findInDictionary(value.word, dictionary);

    writeValueLine(
      {
        ...value,
        otherPinyin: "",
        translations: def.translations,
      },
      done
    );
  }
}

function main() {
  try {
    const importFiles = fs
      .readdirSync(DATA_DIR)
      .filter((file) => file.endsWith(".csv"))
      .map((file) => {
        const fileName = `${DATA_DIR}/${file}`;
        const level = parseInt(/^.*\/(\d+)\.csv$/.exec(fileName)[1]);
        return {
          word: file,
          level,
          zhuyinColumn: readZhuyinColumn(fileName),
        };
      });

    const userLevel = process.argv[2] ? parseInt(process.argv[2]) : null;

    processFiles(importFiles, userLevel, SEPARATION_CHARACTER);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

main();
