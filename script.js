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
  div.innerHTML =
    sender === "bot"
      ? `<span class="name-sender">BOT:</span> ${msg}`
      : `<span class="name-sender">USER:</span> ${msg}`;
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

  if (
    lowerCaseInput.includes("reset") ||
    lowerCaseInput.includes("start over")
  ) {
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
  addMessage(
    "System has been reset. What would you like to know about the weather?"
  );
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

  if (
    askableQueue.length === 0 &&
    awaitingQuestion === null &&
    currentGoal === null
  ) {
    if (facts.length > 0) {
      addMessage(
        `That's all I can deduce. My final conclusion is: "${
          facts[facts.length - 1]
        }"`
      );
    } else {
      addMessage(
        "I cannot determine anything further with the provided information."
      );
    }
    return;
  }
  if (
    askableQueue.length === 0 &&
    awaitingQuestion === null &&
    currentGoal !== null
  ) {
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
    addMessage(
      `I understand that "${oppositeFact}" since you denied "${deniedFact}".`
    );
    return true;
  }

  return false;
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
    addMessage(
      `I don't have enough information to determine if ${goal} is true.`
    );
    currentGoal = null;
    return;
  }

  backwardQueue = [...neededFacts];
  askNextBackwardQuestion();
}

function findGoalInQuestion(question) {
  const lowerQuestion = question.toLowerCase();

  const cleanQuestion = lowerQuestion
    .replace(/is there|will it|is it|are there|does it|can it|would it/g, "")
    .replace(/\?/g, "")
    .trim();

  for (let rule of rules) {
    const conclusion = rule.conclusion.toLowerCase();
    if (lowerQuestion.includes(conclusion)) {
      return rule.conclusion;
    }

    const simplifiedConclusion = conclusion
      .replace(/is|are|will|there|it|a|be|the|probably|chance of/g, "")
      .trim();

    if (cleanQuestion.includes(simplifiedConclusion)) {
      return rule.conclusion;
    }
  }

  for (let rule of rules) {
    for (let condition of rule.condition) {
      const conditionLower = condition.toLowerCase();
      if (lowerQuestion.includes(conditionLower)) {
        return condition;
      }

      const simplifiedCondition = conditionLower
        .replace(/is|are|will|there|it|a|be|the|probably|chance of/g, "")
        .trim();

      if (cleanQuestion.includes(simplifiedCondition)) {
        return condition;
      }
    }
  }

  const keywords = [
    { keyword: "snow", goal: "it will probably snow" },
    { keyword: "rain", goal: "it will probably rain" },
    { keyword: "storm", goal: "there is a chance of a storm" },
    { keyword: "heatwave", goal: "there is a chance of a heatwave" },
    { keyword: "flooding", goal: "there is a risk of flooding" },
    { keyword: "hot", goal: "it is hot" },
    { keyword: "cold", goal: "it is cold" },
    { keyword: "temperature high", goal: "temperature is high" },
    { keyword: "temperature low", goal: "temperature is low" },
    { keyword: "cloudy", goal: "sky is cloudy" },
    { keyword: "wind", goal: "wind is strong" },
  ];

  for (let item of keywords) {
    if (lowerQuestion.includes(item.keyword)) {
      return item.goal;
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
    return [goal];
  }

  const allNeededFacts = [];

  const relevantRules = rules.filter((rule) => rule.conclusion === goal);

  let bestRule = null;
  let bestRuleKnownConditions = -1;

  for (let rule of relevantRules) {
    const knownConditions = rule.condition.filter((c) =>
      facts.includes(c)
    ).length;
    if (knownConditions > bestRuleKnownConditions) {
      bestRuleKnownConditions = knownConditions;
      bestRule = rule;
    }
  }

  if (bestRule) {
    for (let condition of bestRule.condition) {
      if (facts.includes(condition)) {
        continue;
      }

      const primitiveFactsForCondition = traceToAskableFacts(condition);

      for (let fact of primitiveFactsForCondition) {
        if (
          !facts.includes(fact) &&
          !allNeededFacts.includes(fact) &&
          !askedQuestions.has(fact)
        ) {
          allNeededFacts.push(fact);
        }
      }
    }
  }

  return allNeededFacts;
}

function askNextBackwardQuestion() {
  if (backwardQueue.length === 0) {
    checkGoalStatus();
    return;
  }

  const nextQuestion = backwardQueue.shift();

  if (
    facts.includes(nextQuestion) ||
    askedQuestions.has(nextQuestion) ||
    isOppositeAskedOrKnown(nextQuestion)
  ) {
    askNextBackwardQuestion();
    return;
  }

  awaitingQuestion = nextQuestion;
  addMessage(`Is it true that "${nextQuestion}"? (yes/no)`);
  askedQuestions.add(nextQuestion);
}

function checkGoalStatus() {
  deduceFacts();

  if (facts.includes(currentGoal)) {
    const simplifiedGoal = currentGoal
      .replace("there is a chance of", "expect")
      .replace("there is a risk of", "watch out for")
      .replace("it will probably", "it will")
      .replace("it is", "it's");

    addMessage(`Yes, ${simplifiedGoal}.`);
  } else {
    const oppositeGoal = getOppositeFact(currentGoal);
    if (oppositeGoal && facts.includes(oppositeGoal)) {
      const negatedGoal = currentGoal
        .replace("there is a chance of", "no chance of")
        .replace("there is a risk of", "no risk of")
        .replace("it will probably", "it won't")
        .replace("it is", "it's not");

      addMessage(`No, ${negatedGoal}.`);
    } else {
      const moreFactsNeeded = findFactsNeededForGoal(currentGoal);

      if (moreFactsNeeded.length > 0) {
        backwardQueue = [...moreFactsNeeded];
        askNextBackwardQuestion();
        return;
      }

      const simplifiedGoal = currentGoal
        .replace("there is a", "")
        .replace("it will probably", "")
        .replace("it is", "");

      addMessage(
        `No, ${simplifiedGoal.trim()} is not expected with the current conditions.`
      );
    }
  }

  currentGoal = null;
}

function processUserInput() {
  const userText = input.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  input.value = "";

  if (
    userText.toLowerCase() === "reset" ||
    userText.toLowerCase() === "start over"
  ) {
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
      setTimeout(checkGoalStatus, 500);
    } else {
      deduceFacts();
      setTimeout(askFollowUp, 500);
    }
  } else {
    const isQuestion =
      userText.includes("?") ||
      userText
        .toLowerCase()
        .match(/^(is|are|will|can|does|would|should|has|have|do)/);

    if (isQuestion) {
      const goal = findGoalInQuestion(userText);

      if (goal) {
        handleQuestion(goal);
        return;
      } else {
        addMessage(
          "I'm not sure what you're asking about. Try asking about weather conditions like rain, snow, storms, or temperature."
        );
        return;
      }
    }

    const extractedFacts = extractFacts(userText);

    extractedFacts.forEach((fact) => {
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

function handleEnter(e) {
  if (e.key === "Enter") {
    processUserInput();
  }
}

addMessage(
  "Hello! I can help predict the weather based on your inputs. What's the weather like today?"
);
