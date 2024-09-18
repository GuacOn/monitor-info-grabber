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

  const popupDiv = document.createElement("div");
  popupDiv.style.display = 'none';
  popupDiv.style.position = 'relative';
  popupDiv.style.top = '30px';
  popupDiv.style.left = '7px';
  popupDiv.style.backgroundColor = '#555';
  popupDiv.style.color = '#fff';
  popupDiv.style.padding = '8px';
  popupDiv.style.borderRadius = '5px;';

  // const node = document.createTextNode("This is a new paragraph.");
  // popupDiv.appendChild(node);

  // Send to GPT for analysis
  tasks.push(
    GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
      async function (value) {
        console.log("Calling func retrieved model number: " + value);
        // Search RTINGS API for monitor model
        let result = await RTINGSSearch(value);
        if (result) {
          // Add HTML scorecard table to our popupDiv
          popupDiv.appendChild(result)

          // Make ad title hover-able
          const elementToHover = elements[0];
          elements[0].appendChild(popupDiv);
          const elementToPopup = popupDiv;

          elementToHover.addEventListener('mouseenter',() => {
                  elementToPopup.style.display = 'block';
              });

          elementToHover.addEventListener('mouseleave',() => {
                  elementToPopup.style.display = 'none';
              });
          

          // Replace ad title with retrieved data
          // elements[0].textContent =
          //   "[[ " + result + " ]] -- " + elements[0].textContent;
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
