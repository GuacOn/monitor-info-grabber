const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PROMPT_PREFIX = "Extract and return just the model of the monitor from the advertisement text below. Tip: the model number will contain no spaces, and at least one letter and one number. If there is no model number, say 'no'.\n\n";

const RTINGS_API_URL = "https://www.rtings.com/api/v2/safe/app/search__search_results"

async function fetchMonitorModel(apiKey, element) {
  console.debug("Fetching model number using GPT, with element: " + element.textContent)
  try {
      let adDescription = element.parentElement.nextElementSibling.nextElementSibling.children[0].textContent
      const prompt = PROMPT_PREFIX + element.textContent + adDescription;

      console.debug("prompt: " + prompt)

      const requestOptions = {
          method: 'POST',
          headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
              {
              role: "user",
              content: prompt
              }
          ]
          })
      };

      const response = await fetch(OPENAI_API_URL, requestOptions);
      const data = await response.json();
      // return data.choices && data.choices[0] && data.choices[0].message.content.trim();

      const modelNumber = data.choices[0].message.content

      console.debug("Found model number: " + modelNumber)

      var newText;
      let result = await RTINGSSearch(modelNumber);
      if (result) {
        newText = "[[ " + result + " ]] -- " + element.textContent;
      } else {
        newText = "[[ " + modelNumber + " ]] -- " + element.textContent;
      }

      element.textContent = newText; // Assuming the API returns an object with a `newText` property
  } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
  }
}

async function replaceTextByClass(apiKey, className) {
  let elements = document.getElementsByClassName(className);
  let tasks = [];

  for (let i = 0; i < elements.length; i++) {
      // Create a promise for each API call
      tasks.push(fetchMonitorModel(apiKey, elements[i]));
      console.debug("Adding another task...")
  }

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log('All text replacements completed.');
}

let apiKey = browser.storage.local.get('api_key');
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);
  console.log("About to start replacing")
  replaceTextByClass(item["api_key"], 'user-ad-row-new-design__title-span');
}

function onError(error) {
  alert('Please set your OpenAI API key in the extension settings.');
  console.log(`Error: ${error}`);
}

/*   foreach user-ad-row-new-design__main-content
var ad_text = user-ad-row-new-design__main-content.inner + user-ad-row-new-design__description user-ad-row-new-design__description--regular.inner
query gpt
if hit, search rtings
result: "No results found", or:
result.conains [model] && "Monitor Review":
  follow link, extract .scorecard-table

*/

async function RTINGSSearch(monitorModel) {
  console.debug("Searching RTINGS for model: " + monitorModel)
  try {
      const requestOptions = {
          method: 'POST',
          headers: {
          'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            count: 10,
            is_admin: false,
            query: monitorModel,
            type: "full"
          })
      };

      const response = await fetch(RTINGS_API_URL, requestOptions);
      const data = await response.json();

      // const className = "searchbar_results-name"
      // var elements = doc.getElementsByClassName(className);
      // const elements = doc.querySelectorAll('a');
      // let tasks = [];

      for (let i = 0; i < data.data.search_results.results.length; i++) {
          let result = data.data.search_results.results[i]
          // Create a promise for each API call
          // tasks.push(fetchMonitorModel(apiKey, elements[i]));
          // console.debug("Found href on RTINGS: " + result.url)
          if (result.url.toLowerCase().includes(monitorModel.toLowerCase()) && result.url.includes("/monitor/reviews")) {
            console.debug("Found match!");
            let score = await RTINGSExtractInfo(result.url);
            return score;
          }
      }

      // const modelNumber = data.choices[0].message.content

      // console.debug("Found model number: " + modelNumber)
      // let newText = "[[ " + modelNumber + " ]] -- " + element.textContent;

      // element.textContent = newText; // Assuming the API returns an object with a `newText` property
  } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
  }

  
  
}

async function RTINGSExtractInfo(url) {
  console.debug("Grabbing monitor details from url: " + url)
  try {
      const response = await fetch("https://www.rtings.com" + url);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const className = "scorecard-row-name"
      var elements = doc.getElementsByClassName(className);

      for (let i = 0; i < elements.length; i++) {
        if (elements[i].textContent.includes("Color Accuracy")) {
          return "CA: " + elements[i].previousElementSibling.childNodes[1].textContent;
        } else if (elements[i].textContent.includes("SDR Picture")) {
          return "SDR: " + elements[i].previousElementSibling.childNodes[1].textContent;
        } else if (elements[i].textContent.includes("Media Creation")) {
          return "MC: " + elements[i].previousElementSibling.childNodes[1].textContent;
        }
      }
  } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
  }
}