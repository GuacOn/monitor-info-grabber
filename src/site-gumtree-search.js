let apiKey = browser.storage.local.get("api_key");
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);
  gumtreeReplaceTextByClass(
    item["api_key"],
    "user-ad-row-new-design__title-span"
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
          let HTMLScorecardTable = await RTINGSSearch(value);
          if (HTMLScorecardTable) {
            // If model found
            // Create our scorecard popup (unique per model)
            let popupDiv = document.createElement("div");
            popupDiv.style.display = "none";
            popupDiv.style.fontSize = "14px";
            popupDiv.style.position = "relative";
            popupDiv.style.top = "30px";
            popupDiv.style.left = "7px";
            popupDiv.style.backgroundColor = "#555";
            popupDiv.style.color = "#fff";
            popupDiv.style.padding = "8px";
            popupDiv.style.borderRadius = "5px;";

            popupDivs[i] = popupDiv;

            // Add HTML scorecard table to our popupDiv
            popupDivs[i].appendChild(HTMLScorecardTable);

            // const elements = document.getElementsByClassName(className);
            // for (let i = 0; i < elements.length; i++) {
            setupHover(elements[i], popupDivs[i], value);
            // }
          }
        },
        function (error) {
          console.log("Calling func error: " + error);
        }
      )
    );

    console.debug("Adding another task...");
  }

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log(`${manifest.name} has finished replacing elements on this page.`);
}
