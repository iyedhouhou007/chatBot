# Weather Expert System - Pseudocode

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

## 4. Finding Root Facts

```
FUNCTION FindRootFacts(fact, visited=[]): 
    # Find basic facts needed to deduce a higher-level fact
    IF fact cannot be deduced from rules:
        RETURN [fact]  # It's a basic fact
    
    IF fact IN visited:
        RETURN []  # Prevent cycles
    
    Add fact to visited
    results = []
    
    FOR EACH rule IN RULES WHERE rule.conclusion = fact:
        FOR EACH condition IN rule.condition:
            Append FindRootFacts(condition, visited) to results
    
    RETURN results
```

## 5. Backward Chaining (Question Answering)

```
FUNCTION BackwardChaining(goal):
    Set CURRENT_GOAL = goal
    
    # Check if we already know the answer
    IF goal IN FACTS:
        RETURN "Yes, [goal]."
    
    # Find facts needed to answer this question
    neededFacts = FindFactsNeededForGoal(goal)
    
    # Ask questions
    QUESTION_QUEUE = neededFacts
    AskNextQuestion()
```

## 6. Finding Facts Needed for a Goal

```
FUNCTION FindFactsNeededForGoal(goal):
    # If goal is a basic fact, ask directly
    IF goal cannot be deduced from rules:
        RETURN [goal]
    
    neededFacts = []
    
    # Find rules that can derive this goal
    FOR EACH rule IN RULES WHERE rule.conclusion = goal:
        FOR EACH condition IN rule.condition:
            IF condition NOT IN FACTS AND 
               condition NOT IN ASKED_QUESTIONS AND
               condition NOT IN neededFacts:
                Add condition to neededFacts
    
    RETURN neededFacts
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
    
    ELSE IF input contains "?" or starts with question words:
        # Handle as question with backward chaining
        goal = IdentifyGoal(input)
        IF goal exists:
            BackwardChaining(goal)
        ELSE:
            Print "I'm not sure what you're asking about"
    
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

## 10. Goal Identification from Questions

```
FUNCTION IdentifyGoal(question):
    # Check if question contains any conclusion
    FOR EACH rule IN RULES:
        IF rule.conclusion appears in question:
            RETURN rule.conclusion
    
    # Check if question contains any condition
    FOR EACH rule IN RULES:
        FOR EACH condition IN rule.condition:
            IF condition appears in question:
                RETURN condition
    
    RETURN NULL
```

## 11. Main Loop

```
FUNCTION Main():
    Initialize FACTS as empty list
    Initialize ASKED_QUESTIONS as empty set
    Initialize QUESTION_QUEUE as empty queue
    
    WHILE TRUE:
        input = Get input from user
        ProcessUserInput(input)
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
        ... other opposites ...
    }
    
    RETURN oppositeMap[fact] if it exists, otherwise NULL
```

## 13. Checking Goal Status

```
FUNCTION CheckGoalStatus():
    # Run forward chaining to see if we can derive the goal
    ForwardChaining()
    
    IF CURRENT_GOAL IN FACTS:
        Print "Based on what you've told me, yes, [CURRENT_GOAL]."
    ELSE:
        # See if we need more information
        moreNeededFacts = FindFactsNeededForGoal(CURRENT_GOAL)
        
        IF moreNeededFacts is not empty:
            Add moreNeededFacts to QUESTION_QUEUE
            AskNextQuestion()
        ELSE:
            Print "Based on what you've told me, I cannot determine if [CURRENT_GOAL] is true."
    
    Reset CURRENT_GOAL to NULL
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