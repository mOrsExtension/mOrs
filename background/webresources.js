//webResources.js

let retrievalObject = {};

/** returns promise to retrieves JSON data from "filename" and returns javascript library
 * @param {string} fileName */
const promiseReadJsonFile = async (fileName) => {
  if (retrievalObject[fileName]) {
    infoBG(
      `Retrieving cached ${fileName}`,
      "webResources.js",
      "promiseReadJsonFile"
    );
    return retrievalObject[fileName];
  }
  try {
    const jsonFile = browser.runtime.getURL(`/data/${fileName}`);
    infoBG(`Unpacking: ${jsonFile}`, "webResources.js", "promiseReadJsonFile");
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
    warnBG(error, "webResources.js", "promiseReadJsonFile");
    throw error;
  }
};

const promiseGetPalletteList = async () => {
  let presetObj = await promiseReadJsonFile("cssPresetColors.json");
  return Object.keys(presetObj);
};

// volumeOutline.json specific
/** is a list of chapters in order returning [chapter#, title#, volume#, chapterName, titleName] */
const buildChapterList = async () => {
  const fullOutline = await promiseReadJsonFile("volumeOutline.json");
  const chapterList = Object.entries(fullOutline.Volumes).flatMap(
    ([volume, volumeData]) => {
      if (!volumeData.Titles) {
        warnBG(`Note: Volume ${volume} has no titles`);
        return [];
      }
      return Object.entries(volumeData.Titles).flatMap(([title, titleData]) => {
        if (!titleData.Chapters) {
          warnBG(`Note: Title ${title} has no chapters`);
          return [];
        }
        return Object.entries(titleData.Chapters).map(
          ([chapter, chapterName]) => [
            chapter.trim(),
            title.trim(),
            volume,
            chapterName,
            titleData.Heading,
          ]
        );
      });
    }
  );

  /* let chapterList = [];
  const Volumes = fullOutline.Volumes;

  for (let volume in fullOutline.Volumes) {
    const Titles = Volumes[volume].Titles;
    for (let title in Titles) {
      const Chapters = Titles[title].Chapters;
      for (let chapter in fullOutline.Volumes[volume].Titles[title].Chapters) {
        chapterList.push([
          chapter.trim(),
          title.trim(),
          volume,
          Chapters[chapter],
          Titles[title].Heading,
        ]);
      }
    }
    }*/
  return chapterList;
};

//caching chapterList
let chapter = null;
const getChapterList = async () => {
  if (chapter == null) {
    infoBG(
      "building chapter list from volumeOutline.js",
      "webResources.js",
      "getChapterList"
    );
    chapter = await buildChapterList();
  } else {
    infoBG(
      "Recycling used chapter list on volumeOutline.js",
      "webResources.js",
      "getChapterLink"
    );
  }
  return chapter;
};

/** returns chapter info based on json file for 'volume>title>chap' info;
 * based on matching chapter number (or offset to allow return of previous or next chapter)*/
const promiseGetChapterInfo = async ({ chapNum, offset = 0 }) => {
  const myList = await getChapterList();
  let ans = [];
  myList.every((chapter, index) => {
    // every works like forEach, but breaks on "false"
    if (chapter[0] == chapNum) {
      let limitRange = Math.max(Math.min(index + offset, myList.length - 1), 0);
      ans = myList[limitRange];
    }
    return ans.length == 0; // keeps going while true; stops as soon as we find it
  });
  const ansArray =
    ans.length == 0
      ? [chapNum, 0, 0, "chapter not found", "title not found"]
      : ans;
  return {
    chapNo: ansArray[0],
    titleNo: ansArray[1],
    volNo: ansArray[2],
    chapName: ansArray[3],
    titleName: ansArray[4],
  };
};
/**
 * @param {string} url
 * @param {string} encoding */
const getTextFromHtml = async (url, encoding = "utf-8") => {
  try {
    const urlResponse = await fetch(url);
    if (!urlResponse.ok && !urlResponse.redirected) {
      throw new Error(`Unable to fetch from ${url}. Document is empty. `);
    }
    const bufferResponse = await urlResponse.arrayBuffer();
    const urlDecoder = new TextDecoder(encoding); // if anno file is not typical utf-8 for websites
    return urlDecoder.decode(bufferResponse);
  } catch (error) {
    warnBG(`${error}`, "webResources.js", "getDocFromUrl");
    return " ";
  }
};
