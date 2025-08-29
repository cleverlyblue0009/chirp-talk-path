import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services.model_manager import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter()

class ScenarioGenerationRequest(BaseModel):
    text: str
    difficulty: int = 1
    tags: List[str] = []
    target_age: Optional[int] = None

class ScenarioStep(BaseModel):
    id: str
    type: str  # "avatar_speak", "avatar_ask", "avatar_respond"
    content: str
    expected_response: Optional[str] = None
    hints: List[str] = []

class ScenarioScript(BaseModel):
    title: str
    description: str
    difficulty: int
    tags: List[str]
    steps: List[ScenarioStep]

class RubricLevel(BaseModel):
    eye_contact: Dict[str, float]
    speech_clarity: Dict[str, float] 
    engagement: Dict[str, float]
    turn_taking: Dict[str, float]

class ScenarioRubric(BaseModel):
    levels: Dict[str, RubricLevel]
    feedback: Dict[str, List[str]]

class ScenarioGenerationResponse(BaseModel):
    script_json: ScenarioScript
    rubric_json: ScenarioRubric

async def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state."""
    from app.main import model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

@router.post("/generate", response_model=ScenarioGenerationResponse)
async def generate_scenario(
    request: ScenarioGenerationRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Generate a conversation scenario based on description."""
    try:
        # Generate scenario script
        script = generate_scenario_script(
            request.text, 
            request.difficulty, 
            request.tags,
            request.target_age
        )
        
        # Generate rubric
        rubric = generate_scenario_rubric(request.difficulty, request.tags)
        
        return ScenarioGenerationResponse(
            script_json=script,
            rubric_json=rubric
        )
        
    except Exception as e:
        logger.error(f"Scenario generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Scenario generation failed: {str(e)}")

def generate_scenario_script(
    description: str, 
    difficulty: int, 
    tags: List[str],
    target_age: Optional[int] = None
) -> ScenarioScript:
    """Generate scenario script based on description."""
    
    # TODO: In production, this would use a language model like GPT-4
    # For now, we'll use template-based generation
    
    # Determine scenario type from tags and description
    scenario_type = determine_scenario_type(description, tags)
    
    # Generate title
    title = generate_title(description, scenario_type)
    
    # Generate conversation steps
    steps = generate_conversation_steps(description, difficulty, scenario_type, target_age)
    
    return ScenarioScript(
        title=title,
        description=description,
        difficulty=difficulty,
        tags=tags,
        steps=steps
    )

def generate_scenario_rubric(difficulty: int, tags: List[str]) -> ScenarioRubric:
    """Generate scoring rubric based on difficulty and tags."""
    
    # Define rubric levels based on difficulty
    levels = {}
    
    for level in range(1, 6):  # Levels 1-5
        # Adjust thresholds based on difficulty
        base_threshold = 0.3 + (level - 1) * 0.1
        difficulty_adjustment = (difficulty - 1) * 0.05
        
        levels[str(level)] = RubricLevel(
            eye_contact={
                "weight": 0.25,
                "threshold": min(0.9, base_threshold + difficulty_adjustment)
            },
            speech_clarity={
                "weight": 0.25,
                "threshold": min(0.9, base_threshold + difficulty_adjustment)
            },
            engagement={
                "weight": 0.25,
                "threshold": min(0.9, base_threshold + difficulty_adjustment)
            },
            turn_taking={
                "weight": 0.25,
                "threshold": min(0.9, base_threshold + difficulty_adjustment)
            }
        )
    
    # Generate feedback messages
    feedback = {
        "positive": [
            "Great job maintaining eye contact!",
            "Your speech was very clear!",
            "I can see you're really engaged in our conversation!",
            "Excellent turn-taking!",
            "You're doing wonderfully!",
            "I love how you're participating!",
            "Your responses show great understanding!"
        ],
        "improvement": [
            "Try to look at me a bit more during our conversation",
            "Take your time and speak clearly",
            "Show me you're interested by asking questions too",
            "Remember to wait for me to finish before responding",
            "Let's practice speaking a little louder",
            "Try to give more detailed responses",
            "Great effort! Let's keep practicing together"
        ]
    }
    
    # Customize feedback based on tags
    if "eye_contact" in tags:
        feedback["positive"].extend([
            "Amazing eye contact! You're looking right at me!",
            "I can tell you're really focused on our conversation!"
        ])
        feedback["improvement"].extend([
            "Remember to look at my face while we talk",
            "Try to look at me when you're speaking"
        ])
    
    if "turn_taking" in tags:
        feedback["positive"].extend([
            "Perfect timing! You waited for me to finish!",
            "Great job taking turns in our conversation!"
        ])
        feedback["improvement"].extend([
            "Let's practice waiting for each other to finish talking",
            "Remember: listen, then respond"
        ])
    
    return ScenarioRubric(levels=levels, feedback=feedback)

def determine_scenario_type(description: str, tags: List[str]) -> str:
    """Determine scenario type from description and tags."""
    description_lower = description.lower()
    
    if any(tag in ["greeting", "introduction"] for tag in tags):
        return "greeting"
    elif any(tag in ["storytelling", "narrative"] for tag in tags):
        return "storytelling"
    elif any(tag in ["question_answer", "interview"] for tag in tags):
        return "question_answer"
    elif "friend" in description_lower or "playground" in description_lower:
        return "social_interaction"
    elif "help" in description_lower or "request" in description_lower:
        return "help_request"
    elif "emotion" in description_lower or "feeling" in description_lower:
        return "emotion_sharing"
    else:
        return "general_conversation"

def generate_title(description: str, scenario_type: str) -> str:
    """Generate an appropriate title for the scenario."""
    
    title_templates = {
        "greeting": [
            "Meeting a New Friend",
            "Saying Hello",
            "First Introductions"
        ],
        "storytelling": [
            "Sharing Your Story",
            "Tell Me About...",
            "Story Time Together"
        ],
        "question_answer": [
            "Questions and Answers",
            "Getting to Know You",
            "Conversation Practice"
        ],
        "social_interaction": [
            "Playing Together",
            "Making Friends",
            "Social Time"
        ],
        "help_request": [
            "Asking for Help",
            "When You Need Something",
            "Communication Practice"
        ],
        "emotion_sharing": [
            "Sharing Feelings",
            "How Are You Feeling?",
            "Emotion Talk"
        ],
        "general_conversation": [
            "Conversation Practice",
            "Let's Talk Together",
            "Practice Chat"
        ]
    }
    
    templates = title_templates.get(scenario_type, title_templates["general_conversation"])
    
    # For now, just use the first template
    # In production, could use AI to generate more contextual titles
    return templates[0]

def generate_conversation_steps(
    description: str, 
    difficulty: int, 
    scenario_type: str,
    target_age: Optional[int] = None
) -> List[ScenarioStep]:
    """Generate conversation steps based on scenario parameters."""
    
    steps = []
    
    # Start with greeting
    steps.append(ScenarioStep(
        id="greeting",
        type="avatar_speak",
        content=get_greeting_message(scenario_type, target_age),
        hints=["Try saying hello back!", "You can wave or say hi!"]
    ))
    
    # Add main conversation steps based on difficulty
    if difficulty == 1:
        steps.extend(generate_basic_steps(description, scenario_type))
    elif difficulty == 2:
        steps.extend(generate_intermediate_steps(description, scenario_type))
    elif difficulty >= 3:
        steps.extend(generate_advanced_steps(description, scenario_type))
    
    # End with conclusion
    steps.append(ScenarioStep(
        id="conclusion",
        type="avatar_speak",
        content="Thank you for practicing with me! You did a great job in our conversation.",
        hints=[]
    ))
    
    return steps

def get_greeting_message(scenario_type: str, target_age: Optional[int] = None) -> str:
    """Get appropriate greeting message."""
    
    greetings = {
        "greeting": "Hi there! I'm excited to meet you today!",
        "storytelling": "Hello! I can't wait to hear your story!",
        "question_answer": "Hi! I have some fun questions for us to talk about!",
        "social_interaction": "Hey! Want to chat and have some fun together?",
        "help_request": "Hi! Let's practice asking for help when we need it!",
        "emotion_sharing": "Hello! How are you feeling today?",
        "general_conversation": "Hi there! I'm excited to practice conversation with you today!"
    }
    
    return greetings.get(scenario_type, greetings["general_conversation"])

def generate_basic_steps(description: str, scenario_type: str) -> List[ScenarioStep]:
    """Generate basic conversation steps (difficulty 1)."""
    
    steps = [
        ScenarioStep(
            id="main_topic",
            type="avatar_ask",
            content="What's your favorite thing to do?",
            expected_response="hobby_response",
            hints=["Think about something you really enjoy!", "Maybe a game, sport, or activity?"]
        ),
        ScenarioStep(
            id="follow_up",
            type="avatar_respond",
            content="That sounds really fun! Can you tell me more about it?",
            expected_response="elaboration",
            hints=["Try to add more details!", "What do you like most about it?"]
        )
    ]
    
    return steps

def generate_intermediate_steps(description: str, scenario_type: str) -> List[ScenarioStep]:
    """Generate intermediate conversation steps (difficulty 2)."""
    
    steps = [
        ScenarioStep(
            id="main_topic",
            type="avatar_ask",
            content="Tell me about something interesting that happened to you recently.",
            expected_response="story_response",
            hints=["Think about your day or week", "What was exciting or different?"]
        ),
        ScenarioStep(
            id="clarification",
            type="avatar_ask", 
            content="That's interesting! How did that make you feel?",
            expected_response="emotion_response",
            hints=["Were you happy, excited, surprised?", "It's okay to share your feelings!"]
        ),
        ScenarioStep(
            id="connection",
            type="avatar_respond",
            content="I can understand that feeling! Have you experienced something like that before?",
            expected_response="comparison_response",
            hints=["Think about similar experiences", "You can say yes or no and explain"]
        )
    ]
    
    return steps

def generate_advanced_steps(description: str, scenario_type: str) -> List[ScenarioStep]:
    """Generate advanced conversation steps (difficulty 3+)."""
    
    steps = [
        ScenarioStep(
            id="complex_topic",
            type="avatar_ask",
            content="If you could solve one problem in the world, what would it be and why?",
            expected_response="opinion_response",
            hints=["Think about things that bother you", "What would make the world better?"]
        ),
        ScenarioStep(
            id="reasoning",
            type="avatar_ask",
            content="That's a thoughtful choice! How do you think we could start working on that?",
            expected_response="solution_response", 
            hints=["What steps could people take?", "How might you contribute?"]
        ),
        ScenarioStep(
            id="perspective",
            type="avatar_ask",
            content="What do you think other people might say about this topic?",
            expected_response="perspective_response",
            hints=["Consider different viewpoints", "Not everyone thinks the same way"]
        ),
        ScenarioStep(
            id="reflection",
            type="avatar_respond",
            content="You've shared some really interesting thoughts! What did you learn from our conversation?",
            expected_response="reflection_response",
            hints=["What was new or surprising?", "How do you feel about our discussion?"]
        )
    ]
    
    return steps