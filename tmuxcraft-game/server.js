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
      model: 'claude-3-5-sonnet-20241022',
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

Where the values are the key bindings (like "M-h" for Alt+h, "C-a h" for Ctrl+a then h, etc.)
If a binding is not found, use null.

Here's the tmux config:

${configContent}`,
        },
      ],
    });

    const responseText = message.content[0].text;
    const keybindings = JSON.parse(responseText);

    res.json({ keybindings });
  } catch (error) {
    console.error('Error parsing tmux config:', error);
    res.status(500).json({ error: 'Failed to parse tmux config' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
