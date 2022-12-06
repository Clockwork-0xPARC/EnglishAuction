import fs from "fs";

const words: string[] = JSON.parse(fs.readFileSync("../words.json").toString("utf8"));

const shortWords = [];
let i = 0;
for (const word of words) {
  if (word.length > 2 && /[aeiouy]/i.test(word) && word.length <= 9) {
    i++;
    shortWords.push(word);
  }
}

console.log(i);
shortWords.sort();
fs.writeFileSync("../words.json", JSON.stringify(shortWords, null, 2));
