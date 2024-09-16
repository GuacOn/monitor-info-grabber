/*eslint no-unused-vars: "off"*/

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const PROMPT_PREFIX =
  "Extract and return just the model of the monitor from the advertisement text below. Tip: the model number will contain no spaces, and at least one letter and one number. If there is no model number, say 'no'.\n\n";

const RTINGS_API_URL =
  "https://www.rtings.com/api/v2/safe/app/search__search_results";

const manifest = browser.runtime.getManifest();

/**
 * Sends string (ad title + description) to GPT to analyse, returns just the
 * monitor model number.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {string} promptText Advertisement text to send to GPT for analysis
 */
async function GPTFetchMonitorModel(apiKey, promptText) {
  try {
    const prompt = PROMPT_PREFIX + promptText;

    console.debug("Fetching model number using GPT, with prompt: " + prompt);

    const requestOptions = {
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
    const modelNumber = data.choices[0].message.content;

    console.debug("Found model number: " + modelNumber);

    return modelNumber;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}

/**
 * RTINGS has a search API which we can use to query for our found monitor model number.
 * @param {string} monitorModel Model name of the monitor we are looking for
 */
async function RTINGSSearch(monitorModel) {
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

    // Send query
    const response = await fetch(RTINGS_API_URL, requestOptions);
    const data = await response.json();

    // For each search result
    for (let i = 0; i < data.data.search_results.results.length; i++) {
      let searchResult = data.data.search_results.results[i];

      if (
        // Convert search result model + advertisement model to lowercase for comparison
        searchResult.url.toLowerCase().includes(monitorModel.toLowerCase()) &&
        // This ensures we don't grab junk links to discussions, etc.
        searchResult.url.includes("/monitor/reviews")
      ) {
        console.debug("Found match!");

        // Extract the information we are interested in, and return it
        let score = await RTINGSExtractInfo(searchResult.url);
        return score;
      }
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}

/**
 * RTINGS review pages have an easy-to-read scorecard (e.g. https://www.rtings.com/monitor/reviews/lg/27gl850-b-27gl83a-b). We want to parse this, and return it in a dictionary for later use (customisable display options).
 * @param {string} url URL (excluding hostname) of the search result
 */
async function RTINGSExtractInfo(url) {
  console.debug("Grabbing monitor details from url: " + url);
  try {
    const response = await fetch("https://www.rtings.com" + url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const className = "scorecard-row-name";
    var elements = doc.getElementsByClassName(className);

    for (let i = 0; i < elements.length; i++) {
      if (elements[i].textContent.includes("Color Accuracy")) {
        return (
          "CA: " + elements[i].previousElementSibling.childNodes[1].textContent
        );
      } else if (elements[i].textContent.includes("SDR Picture")) {
        return (
          "SDR: " + elements[i].previousElementSibling.childNodes[1].textContent
        );
      } else if (elements[i].textContent.includes("Media Creation")) {
        return (
          "MC: " + elements[i].previousElementSibling.childNodes[1].textContent
        );
      }
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}
