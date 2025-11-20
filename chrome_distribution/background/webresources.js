/* exported getPalletteList, getChapterInfo */
/* global browser */
//webResources.js

let retrievalObject = {};

/** returns promise to retrieves JSON data from "filename" and returns javascript library
 * @param {string} fileName */
const readJsonFile = async (fileName) => {
  if (retrievalObject[fileName]) {
    return retrievalObject[fileName];
  }
  try {
    const jsonFile = browser.runtime.getURL(`/data/${fileName}`);
    const fetchResponse = await fetch(jsonFile);
    if (!fetchResponse.ok) {
      throw new Error(
        `File ${fileName} not loaded: ${fetchResponse.statusText}`
      );
    }
    const fetchedJson = await fetchResponse.json();
    retrievalObject[fileName] = fetchedJson; // caches response
    return fetchedJson;
  } catch (error) {
    throw error;
  }
};

const getPalletteList = async () => {
  let presetObj = await readJsonFile("cssPresetColors.json");
  return Object.keys(presetObj);
};

// volumeOutline.json specific
/** builds array of chapters from json in order returning [chapter#, title#, volume#, chapterName, titleName] */
const buildChapterList = async () => {
  const fullOutline = await readJsonFile("volumeOutline.json");
  const chapterList = Object.entries(fullOutline.volumes).flatMap(
    ([volume, volumeData]) => {
      if (!volumeData.titles) {
        return [];  // volume has no titles - shouldn't happen
      }
      return Object.entries(volumeData.titles).flatMap(([title, titleData]) => {
        if (!titleData.chapters) {
          return []; // title has no chapters, also shouldn't happen
        }
        return Object.entries(titleData.chapters).map(
          ([chapter, chapterName]) => [
            chapter.trim(),
            title.trim(),
            volume,
            chapterName,
            titleData.heading,
            volumeData.heading,
          ]
        );
      });
    }
  );
  return chapterList;
};

//caching chapterList
let chapter = null; //first time executing function only
const getChapterList = async () => {
  if (chapter == null) {
    chapter = await buildChapterList();
  }
  return chapter;
};

/** returns chapter info based on json file for 'volume>title>chap' info;
 * based on matching chapter number (or offset to allow return of previous or next chapter)*/

const getChapterInfo = async ({ chapNum, offset = 0 }) => {
  const chapterList = await getChapterList();
  let chapterIndex = chapterList.findIndex((chapter) => {
    return chapter[0] == chapNum;
  });
  chapterIndex = Math.max(
    Math.min(chapterIndex + offset, chapterList.length - 1),
    0
  ); // keeps answer within range
  let ansArray = chapterList[chapterIndex] || [
    chapNum,
    0,
    0,
    "chapter not found",
    "title not found",
    "volume not found",
  ];
  return {
    chapNo: ansArray[0],
    titleNo: ansArray[1],
    volNo: ansArray[2],
    chapName: ansArray[3],
    titleName: ansArray[4],
    volName: ansArray[5],
  };
};
