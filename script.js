const chat = document.getElementById("chat");
const input = document.getElementById("userInput");

let facts = [];
let awaitingQuestion = null;
const askedQuestions = new Set();

const rules = [
  { condition: ["temperature is high"], conclusion: "it is hot" },
  { condition: ["sky is cloudy"], conclusion: "it will probably rain" },
  { condition: ["temperature is low"], conclusion: "it is cold" },
  {
    condition: ["wind is strong", "it will probably rain"],
    conclusion: "there is a chance of a storm",
  },
  {
    condition: ["it is hot", "wind is strong"],
    conclusion: "there is a chance of a heatwave",
  },
  {
    condition: ["it is cold", "sky is cloudy"],
    conclusion: "it will probably snow",
  },
  {
    condition: ["there is a chance of a storm"],
    conclusion: "there is a risk of flooding",
  },
];

const deductionMap = {};
for (let rule of rules) {
  deductionMap[rule.conclusion] = rule.condition;
}

function traceToAskableFacts(fact, visited = new Set()) {
  if (!deductionMap[fact]) {
    return [fact];
  }
  if (visited.has(fact)) {
    return [];
  }
  visited.add(fact);

  if (visited.size > 20) {
    console.warn("Possible circular dependency detected in rules");
    return [];
  }

  let results = [];
  for (let cond of deductionMap[fact]) {
    results.push(...traceToAskableFacts(cond, new Set(visited)));
  }
  const uniqueResults = [...new Set(results)];
  return uniqueResults;
}

function addMessage(msg, sender = "bot") {
  const div = document.createElement("div");
  div.className = sender;
  div.innerText = sender === "bot" ? `🤖 ${msg}` : `👤 ${msg}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function extractFacts(input) {
  const keywords = {
    "temperature is high": [
      "temperature high",
      "temp high",
      "hot",
      "warm",
      "heat",
      "burning",
      "scorching",
    ],
    "temperature is low": [
      "temperature low",
      "temp low",
      "cold",
      "chilly",
      "freezing",
      "cool",
      "frigid",
    ],
    "sky is cloudy": [
      "sky cloudy",
      "cloudy",
      "overcast",
      "grey sky",
      "gray sky",
      "dark clouds",
      "clouds in the sky",
    ],
    "sky is not cloudy": ["clear sky", "sunny", "blue sky", "no clouds"],
    "wind is strong": [
      "wind strong",
      "strong wind",
      "windy",
      "gale",
      "gusts",
      "blustery",
      "high winds",
    ],
    "wind is not strong": ["light breeze", "gentle wind", "no wind", "calm"],
    "it is hot": ["hot", "warm", "heat"],
    "it is cold": ["cold", "chilly", "freezing", "cool"],
    "it will probably rain": [
      "probably rain",
      "likely rain",
      "rain",
      "rainfall",
      "precipitation",
      "rainy",
      "raining",
    ],
  };

  const extracted = [];
  const lowerCaseInput = input.toLowerCase();

  if (lowerCaseInput.includes("reset") || lowerCaseInput.includes("start over")) {
    resetSystem();
    return ["system reset"];
  }

  for (const fact in keywords) {
    if (keywords.hasOwnProperty(fact)) {
      const synonyms = keywords[fact];
      if (synonyms.some((synonym) => lowerCaseInput.includes(synonym))) {
        extracted.push(fact);
      }
    }
  }
  return extracted;
}

function deduceFacts() {
  let added = false;
  for (let rule of rules) {
    if (
      rule.condition.every((c) => facts.includes(c)) &&
      !facts.includes(rule.conclusion)
    ) {
      facts.push(rule.conclusion);
      addMessage(`Based on that, I conclude: "${rule.conclusion}"`);
      added = true;

      const isFinal = isFinalConclusion(rule.conclusion);
      if (isFinal) {
        return;
      }
    }
  }
  return added;
}

function isFinalConclusion(conclusion) {
  for (let rule of rules) {
    if (rule.condition.includes(conclusion)) {
      return false;
    }
  }
  return true;
}

let askableQueue = [];

function buildAskableQueue() {
  const queueSet = new Set();

  const tempFacts = [];
  for (let rule of rules) {
    for (let cond of rule.condition) {
      const rootFacts = traceToAskableFacts(cond);
      for (let fact of rootFacts) {
        if (!facts.includes(fact) && !askedQuestions.has(fact)) {
          tempFacts.push(fact);
        }
      }
    }
  }

  for (let fact of tempFacts) {
    const hasOpposite = isOppositeAskedOrKnown(fact);

    if (
      !facts.includes(fact) &&
      !facts.some(
        (knownFact) =>
          deductionMap[knownFact] && deductionMap[knownFact].includes(fact)
      ) &&
      !hasOpposite &&
      !askedQuestions.has(fact)
    ) {
      queueSet.add(fact);
    }
  }

  askableQueue = Array.from(queueSet);

  askableQueue.sort((a, b) => {
    if (getOppositeFact(a)) return -1;
    return 0;
  });
}

function getOppositeFact(fact) {
  const oppositeMap = {
    "temperature is high": "temperature is low",
    "temperature is low": "temperature is high",
    "sky is cloudy": "sky is not cloudy",
    "sky is not cloudy": "sky is cloudy",
    "wind is strong": "wind is not strong",
    "wind is not strong": "wind is strong",
    "it is hot": "it is cold",
    "it is cold": "it is hot",
    "it will probably rain": "it will not rain",
    "it will not rain": "it will probably rain",
    "there is a chance of a storm": "there is no chance of a storm",
    "there is no chance of a storm": "there is a chance of a storm",
    "there is a chance of a heatwave": "there is no chance of a heatwave",
    "there is no chance of a heatwave": "there is a chance of a heatwave",
    "it will probably snow": "it will not snow",
    "it will not snow": "it will probably snow",
    "there is a risk of flooding": "there is no risk of flooding",
    "there is no risk of flooding": "there is a risk of flooding",
  };

  return oppositeMap[fact];
}

function isOppositeAskedOrKnown(fact) {
  const oppositeFact = getOppositeFact(fact);

  if (oppositeFact) {
    const isKnown = facts.includes(oppositeFact);
    const isAsked = askedQuestions.has(oppositeFact);

    return isKnown || isAsked;
  }
  return false;
}

function resetSystem() {
  facts = [];
  awaitingQuestion = null;
  askedQuestions.clear();
  askableQueue = [];
  addMessage("System has been reset. What would you like to know about the weather?");
}

function askFollowUp() {
  if (askableQueue.length === 0) {
    buildAskableQueue();
  }

  if (askableQueue.length > 0) {
    askableQueue = askableQueue.filter((fact) => !isOppositeAskedOrKnown(fact));

    while (askableQueue.length > 0) {
      const next = askableQueue.shift();

      if (!facts.includes(next) && !isOppositeAskedOrKnown(next)) {
        addMessage(`Is it true that "${next}"? (yes/no)`);
        awaitingQuestion = next;
        askedQuestions.add(next);

        const oppositeFact = getOppositeFact(next);
        if (oppositeFact) {
          askableQueue = askableQueue.filter((f) => f !== oppositeFact);
        }

        return;
      }
    }
  }

  if (askableQueue.length === 0 && awaitingQuestion === null && currentGoal === null) {
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
    return;
  }
   if (askableQueue.length === 0 && awaitingQuestion === null && currentGoal !== null) {
        checkGoalStatus();
        return;
   }


   if (awaitingQuestion === null && currentGoal === null) {
      addMessage("No further conclusions can be made.");
   }

}

function inferFromNegation(deniedFact) {
  const oppositeFact = getOppositeFact(deniedFact);

  if (oppositeFact && !facts.includes(oppositeFact)) {
    facts.push(oppositeFact);
    addMessage(`I understand that "${oppositeFact}" since you denied "${deniedFact}".`);
    return true;
  }

  return false;
}

function handleEnter(e) {
  if (e.key === "Enter") {
    processUserInput();
  }
}

const conclusionMap = {};
for (let rule of rules) {
  if (!conclusionMap[rule.conclusion]) {
    conclusionMap[rule.conclusion] = [];
  }
  conclusionMap[rule.conclusion].push(rule.condition);
}

let currentGoal = null;
let backwardQueue = [];

function handleQuestion(question) {
  const goal = findGoalInQuestion(question);

  if (!goal) {
    addMessage("I'm not sure what you're asking about. Could you rephrase?");
    return;
  }

  currentGoal = goal;

  if (facts.includes(goal)) {
    addMessage(`Yes, ${goal}.`);
    currentGoal = null;
    return;
  }

  const neededFacts = findFactsNeededForGoal(goal);

  if (neededFacts.length === 0) {
    addMessage(`I don't have enough information to determine if ${goal} is true.`);
    currentGoal = null;
    return;
  }

  backwardQueue = [...neededFacts];
  askNextBackwardQuestion();
}

function findGoalInQuestion(question) {
  for (let rule of rules) {
    if (question.toLowerCase().includes(rule.conclusion.toLowerCase())) {
      return rule.conclusion;
    }
  }

  for (let rule of rules) {
    for (let cond of rule.condition) {
      if (question.toLowerCase().includes(cond.toLowerCase())) {
        return cond;
      }
    }
  }

  return null;
}

function findFactsNeededForGoal(goal) {
  let isBasicFact = true;
  for (let rule of rules) {
    if (rule.conclusion === goal) {
      isBasicFact = false;
      break;
    }
  }

  if (isBasicFact) {
    if (!facts.includes(goal) && !askedQuestions.has(goal)) {
       return [goal];
    } else {
       return [];
    }
  }

  const relevantRules = rules.filter(rule => rule.conclusion === goal);

  const neededFacts = [];

  for (let rule of relevantRules) {
    for (let condition of rule.condition) {
      if (!facts.includes(condition) && !neededFacts.includes(condition) && !askedQuestions.has(condition)) {
        neededFacts.push(condition);
      }
    }
  }

  return neededFacts;
}

function askNextBackwardQuestion() {
  if (backwardQueue.length === 0) {
    checkGoalStatus();
    return;
  }

  const nextQuestion = backwardQueue.shift();

  if (facts.includes(nextQuestion) || askedQuestions.has(nextQuestion) || isOppositeAskedOrKnown(nextQuestion) ) {
       askNextBackwardQuestion(); // Skip if already known/asked/opposite known
       return;
  }


  awaitingQuestion = nextQuestion;
  addMessage(`Is it true that "${nextQuestion}"? (yes/no)`);
  askedQuestions.add(nextQuestion);
}

function checkGoalStatus() {
  deduceFacts();

  if (facts.includes(currentGoal)) {
    addMessage(`Based on what you've told me, yes, ${currentGoal}.`);
  } else {
    const moreFactsNeeded = findFactsNeededForGoal(currentGoal);

    if (moreFactsNeeded.length > 0) {
      backwardQueue = [...moreFactsNeeded];
      askNextBackwardQuestion();
      return;
    }

    addMessage(`Based on what you've told me, I cannot determine if ${currentGoal} is true.`);
  }

  currentGoal = null;
}

function processUserInput() {
  const userText = input.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  input.value = "";

  if (userText.toLowerCase() === "reset" || userText.toLowerCase() === "start over") {
    resetSystem();
    return;
  }

  if (awaitingQuestion) {
    const isYes = userText.toLowerCase().startsWith("y");

    if (isYes) {
      facts.push(awaitingQuestion);
      addMessage(`Noted: "${awaitingQuestion}"`);
    } else {
      addMessage(`Okay, skipping "${awaitingQuestion}".`);
      inferFromNegation(awaitingQuestion);
    }

    awaitingQuestion = null;

    if (currentGoal) {
      deduceFacts();
      setTimeout(checkGoalStatus, 500); // In backward chaining, check goal after answering a question
    } else {
      deduceFacts();
      setTimeout(askFollowUp, 500); // In forward chaining, ask next follow up question
    }
  } else if (userText.includes("?") ||
             userText.toLowerCase().startsWith("is") ||
             userText.toLowerCase().startsWith("will") ||
             userText.toLowerCase().startsWith("are")) {
    handleQuestion(userText);
  } else {
    const extractedFacts = extractFacts(userText);

    extractedFacts.forEach(fact => {
      if (!facts.includes(fact)) {
        facts.push(fact);
      }
    });

    deduceFacts();
    setTimeout(askFollowUp, 500);
  }
}

input.addEventListener("keypress", handleEnter);

const sendButton = document.getElementById("sendButton");
if (sendButton) {
  sendButton.addEventListener("click", processUserInput);
}

const resetButton = document.getElementById("resetButton");
if (resetButton) {
  resetButton.addEventListener("click", resetSystem);
}

addMessage("Hello! I can help predict the weather based on your inputs. What's the weather like today?");