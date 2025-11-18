import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/parse-tmux-config', async (req, res) => {
  try {
    const { configContent } = req.body;

    if (!configContent) {
      return res.status(400).json({ error: 'No config content provided' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this tmux configuration file and extract the keybindings for pane navigation (select-pane).

I need to know which keys are bound to:
- select-pane -L (left)
- select-pane -D (down)
- select-pane -U (up)
- select-pane -R (right)

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "left": "M-h",
  "down": "M-j",
  "up": "M-k",
  "right": "M-l"
}

Where the values are the key bindings in tmux format:
- M-x = Alt+x (Meta key, labeled "Alt" on keyboard)
- C-x = Ctrl+x (Control key, labeled "Ctrl" on keyboard)
- S-x = Shift+x (Shift key)
- Super-x = Super+x (Windows/Command key)

Examples:
- "bind -n M-h select-pane -L" → use "M-h"
- "bind -n C-Left select-pane -L" → use "C-Left"
- "bind C-a h select-pane -L" → use "C-a h" (prefix then key)

If a binding is not found, use null.

Here's the tmux config:

${configContent}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    console.log('Claude response:', responseText);

    // Try to parse JSON, handling markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    const keybindings = JSON.parse(jsonText);

    res.json({ keybindings });
  } catch (error) {
    console.error('Error parsing tmux config:', error);
    const errorMsg = error.message || 'Failed to parse tmux config';
    res.status(500).json({
      error: errorMsg,
      details: error.status ? `API Error ${error.status}` : 'Parsing error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
