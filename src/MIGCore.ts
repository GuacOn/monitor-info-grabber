/*eslint no-unused-vars: "off"*/

const OPENAI_API_URL: URL = new URL(
  "https://api.openai.com/v1/chat/completions"
);
const PROMPT_PREFIX: string =
  "Extract and return just the model of the monitor from the advertisement text below. Tip: the model number will contain no spaces, and at least one letter and one number. If there is no model number, say 'no'.\n\n";

const RTINGS_API_URL: URL = new URL(
  "https://www.rtings.com/api/v2/safe/app/search__search_results"
);

const manifest = browser.runtime.getManifest();

// Check if API key is set
const apiKey = browser.storage.local.get("api_key");

apiKey.then(onGot, onError);
function onGot(item: { [key: string]: string }) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);

  // Start modifying the page
  modifyPage(item["api_key"]);
}

// No API key set, alert user
function onError(error: any) {
  alert("Please set your OpenAI API key in the extension settings.");
  console.log(`Error: ${error}`);
}

// Div that will contain the scorecard popup when hovering over link
const popupDivs: HTMLDivElement[] = [];

/**
 * Sends string (ad title + description) to GPT to analyse, returns just the
 * monitor model number.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {string} promptText Advertisement text to send to GPT for analysis
 */
async function GPTFetchMonitorModel(
  apiKey: string,
  promptText: string
): Promise<string> {
  try {
    const prompt: string = PROMPT_PREFIX + promptText;

    console.debug("Fetching model number using GPT, with prompt: " + prompt);

    const requestOptions: any = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    };

    // Send query to GPT
    const response = await fetch(OPENAI_API_URL, requestOptions);
    const data = await response.json();

    // Extract model number from returned data
    const modelNumber: string = data.choices[0].message.content;

    console.debug("Found model number: " + modelNumber);

    return modelNumber;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}

/**
 * RTINGS has a search API which we can use to query for our found monitor model number.
 * @param {string} monitorModel Model name of the monitor we are looking for
 */
async function RTINGSSearch(
  monitorModel: string
): Promise<HTMLElement | undefined> {
  console.debug("Searching RTINGS for model: " + monitorModel);
  try {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count: 5,
        is_admin: false,
        query: monitorModel,
        type: "full",
      }),
    };

    // Send query and await search results
    const response = await fetch(RTINGS_API_URL, requestOptions);
    const data = await response.json();
    const searchResults: Array<any> = data.data.search_results.results;

    // For each search result
    for (let i = 0; i < searchResults.length; i++) {
      let searchResult = searchResults[i];

      if (
        // Convert search result model + advertisement model to lowercase for comparison
        searchResult.url.toLowerCase().includes(monitorModel.toLowerCase()) &&
        // This ensures we don't grab junk links to discussions, etc.
        searchResult.url.includes("/monitor/reviews")
      ) {
        console.debug("Found match!");

        // Extract the information we are interested in, and return it
        let scorecard = await RTINGSExtractScorecard(searchResult.url);
        let HTMLTable = createHTMLTable(scorecard);
        return HTMLTable;
      }
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}

/**
 * RTINGS review pages have an easy-to-read scorecard (e.g. https://www.rtings.com/monitor/reviews/lg/27gl850-b-27gl83a-b). We want to parse this, and return it in a dictionary for later use (customisable display options).
 * @param {string} url URL (excluding hostname) of the search result
 */
async function RTINGSExtractScorecard(url: string): Promise<ScoreCard> {
  console.debug("Grabbing monitor details from url: " + url);
  try {
    const response = await fetch("https://www.rtings.com" + url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const className = "scorecard-table";
    var scorecardtable = doc.getElementsByClassName(className)[0];

    var scorecard: ScoreCard = {};

    // For each scorecard row
    for (let row = 0; row < scorecardtable.children.length; row++) {
      // grab name
      var reviewAspect: string = (
        scorecardtable.children[row].getElementsByClassName(
          "scorecard-row-name"
        )[0].textContent || ""
      ).trim();

      // grab score
      var reviewScore: string = (
        scorecardtable.children[row].getElementsByClassName(
          "e-score_box-value"
        )[0].textContent || ""
      ).trim();

      scorecard[reviewAspect] = reviewScore;
    }

    console.debug(scorecard);
    return scorecard;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}

/**
 * Turns our scorecard array into a HTML table
 * @param {ScoreCard} scorecard
 */
function createHTMLTable(scorecard: ScoreCard) {
  const newTable = document.createElement("table");
  newTable.innerHTML = "<thead><th>Aspect</th><th>Score</th></thead>";

  for (var score of Object.keys(scorecard)) {
    const newRow = document.createElement("tr");
    const tdAspect = document.createElement("td");
    const tdScore = document.createElement("td");
    tdAspect.textContent = score;
    tdScore.textContent = scorecard[score];
    newRow.appendChild(tdAspect);
    newRow.appendChild(tdScore);
    newTable.appendChild(newRow);
  }

  return newTable;
}

/**
 * Replaces text with a hoverable link that will show a popup with the scorecard table
 * @param {Element} elementToHover HTML
 * @param {Element} popupElement
 * @param {string} modelNumber
 */
async function setupHover(
  elementToHover: HTMLElement,
  popupElement: HTMLDivElement,
  modelNumber: string
) {
  // Function to handle hover functionality
  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create a link element
  let linkElement: HTMLAnchorElement = document.createElement("a");
  linkElement.className = hashCode(
    elementToHover.className + modelNumber
  ).toString();
  linkElement.href = "rtings.com";
  linkElement.textContent = modelNumber;
  linkElement.style.cursor = "pointer"; // Optional: Change cursor to pointer
  linkElement.style.textDecoration = "underline"; // Optional: Underline link

  // Replace modelNumber in the innerHTML with the link element
  // elementToHover.innerHTML = elementToHover.innerHTML.replace(
  //   new RegExp(escapeRegExp(modelNumber), "i"),
  //   linkElement.outerHTML
  // );
  elementToHover.insertAdjacentElement("afterbegin", linkElement);
  linkElement.insertAdjacentHTML("afterbegin", "<br />  ");

  let pClone: HTMLDivElement = popupElement.cloneNode(true) as HTMLDivElement;

  // Append the popup element
  elementToHover.appendChild(pClone);
  pClone.style.display = "none"; // Initially hide the popup

  // Add event listeners to the link element
  let linkEle = elementToHover.getElementsByClassName(linkElement.className)[0];
  linkEle.addEventListener("mouseenter", () => {
    pClone.style.display = "block";
  });

  linkEle.addEventListener("mouseleave", () => {
    pClone.style.display = "none";
  });
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// TYPE DECLARATIONS //

type ScoreCard = {
  [aspect: string]: string;
};
// type ScoreCard = ReviewScore[];
