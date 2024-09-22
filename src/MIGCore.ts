/*eslint no-unused-vars: "off"*/
// import { Config } from './config';
// import config from './config/config.json';

console.log("Helloooooooo!");

export class Config {
  public OPENAI_API_URL: string;
  public PROMPT_PREFIX: string;
  public RTINGS_API_URL: string;

  constructor() {
    this.OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
    this.PROMPT_PREFIX = "Extract and return just the model of the monitor from the advertisement text below. Tip: the model number will contain no spaces, and at least one letter and one number. If there is no model number, say 'no'.\n\n"
    this.RTINGS_API_URL = "https://www.rtings.com/api/v2/safe/app/search__search_results"
  }
}

export class MIGCore {
  public static main() {
    console.log("Hello, World!");
    const instance = new MIGCore();
    // instance.registerContentScript();
  }

  private config: Config;
  private manifest: any;
  private apiKey: string | undefined;
  public popupDivs: HTMLDivElement[] = [];

  constructor() {
    this.config = new Config();
    this.manifest = browser.runtime.getManifest();
    this.popupDivs = [];
    this.initialize();
  }

  private async initialize() {
    try {
      const result = await browser.storage.local.get("api_key");
      this.apiKey = result.api_key;
      // this.onGot(apiKey);
      this.registerContentScript();
    } catch (error) {
      // this.onError(error);
      alert("Please set your OpenAI API key in the extension settings.");
      console.log(`Error: ${error}`);
    }
  }

  private async registerContentScript() {
    try {
      await browser.scripting.registerContentScripts([{
        matches: ["*://*.gumtree.com.au/*"],
        js: ["site-gumtree-ad.js"],
        id: "site-gumtree-ad"
      }]);
      console.log("Content script registered successfully.");
    } catch (error) {
      console.error(`Failed to register content script: ${error}`);
    }
  }

  /**
   * Sends string (ad title + description) to GPT to analyse, returns just the
   * monitor model number.
   * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
   * @param {string} promptText Advertisement text to send to GPT for analysis
   */
  async GPTFetchMonitorModel(
    promptText: string
  ): Promise<string> {
    try {
      const prompt: string = this.config.PROMPT_PREFIX + promptText;

      console.debug("Fetching model number using GPT, with prompt: " + prompt);

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
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
      const response = await fetch(this.config.OPENAI_API_URL, requestOptions);
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
  async RTINGSSearch(
    monitorModel: string
  ): Promise<[HTMLElement, string] | undefined> {
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
      const response = await fetch(this.config.RTINGS_API_URL, requestOptions);
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
          let scorecard = await this.RTINGSExtractScorecard(searchResult.url);
          let HTMLTable = this.createHTMLTable(scorecard);
          return [HTMLTable, searchResult.url];
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
  async RTINGSExtractScorecard(url: string): Promise<ScoreCard> {
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
  createHTMLTable(scorecard: ScoreCard) {
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
   */
  async setupHover(
    elementToHover: HTMLElement,
    popupElement: HTMLDivElement,
    modelNumber: string,
    modelURL: string
  ) {
    // Function to handle hover functionality
    const escapeRegExp = (str: string) =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Create a link element
    let linkElement: HTMLAnchorElement = document.createElement("a");
    linkElement.className = this.hashCode(
      elementToHover.className + modelNumber
    ).toString();
    linkElement.href = `https://www.rtings.com${modelURL}`;
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

  hashCode(str: string) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  getExtensionName(): string {
    return this.manifest.name;
  }
}

MIGCore.main();

// TYPE DECLARATIONS //

type ScoreCard = {
  [aspect: string]: string;
};