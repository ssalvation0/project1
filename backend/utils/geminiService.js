const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

async function generateSetGuide(set) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const itemList = set.items.map(i => i.name).join(', ');
  const classes = set.classes.join(', ');

  const prompt = `You are writing a factual WoW transmog guide. No intro sentence. No outro. Start directly with the first section header.

Set: "${set.name}"
Expansion: ${set.expansion}
Classes: ${classes}
Pieces: ${itemList}

Output exactly this structure, nothing before or after:

### Overview
Describe the armor color and visual style in 2 sentences. No adjectives like "stunning", "iconic", "legendary", "striking", "hallowed", "prestigious". Just describe what it looks like.

### How to Obtain
Where it drops or how to get it. Raid/dungeon name, boss names, vendor location. One short paragraph.

### Tips
2 bullet points. Practical info only: farming difficulty, notable pieces for mixing, alternatives.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { generateSetGuide };
