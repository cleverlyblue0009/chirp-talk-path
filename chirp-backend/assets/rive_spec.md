# Chirp Rive Animation Specification

> **Critical Note**: This document specifies the exact requirements for Rive assets that must be created by designers using Rive Editor. The backend cannot programmatically create these files - they must be manually authored and exported from Rive.

## 🎯 Overview

The Chirp companion character requires sophisticated animations for:
- **Lip-sync Speech** - Viseme-based mouth animations synchronized with TTS
- **Emotional States** - Mood-based character expressions  
- **Interactive Gestures** - Responsive animations for user engagement
- **Reward Celebrations** - Achievement and milestone animations

## 📋 Asset Requirements Checklist

### ✅ File Structure
- [ ] **File Name**: `chirp_bird.riv`
- [ ] **Artboard Name**: `ChirpBird` (exact spelling)
- [ ] **State Machine Name**: `Chirp_Bird_SM` (exact spelling)
- [ ] **File Size**: < 2MB for web performance
- [ ] **Frame Rate**: 60 FPS for smooth animation

### ✅ State Machine Inputs (Exact Names Required)

#### Mood Control
```javascript
// Input Name: "mood"
// Type: String/Enum
// Values: "idle" | "cheer" | "think" | "demo" | "celebrate"
// Default: "idle"
```

#### Viseme Animation
```javascript
// Input Name: "viseme_index" 
// Type: Number
// Range: 0-6 (maps to 7 viseme types)
// Default: 0 (REST/neutral mouth)
```

#### Interaction Triggers
```javascript
// Input Name: "blink"
// Type: Trigger
// Usage: Friendly acknowledgment

// Input Name: "hop"  
// Type: Trigger
// Usage: Excitement/attention

// Input Name: "wing_flap"
// Type: Trigger  
// Usage: Emphasis/celebration
```

## 🎭 Required Animations

### 1. Base Loop Animations

#### `idle_breathe`
- **Duration**: 2-3 seconds (looping)
- **Motion**: Subtle chest/body breathing
- **Easing**: Smooth ease-in-out
- **Purpose**: Default state when not speaking

#### `mood_idle` 
- **Expression**: Calm, attentive
- **Eyes**: Gentle, focused forward
- **Posture**: Upright, welcoming

### 2. Mood State Animations

#### `mood_cheer`
- **Expression**: Excited, encouraging  
- **Eyes**: Bright, wide with sparkle
- **Body**: Slightly bouncy, energetic posture
- **Wings**: Occasional flutter
- **Transition**: Smooth from any other mood

#### `mood_think`
- **Expression**: Thoughtful, processing
- **Eyes**: Slightly narrowed, focused
- **Head**: Slight tilt to side
- **Body**: Still, contemplative posture

#### `mood_demo`
- **Expression**: Teaching, demonstrative
- **Eyes**: Direct, engaging
- **Body**: Forward-leaning, instructional
- **Wings**: Gesturing motions

#### `mood_celebrate`
- **Expression**: Joyful, triumphant
- **Eyes**: Sparkling, delighted
- **Body**: Bouncing, victory pose
- **Wings**: Spread wide, flapping
- **Particles**: Confetti/sparkles (if supported)

### 3. Viseme Mouth Shapes (Critical for Lip-Sync)

> **Implementation Note**: These must be precisely timed with TTS audio. The backend sends `viseme_index` values that correspond to these mouth shapes.

#### Index 0: `speak_viseme_rest`
- **Phonemes**: Silence, pauses
- **Mouth**: Neutral, slightly closed
- **Usage**: Between words, at sentence end

#### Index 1: `speak_viseme_aa`
- **Phonemes**: AA, AE, AH (cat, bat, father)
- **Mouth**: Wide open, tongue low
- **Shape**: Oval opening

#### Index 2: `speak_viseme_ee`  
- **Phonemes**: EE, IH (see, sit)
- **Mouth**: Horizontal stretch, slight opening
- **Shape**: Wide, narrow opening

#### Index 3: `speak_viseme_oh`
- **Phonemes**: OH, OW, UH, UW (go, how, book, too)
- **Mouth**: Round, pursed lips
- **Shape**: Circular opening

#### Index 4: `speak_viseme_m`
- **Phonemes**: M, P, B (mom, pop, bob)
- **Mouth**: Closed, lips together
- **Shape**: Sealed lips

#### Index 5: `speak_viseme_fv`
- **Phonemes**: F, V (fun, very)
- **Mouth**: Lower lip touches upper teeth
- **Shape**: Lip-teeth contact

#### Index 6: `speak_viseme_dd`
- **Phonemes**: D, T, L, N, S, Z (dog, top, love, nice, see, zoo)
- **Mouth**: Tongue visible, teeth apart
- **Shape**: Tongue-teeth position

### 4. Interactive Gestures

#### `wink`
- **Duration**: 0.5 seconds
- **Motion**: One eye closes and opens
- **Timing**: Quick, playful
- **Return**: Back to current mood state

#### `nod`
- **Duration**: 1 second  
- **Motion**: Head up-down motion (2-3 nods)
- **Usage**: Agreement, encouragement
- **Amplitude**: Gentle, not exaggerated

#### `celebrate_confetti`
- **Duration**: 2-3 seconds
- **Motion**: Full-body celebration
- **Effects**: Particle system (confetti, stars, sparkles)
- **Wings**: Spread wide, multiple flaps
- **Body**: Jumping or bouncing motion

## 🎨 Art Direction

### Character Design Requirements

#### Base Character
- **Species**: Friendly cartoon bird
- **Size**: Suitable for 200x200px minimum display
- **Style**: Clean vector art, child-friendly
- **Colors**: Bright, appealing palette
- **Personality**: Encouraging, supportive, gentle

#### Recommended Color Palette
```css
Primary: #4A90E2 (Friendly blue)
Secondary: #F5A623 (Warm orange)
Accent: #7ED321 (Success green)
Neutral: #9B9B9B (Soft gray)
Highlight: #FFD700 (Gold for rewards)
```

#### Character Features
- **Eyes**: Large, expressive, with shine/highlight
- **Beak**: Small, non-threatening, good for mouth shapes
- **Wings**: Visible, usable for gestures
- **Body**: Round, approachable, stable base
- **Feathers**: Simple texture, not overly detailed

### Unlockable Accessories (Optional Enhancement)

#### Hats
- Baseball cap (casual)
- Graduation cap (achievement)
- Party hat (celebration)
- Winter hat (seasonal)

#### Glasses
- Regular glasses (studious)
- Sunglasses (cool)
- Reading glasses (wise)

#### Props
- Microphone (speaking practice)
- Books (learning)
- Musical notes (rhythm/prosody)
- Trophy (achievements)

## 🔧 Technical Specifications

### Performance Requirements
- **File Size**: Maximum 2MB
- **Texture Resolution**: 512x512px maximum per texture
- **Bone Count**: < 50 bones for mobile performance
- **Animation Complexity**: Optimize for 60fps on mobile devices

### State Machine Logic

```
State Machine: Chirp_Bird_SM

Default State: IDLE
├── mood == "idle" → idle_breathe (loop)
├── mood == "cheer" → mood_cheer + idle_breathe
├── mood == "think" → mood_think + idle_breathe  
├── mood == "demo" → mood_demo + idle_breathe
└── mood == "celebrate" → mood_celebrate

Viseme Layer (Always Active):
├── viseme_index == 0 → speak_viseme_rest
├── viseme_index == 1 → speak_viseme_aa
├── viseme_index == 2 → speak_viseme_ee
├── viseme_index == 3 → speak_viseme_oh
├── viseme_index == 4 → speak_viseme_m
├── viseme_index == 5 → speak_viseme_fv
└── viseme_index == 6 → speak_viseme_dd

Trigger Animations:
├── blink → wink (0.5s) → return to current state
├── hop → hop_gesture (1s) → return to current state  
└── wing_flap → wing_flap_gesture (1s) → return to current state
```

### Export Settings
- **Format**: .riv (Rive runtime format)
- **Compression**: Enabled for web delivery
- **Textures**: Compressed, web-optimized
- **Animations**: Optimized curves, minimal keyframes

## 🔗 Backend Integration

### How the Backend Controls the Character

```javascript
// Backend sends this data via Socket.IO
{
  "cue": "speak",
  "text": "Hi! What's your name?", 
  "mood": "cheer",
  "ttsAudioUrl": "https://storage/audio.mp3",
  "visemeTimeline": [
    { "time": 0.0, "viseme": "REST" },
    { "time": 0.1, "viseme": "M" },     // "Hi"
    { "time": 0.2, "viseme": "AA" },    
    { "time": 0.5, "viseme": "REST" },  // pause
    { "time": 0.7, "viseme": "OH" },    // "What's"
    { "time": 0.9, "viseme": "AA" },
    { "time": 1.1, "viseme": "DD" },
    { "time": 1.3, "viseme": "REST" }   // end
  ]
}
```

### Frontend Implementation Responsibility

The frontend must:
1. Load the Rive file and get input references
2. Set `mood` input when cue received
3. Play TTS audio when `ttsAudioUrl` provided
4. Animate `viseme_index` according to `visemeTimeline`
5. Fire trigger inputs for special animations

## ✅ Testing Checklist

### Animation Testing
- [ ] All mood states transition smoothly
- [ ] Viseme mouth shapes are distinct and clear
- [ ] Idle breathing loops seamlessly
- [ ] Trigger animations return to previous state
- [ ] No animation conflicts or glitches

### Performance Testing  
- [ ] Runs at 60fps on target devices
- [ ] File loads quickly (< 3 seconds on 3G)
- [ ] Memory usage stays under 50MB
- [ ] No dropped frames during transitions

### Integration Testing
- [ ] State machine inputs respond correctly
- [ ] Viseme timing matches TTS audio
- [ ] Mood changes reflect immediately
- [ ] Triggers fire without interrupting speech

## 📦 Delivery Requirements

### File Delivery
1. **Main Asset**: `chirp_bird.riv` 
2. **Source File**: `chirp_bird.rev` (Rive Editor source)
3. **Preview Video**: 30-second demo showing all animations
4. **Documentation**: Any custom implementation notes

### Quality Assurance
- [ ] All required inputs implemented and named correctly
- [ ] All animations smooth and bug-free
- [ ] File size under 2MB
- [ ] Compatible with Rive Runtime 4.0+
- [ ] Tested on web and mobile platforms

### Handoff Process
1. Designer creates assets in Rive Editor
2. Export .riv file with correct naming
3. Test integration with provided frontend code
4. Deliver final assets with documentation
5. Support frontend team during integration

## 🚨 Critical Notes

### Must-Have Features
- **Exact naming** of state machine and inputs (case-sensitive)
- **7 distinct viseme mouth shapes** for clear lip-sync
- **Smooth mood transitions** without animation interruption
- **Performance optimization** for mobile devices

### Nice-to-Have Features
- Particle effects for celebrations
- Seasonal costume variations
- Interactive eye tracking
- Breathing animation variations

### Common Pitfalls to Avoid
- ❌ Incorrect input names (breaks backend integration)
- ❌ Visemes too similar (poor lip-sync quality)
- ❌ File too large (slow loading, poor UX)
- ❌ Animations too fast/slow (doesn't match speech)
- ❌ State conflicts (animations fighting each other)

---

## 🎬 Example Implementation

For reference, here's how the frontend will use the Rive asset:

```javascript
// Initialize Rive
const rive = new Rive({
  src: '/assets/chirp_bird.riv',
  artboard: 'ChirpBird',
  stateMachines: 'Chirp_Bird_SM',
  autoplay: true,
  onLoad: () => {
    // Get inputs (names must match exactly)
    moodInput = rive.getInput('mood');
    visemeInput = rive.getInput('viseme_index');  
    blinkTrigger = rive.getInput('blink');
    hopTrigger = rive.getInput('hop');
    wingFlapTrigger = rive.getInput('wing_flap');
  }
});

// Handle backend cues
socket.on('session:cue:avatar', (data) => {
  // Set mood
  moodInput.value = data.mood || 'idle';
  
  // Play audio and animate visemes
  if (data.ttsAudioUrl && data.visemeTimeline) {
    playTTSWithVisemes(data.ttsAudioUrl, data.visemeTimeline);
  }
  
  // Trigger special animations
  if (data.cue === 'wink') blinkTrigger.fire();
  if (data.cue === 'celebrate') {
    moodInput.value = 'celebrate';
    wingFlapTrigger.fire();
  }
});

function playTTSWithVisemes(audioUrl, timeline) {
  const audio = new Audio(audioUrl);
  const startTime = Date.now();
  
  audio.play();
  
  // Map viseme names to indices
  const visemeMap = {
    'REST': 0, 'AA': 1, 'EE': 2, 'OH': 3,
    'M': 4, 'FV': 5, 'DD': 6
  };
  
  // Schedule viseme changes
  timeline.forEach(frame => {
    setTimeout(() => {
      const index = visemeMap[frame.viseme] || 0;
      visemeInput.value = index;
    }, frame.time * 1000);
  });
}
```

This specification ensures seamless integration between the Rive animations and the Chirp backend's real-time communication system.