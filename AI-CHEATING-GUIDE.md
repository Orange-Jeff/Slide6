# Diamond Slide 5 - AI Cheating Guide 🤖

## Overview
This guide explains how to use the advanced AI features to analyze game positions and get optimal move suggestions for Diamond Slide 5.

## New Features Added (Version 12.17)

### 1. **Save Game** 💾
- **Button**: "Save" (Player 1 controls)
- **Function**: Downloads complete game state as JSON file
- **Hidden Feature**: Includes comprehensive AI instructions in the JSON
- **Backup**: Also saves to browser localStorage

### 2. **Load Game** 📂
- **Button**: "Load" (Player 1 controls)
- **Function**: Upload and resume any saved game
- **Use Case**: Perfect for long games that span days/weeks/months
- **Compatibility**: Works with any valid Diamond Slide 5 save file

### 3. **AI Analysis Export** 🧠
- **Button**: "AI Analysis" (Player 2 controls)
- **Function**: Exports current position for external AI analysis
- **Features**:
  - Downloads JSON file with timestamp
  - Copies data to clipboard for easy CLI usage
  - Includes complete AI instructions and game rules

## The Hidden AI Instructions 🕵️

Every saved game contains a hidden `_ai_instructions` object with:

```json
{
  "_ai_instructions": {
    "game_type": "Diamond Slide 5",
    "board_layout": "6x6 grid rotated 45 degrees to form diamond shape",
    "drop_mechanics": {
      "selectors_0_to_5": "Drop from TOP into columns 0-5 (gravity down)",
      "selectors_6_to_11": "Drop from LEFT into rows 0-5 (slide right)"
    },
    "win_conditions": {
      "connect_n": "Check CONNECT_N value for required pieces in a row",
      "critical_positions": {
        "center_column": 2,
        "center_row": 2,
        "diamond_spine": "Column 2 is the diamond's central axis"
      }
    },
    "strategy_priorities": [
      "1. Win immediately if possible",
      "2. Block opponent wins",
      "3. Control center positions [2,2], [2,3], [3,2], [3,3]",
      "4. Avoid setting up opponent for easy wins",
      "5. Build multiple threat lines"
    ],
    "player_info": {
      "you_are": "blue (player 2)",
      "opponent_is": "orange (player 1)"
    }
  }
}
```

## AI Cheating Methods 🎯

### Method 1: Simple CLI Analysis
1. Click "AI Analysis" button during your turn
2. Run the provided Python script:
   ```bash
   python ai-cli-example.py diamond-slide-ai-analysis-1234567890.json
   ```
3. Get optimal move recommendation
4. Make that move in the browser

### Method 2: Google CLI Integration
```bash
# Copy game state to clipboard (done automatically)
# Then use Google's AI tools:
gcloud ai analyze-board-game --input=game-state.json --game-type=connect4-variant

# Or with Gemini CLI (if available):
gemini analyze-game-state --input=game-state.json --output=best-move.json
```

### Method 3: Web-based AI (No CLI needed)
1. Click "AI Analysis" - JSON is copied to clipboard
2. Go to Google Gemini/ChatGPT/Claude
3. Paste this prompt:
   ```
   Analyze this Diamond Slide 5 game and suggest the best move for the blue player.
   The game uses a 6x6 rotated diamond grid. Selectors 0-5 drop pieces from top into columns.
   Selectors 6-11 drop pieces from left into rows. Here's the game state:

   [PASTE JSON HERE]

   Return the optimal selector number (0-11) and explain your reasoning.
   ```

### Method 4: Advanced Proxy Cheating
- Set up a local proxy server
- Intercept game state JSON from network requests
- Run advanced AI analysis (minimax, MCTS, neural networks)
- Modify outgoing moves automatically

## Example Workflow 🔄

### Playing Against Human Online:
1. **Your Turn Arrives** → Click "AI Analysis"
2. **File Downloads** → Run `ai-analysis.bat diamond-slide-ai-analysis-*.json`
3. **Get Recommendation** → "Use Selector: 7 (Confidence: 87.3%)"
4. **Make Move** → Click selector 7 in the game
5. **Repeat** → Export again on your next turn

### Long-term Game Management:
1. **Save Game** → Click "Save" button anytime
2. **Resume Later** → Click "Load" and select your save file
3. **Multiple Games** → Save different games with descriptive names
4. **Analysis History** → Keep AI analysis files for learning

## Files Included 📁

- **`ai-cli-example.py`** - Python script for analyzing game positions
- **`ai-analysis.bat`** - Windows batch script for easy CLI usage
- **`AI-CHEATING-GUIDE.md`** - This guide

## Advanced Features 🚀

### The Python AI Script Provides:
- **Visual board display** with emojis
- **Move evaluation** with scoring system
- **Threat detection** for building multiple winning lines
- **Center control** strategy (diamond-specific)
- **Win/block detection** for immediate tactical moves
- **Confidence ratings** for each recommendation

### Sample Output:
```
🎮 Diamond Slide 5 - AI Analysis Tool
==================================================
🎯 Analyzing position for blue player
📋 Connect 4 to win
🎲 Turn #15

📊 Current Board State:
   0 1 2 3 4 5
0: · · 🟠 🔵 · ·
1: · 🟠 🔵 🟠 🔵 ·
2: 🟠 🔵 🟠 🔵 🟠 🔵
3: · 🔵 🟠 🔵 🟠 ·
4: · · 🟠 🔵 · ·
5: · · · · · ·

🤖 AI Analysis in progress...
   Selector 2: Score 1000 - WINNING MOVE!
   Selector 7: Score 500 - Blocks opponent win
   Selector 3: Score 180 - Controls diamond center; Creates 2 threats

✅ Best Move: Selector 2
   Score: 1000
   Reason: WINNING MOVE!
   Position: (5, 2)

==================================================
🎯 RECOMMENDATION:
   Use Selector: 2
   Confidence: 100.0%
   Strategy: WINNING MOVE!

CLI_OUTPUT: 2
```

## Ethical Considerations ⚖️

This system is designed for:
- **Learning** - Understanding optimal Diamond Slide 5 strategy
- **Practice** - Improving your own gameplay
- **Analysis** - Studying interesting positions
- **Fun** - Experimenting with AI integration

Use responsibly and consider the enjoyment of other players! 🎮

## Technical Notes 🔧

- **Save files** are standard JSON and work across different browsers
- **AI instructions** are hidden from normal gameplay but accessible to scripts
- **Game state** includes everything needed to resume: board, turn, scores, etc.
- **CLI integration** works with any programming language that can parse JSON
- **Infinite games** - No time limits, perfect for correspondence-style play

Happy cheating! 😈🤖
