# Weather Expert System - Pseudocode (Updated Version)

## 1. Data Structures

```
KNOWLEDGE_BASE:
  - RULES: List of {condition: [fact1, fact2, ...], conclusion: fact}
  - FACTS: List of known facts
  - ASKED_QUESTIONS: Set of facts we've already asked about 
  - CURRENT_GOAL: The current fact we're trying to prove (for backward chaining)
  - QUESTION_QUEUE: Queue of questions to ask
```

## 2. Forward Chaining (Exploratory Mode)

```
FUNCTION ForwardChaining():
    REPEAT:
        factAdded = FALSE
        FOR EACH rule IN RULES:
            IF all conditions in rule.condition are in FACTS AND 
               rule.conclusion is not in FACTS THEN:
                Add rule.conclusion to FACTS
                Print "Based on that, I conclude: [rule.conclusion]"
                factAdded = TRUE
        UNTIL factAdded = FALSE
```

## 3. Building Question Queue (Forward Chaining)

```
FUNCTION BuildQuestionQueue():
    tempFacts = []
    
    FOR EACH rule IN RULES:
        FOR EACH condition IN rule.condition:
            rootFacts = FindRootFacts(condition)
            FOR EACH fact IN rootFacts:
                IF fact NOT IN FACTS AND fact NOT IN ASKED_QUESTIONS:
                    Add fact to tempFacts
    
    FOR EACH fact IN tempFacts:
        IF fact NOT IN FACTS AND 
           GetOppositeFact(fact) NOT IN FACTS AND
           GetOppositeFact(fact) NOT IN ASKED_QUESTIONS:
            Add fact to QUESTION_QUEUE
```

## 4. Finding Root Facts (Tracing to Primitive Facts)

```
FUNCTION FindRootFacts(fact, visited=[]): 
    # Find primitive facts needed to deduce a higher-level fact
    IF fact cannot be deduced from rules:
        RETURN [fact]  # It's a primitive fact
    
    IF fact IN visited:
        RETURN []  # Prevent cycles
    
    Add fact to visited
    results = []
    
    FOR EACH rule IN RULES WHERE rule.conclusion = fact:
        FOR EACH condition IN rule.condition:
            Append FindRootFacts(condition, visited) to results
    
    RETURN Remove duplicates from results
```

## 5. Backward Chaining (Question Answering)

```
FUNCTION BackwardChaining(goal):
    Set CURRENT_GOAL = goal
    
    # Check if we already know the answer
    IF goal IN FACTS:
        RETURN FormulateDirectAnswer(goal, TRUE)
    
    # Check if the opposite is known (making this goal false)
    oppositeGoal = GetOppositeFact(goal)
    IF oppositeGoal IN FACTS:
        RETURN FormulateDirectAnswer(goal, FALSE)
    
    # Find primitive facts needed to answer this question
    neededFacts = FindFactsNeededForGoal(goal)
    
    # Ask questions
    QUESTION_QUEUE = neededFacts
    AskNextQuestion()
```

## 6. Finding Facts Needed for a Goal (Improved Version)

```
FUNCTION FindFactsNeededForGoal(goal):
    # If goal is a primitive fact, ask directly
    IF goal cannot be deduced from rules:
        RETURN [goal]
    
    allNeededFacts = []
    
    # Find rules that can derive this goal
    relevantRules = RULES where rule.conclusion == goal
    
    # Choose best rule (with most conditions already known)
    bestRule = NULL
    bestRuleKnownConditions = -1
    
    FOR EACH rule IN relevantRules:
        knownConditions = COUNT(conditions IN rule.condition WHERE condition IN FACTS)
        IF knownConditions > bestRuleKnownConditions:
            bestRuleKnownConditions = knownConditions
            bestRule = rule
    
    IF bestRule NOT NULL:
        # For each unknown condition, find primitive facts
        FOR EACH condition IN bestRule.condition:
            IF condition NOT IN FACTS:
                primitiveFactsForCondition = FindRootFacts(condition)
                
                # Add only primitive facts we don't know yet
                FOR EACH fact IN primitiveFactsForCondition:
                    IF fact NOT IN FACTS AND 
                       fact NOT IN allNeededFacts AND 
                       fact NOT IN ASKED_QUESTIONS:
                        Add fact to allNeededFacts
    
    RETURN allNeededFacts
```

## 7. Question Asking Process

```
FUNCTION AskNextQuestion():
    IF QUESTION_QUEUE is empty:
        CheckGoalStatus()
        RETURN
    
    nextQuestion = Remove first question from QUESTION_QUEUE
    
    IF nextQuestion IN FACTS OR nextQuestion IN ASKED_QUESTIONS:
        AskNextQuestion()  # Skip and go to next
        RETURN
    
    Add nextQuestion to ASKED_QUESTIONS
    Ask "Is it true that [nextQuestion]? (yes/no)"
```

## 8. Processing User Responses

```
FUNCTION ProcessUserInput(input):
    IF awaiting answer to a question:
        IF input starts with "y":
            Add current question to FACTS
            Print "Noted: [current question]"
        ELSE:
            Print "Okay, skipping [current question]"
            
            # Try to infer the opposite
            opposite = GetOppositeFact(current question)
            IF opposite exists:
                Add opposite to FACTS
                Print "I understand that [opposite]"
        
        # Continue with appropriate chain
        IF CURRENT_GOAL exists:
            AskNextQuestion()  # Continue backward chaining
        ELSE:
            ForwardChaining()  # Continue forward chaining
            AskNextQuestion()  
    
    ELSE IF input looks like a question:  # Enhanced question detection
        # Try to identify what the user is asking about
        goal = IdentifyGoalInQuestion(input)
        
        IF goal exists:
            BackwardChaining(goal)
        ELSE:
            Print "I'm not sure what you're asking about. Try asking about specific weather conditions."
    
    ELSE:
        # Handle as statement with forward chaining
        extractedFacts = ExtractFacts(input)
        Add extractedFacts to FACTS
        ForwardChaining()
        BuildQuestionQueue()
        AskNextQuestion()
```

## 9. Extracting Facts from Natural Language

```
FUNCTION ExtractFacts(text):
    extractedFacts = []
    lowercaseText = Convert text to lowercase
    
    FOR EACH knownFact AND its keywords:
        IF any keyword exists in lowercaseText:
            Add knownFact to extractedFacts
    
    RETURN extractedFacts
```

## 10. Enhanced Goal Identification from Questions

```
FUNCTION IdentifyGoalInQuestion(question):
    lowerQuestion = Convert question to lowercase
    cleanQuestion = Remove common phrases like "is there", "will it", etc.
    
    # Try direct matches with conclusions
    FOR EACH rule IN RULES:
        IF rule.conclusion appears in lowerQuestion:
            RETURN rule.conclusion
        
        # Try partial match after removing common words
        simplifiedConclusion = Remove common words from rule.conclusion
        IF simplifiedConclusion appears in cleanQuestion:
            RETURN rule.conclusion
    
    # Try matching with conditions
    FOR EACH rule IN RULES:
        FOR EACH condition IN rule.condition:
            IF condition appears in lowerQuestion:
                RETURN condition
            
            # Try partial match
            simplifiedCondition = Remove common words from condition
            IF simplifiedCondition appears in cleanQuestion:
                RETURN condition
    
    # Try keyword matching as last resort
    FOR EACH keyword-goal pair IN KEYWORD_MAPPING:
        IF keyword appears in lowerQuestion:
            RETURN goal
    
    RETURN NULL
```

## 11. Checking Goal Status with Direct Answers

```
FUNCTION CheckGoalStatus():
    # Run forward chaining to see if we can derive the goal
    ForwardChaining()
    
    IF CURRENT_GOAL IN FACTS:
        # Direct positive answer
        simplifiedGoal = Format CURRENT_GOAL to be more conversational
        Print "Yes, [simplifiedGoal]."
    ELSE:
        # Check if opposite is known
        oppositeGoal = GetOppositeFact(CURRENT_GOAL)
        IF oppositeGoal IN FACTS:
            # Direct negative answer based on opposite
            negatedGoal = Format CURRENT_GOAL as negative statement
            Print "No, [negatedGoal]."
        ELSE:
            # Try one more time to get more facts
            moreNeededFacts = FindFactsNeededForGoal(CURRENT_GOAL)
            
            IF moreNeededFacts is not empty:
                Add moreNeededFacts to QUESTION_QUEUE
                AskNextQuestion()
                RETURN
            
            # Cannot determine - direct "no" with explanation
            simplifiedGoal = Remove phrases like "there is a" from CURRENT_GOAL
            Print "No, [simplifiedGoal] is not expected with the current conditions."
    
    Reset CURRENT_GOAL to NULL
```

## 12. Handling Opposite Facts

```
FUNCTION GetOppositeFact(fact):
    oppositeMap = {
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
        ... other opposites ...
    }
    
    RETURN oppositeMap[fact] if it exists, otherwise NULL
```

## 13. Main Loop

```
FUNCTION Main():
    Initialize FACTS as empty list
    Initialize ASKED_QUESTIONS as empty set
    Initialize QUESTION_QUEUE as empty queue
    
    WHILE TRUE:
        input = Get input from user
        ProcessUserInput(input)
```

## 14. System Reset

```
FUNCTION ResetSystem():
    Clear FACTS list
    Clear ASKED_QUESTIONS set
    Clear QUESTION_QUEUE
    Set CURRENT_GOAL to NULL
    Print "System has been reset. What would you like to know about the weather?"
``` 