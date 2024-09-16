let apiKey = browser.storage.local.get("api_key");
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);
  gumtreeReplaceTextByClass(item["api_key"], "vip-ad-title__header");
}

function onError(error) {
  alert("Please set your OpenAI API key in the extension settings.");
  console.log(`Error: ${error}`);
}

/**
 * Queries ad title + description, and supplements ad title with RTINGS data.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {string} className Name of the class we will add information to
 */
async function gumtreeReplaceTextByClass(apiKey, className) {
  let elements = document.getElementsByClassName(className);
  let tasks = [];

  let adTitle = elements[0].textContent + "\n";
  let adDescription = document.getElementsByClassName(
    "vip-ad-description__content--wrapped",
  )[0];

  // Combine the two elements for our prompt
  let gptPromptAdText = adTitle + adDescription;

  // Send to GPT for analysis
  tasks.push(
    GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
      async function (value) {
        console.log("Calling func retrieved model number: " + value);
        // Search RTINGS API for monitor model
        let result = await RTINGSSearch(value);
        if (result) {
          // Replace ad title with retrieved data
          elements[0].textContent =
            "[[ " + result + " ]] -- " + elements[0].textContent;
        }
      },
      function (error) {
        console.log("Calling func error: " + error);
      },
    ),
  );

  console.debug("Adding another task...");

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log(`${manifest.name} has finished replacing elements on this page.`);
}
