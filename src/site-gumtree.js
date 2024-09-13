const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PROMPT_PREFIX = "Extract and return just the model of the monitor from the advertisement text below. Tip: the model number will contain no spaces, and at least one letter and one number. If there is no model number, say 'no'.\n\n";

async function fetchModel(apiKey, element) {
  console.debug("Fetching model number using GPT, with element: " + element.textContent)
  try {
      const prompt = PROMPT_PREFIX + element.textContent + element.parentElement.nextElementSibling.nextElementSibling.children[0].textContent;
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

      const model_number = data.choices[0].message.content

      console.debug("Found model number: " + model_number)
      let newText = "[[ " + model_number + " ]] -- " + element.textContent;

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
      tasks.push(fetchModel(apiKey, elements[i]));
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