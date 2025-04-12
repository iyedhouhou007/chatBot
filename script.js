const chat = document.getElementById("chat"); // Get the chat display element
const input = document.getElementById("userInput"); // Get the user input element

let facts = []; // Array to store known facts
let awaitingQuestion = null; // Stores the fact the chatbot is waiting for user confirmation on
const askedQuestions = new Set(); // Set to store facts that have already been asked

const rules = [
  // Define the rules for the expert system
  { condition: ["temperature is high"], conclusion: "it is hot" }, // Rule 1 [cite: 5]
  { condition: ["sky is cloudy"], conclusion: "it will probably rain" }, // Rule 2 [cite: 6]
  { condition: ["temperature is low"], conclusion: "it is cold" }, // Rule 3 [cite: 7]
  {
    condition: ["wind is strong", "it will probably rain"],
    conclusion: "there is a chance of a storm",
  }, // Rule 4 [cite: 7, 8]
  {
    condition: ["it is hot", "wind is strong"],
    conclusion: "there is a chance of a heatwave",
  }, // Rule 5 [cite: 8]
  {
    condition: ["it is cold", "sky is cloudy"],
    conclusion: "it will probably snow",
  }, // Rule 6 [cite: 9]
  {
    condition: ["there is a chance of a storm"],
    conclusion: "there is a risk of flooding",
  }, // Rule 7 [cite: 10]
];

// Step 1: Build a map of conclusions → their rule conditions
const deductionMap = {};
for (let rule of rules) {
  deductionMap[rule.conclusion] = rule.condition;
}

// Step 2: Trace a fact to all non-deducible facts (root facts) recursively
function traceToAskableFacts(fact, visited = new Set()) {
  // Function to recursively trace a fact to all non-deducible facts
  if (!deductionMap[fact]) return [fact]; // Base case: it's a root fact
  if (visited.has(fact)) return []; // Prevent loops
  visited.add(fact);
  let results = [];
  for (let cond of deductionMap[fact]) {
    results.push(...traceToAskableFacts(cond, visited));
  }
  return results;
}

function addMessage(msg, sender = "bot") {
  // Function to add a message to the chat display
  const div = document.createElement("div");
  div.className = sender;
  div.innerText = sender === "bot" ? `🤖 ${msg}` : `👤 ${msg}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight; // Scroll to the bottom of the chat
}

function extractFacts(input) {
  // Function to extract facts from user input
  const keywords = {
    "temperature is high": ["temperature high", "temp high", "hot"],
    "temperature is low": ["temperature low", "temp low", "cold"],
    "sky is cloudy": ["sky cloudy", "cloudy"],
    "wind is strong": ["wind strong", "strong wind", "windy"],
    "it is hot": ["hot"],
    "it is cold": ["cold"],
    "it will probably rain": ["probably rain", "likely rain", "rain"],
  };

  const extracted = [];
  const lowerCaseInput = input.toLowerCase(); // Convert input to lowercase

  for (const fact in keywords) {
    if (keywords.hasOwnProperty(fact)) {
      const synonyms = keywords[fact];
      if (synonyms.some((synonym) => lowerCaseInput.includes(synonym))) {
        // Check if any synonym is in the input
        extracted.push(fact); // Add the fact to the extracted facts
      }
    }
  }
  return extracted;
}

function deduceFacts() {
  // Function to infer new facts based on the rules
  let added = false;
  for (let rule of rules) {
    if ( rule.condition.every((c) => facts.includes(c)) && !facts.includes(rule.conclusion) ) {
      // Check if all conditions of the rule are met and the conclusion is not already known
      facts.push(rule.conclusion); // Add the conclusion to the facts
      addMessage(`Based on that, I conclude: "${rule.conclusion}"`);
      added = true;

      // Check if the conclusion is final
      if (isFinalConclusion(rule.conclusion)) {
        return; // Stop inferring and asking
      }
    }
  }
  return added;
}

function isFinalConclusion(conclusion) {
  // Function to check if a conclusion is final (not a condition for any other rule)
  for (let rule of rules) {
    if (rule.condition.includes(conclusion)) {
      return false; // This conclusion is a condition for another rule
    }
  }
  return true; // It's a final conclusion
}

let askableQueue = [];

function buildAskableQueue() {
  // Function to build a queue of facts that need to be asked to the user
  const queueSet = new Set();
  for (let rule of rules) {
    for (let cond of rule.condition) {
      const rootFacts = traceToAskableFacts(cond);
      rootFacts.forEach((fact) => {
        // Only add to queue if the fact AND its conclusion are not already known
        if (
          !facts.includes(fact) &&
          !facts.some(
            (knownFact) =>
              deductionMap[knownFact] && deductionMap[knownFact].includes(fact)
          ) &&
          !isOppositeAskedOrKnown(fact) &&
          !askedQuestions.has(fact)
        ) {
          queueSet.add(fact);
        }
      });
    }
  }
  askableQueue = Array.from(queueSet);
}

function isOppositeAskedOrKnown(fact) {
  // Function to check if the "opposite" of a fact has been asked or is known
  const oppositeMap = {
    "temperature is high": "temperature is low",
    "temperature is low": "temperature is high",
    "sky is cloudy": "sky is not cloudy",
    "sky is not cloudy": "sky is cloudy",
    "wind is strong": "wind is not strong",
    "wind is not strong": "wind is strong",
    // Add other potential opposites here as needed
  };

  if (oppositeMap[fact]) {
    return (
      facts.includes(oppositeMap[fact]) || askedQuestions.has(oppositeMap[fact])
    );
  }
  return false;
}

function askFollowUp() {
  // Function to ask the user for information to progress the deduction
  if (askableQueue.length === 0) {
    buildAskableQueue();
  }

  if (askableQueue.length > 0) {
    while (askableQueue.length > 0) {
      const next = askableQueue.shift();
      if (!facts.includes(next)) {
        addMessage(`Is it true that "${next}"? (yes/no)`);
        awaitingQuestion = next;
        askedQuestions.add(next);
        return;
      }
    }
  }

  // If askableQueue is empty AND inferFacts didn't add anything...
  if (askableQueue.length === 0 && awaitingQuestion === null) {
    if (facts.length > 0) {
      const lastConclusion = facts[facts.length - 1];
      addMessage(
        `That's all I can deduce. My final conclusion is: "${lastConclusion}"`
      );
    } else {
      addMessage(
        "I cannot determine anything further with the provided information."
      );
    }
    return; // Stop processing
  }

  addMessage("No further conclusions can be made.");
}

function handleEnter(e) {
  // Function to handle user input
  if (e.key === "Enter") {
    const userText = input.value.trim(); // Get user input
    if (!userText) return; // If input is empty, do nothing
    addMessage(userText, "user"); // Add user message to chat
    input.value = ""; // Clear the input field

    if (awaitingQuestion) {
      // If the chatbot is waiting for a response
      if (userText.toLowerCase().startsWith("y")) {
        // If the user says "yes"
        facts.push(awaitingQuestion); // Add the fact to the facts
        addMessage(`Noted: "${awaitingQuestion}"`);
        deduceFacts(); // Infer new facts
      } else {
        // If the user says "no" or anything else
        addMessage(`Okay, skipping "${awaitingQuestion}".`);
      }
      awaitingQuestion = null; // Reset awaitingQuestion
      setTimeout(askFollowUp, 500); // Ask the next question
    } else {
      // If the chatbot is not waiting for a response
      const extracted = extractFacts(userText); // Extract facts from user input
      extracted.forEach((f) => {
        if (!facts.includes(f)) facts.push(f); // Add extracted facts to the facts
      });
      deduceFacts(); // Infer new facts
      askableQueue = []; // Reset the askable queue
      setTimeout(askFollowUp, 500); // Ask the next question
    }
  }
}
