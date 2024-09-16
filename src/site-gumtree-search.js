let apiKey = browser.storage.local.get("api_key");
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);
  gumtreeReplaceTextByClass(
    item["api_key"],
    "user-ad-row-new-design__title-span",
  );
}

function onError(error) {
  alert("Please set your OpenAI API key in the extension settings.");
  console.log(`Error: ${error}`);
}

/**
 * For each ad result, queries ad text + description, and supplements ad title with RTINGS data.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {string} className Name of the class we will add information to
 */
async function gumtreeReplaceTextByClass(apiKey, className) {
  let elements = document.getElementsByClassName(className);
  let tasks = [];

  for (let i = 0; i < elements.length; i++) {
    // for each ad element
    let adTitle = elements[i].textContent + "\n";
    let adDescription =
      elements[i].parentElement.nextElementSibling.nextElementSibling
        .children[0].textContent;

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
            elements[i].textContent =
              "[[ " + result + " ]] -- " + elements[i].textContent;
          }
        },
        function (error) {
          console.log("Calling func error: " + error);
        },
      ),
    );

    console.debug("Adding another task...");
  }

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log(`${manifest.name} has finished replacing elements on this page.`);
}
