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
  const model = client.getGenerativeModel({ model: 'gemini-2.5-pro' });

  const itemList = (set.items || []).map(i => i.name).filter(Boolean).join(', ') || 'Unknown';
  const classes = (set.classes || ['All']).join(', ');

  const prompt = `You are writing a detailed, accurate World of Warcraft transmog farming guide for TransmogVault. The guide must be self-contained — players should not need to visit Wowhead or any other site after reading it. Be specific: name exact bosses, exact currencies, exact lockout types, exact token-sharing classes. No intro sentence, no outro, no hype words (stunning, iconic, etc.). Start directly with the first section header.

Set: "${set.name}"
Expansion: ${set.expansion}
Quality: ${set.quality}
Classes: ${classes}
Items: ${itemList}

Output EXACTLY these three sections with EXACTLY these headers, nothing before or after:

### How to Obtain
State the exact source: raid name and tier, dungeon name, PvP vendor, world drop zone, or crafting profession. For raid/dungeon sets: list each main slot (Head, Shoulder, Chest, Legs, Hands, Feet, Waist, Wrist) and the specific boss or location it drops from, inferred from the item names and the expansion's known loot tables. For PvP sets: vendor location, currency name, and approximate cost per piece. For crafted sets: profession, key reagents, and where patterns are obtained. For world drops: best zone or mob type to farm. 4-6 sentences.

### Farming Logistics
Lockout type: weekly raid lockout / daily dungeon reset / no lockout (be specific). Can it be fully soloed at current max level, or does it require a group? Approximate number of resets/runs to collect all pieces, assuming 15-25% drop chance per piece. If the set uses a tier token system, state exactly which classes share the same token (e.g., "Conqueror token: Paladin, Priest, Warlock"). Note if any pieces drop from a different source than the rest of the set. Note if LFR/Normal/Heroic/Mythic are separate lockouts with separate loot. 4-6 sentences.

### Farming Tips
Practical advice to speed up or simplify the farm. Examples: which difficulty to run for fastest clears, whether to use a boost or group for hard encounters, whether the Wardrobe auto-collects tokens, specific skip routes or shortcuts inside the instance, whether bonus rolls or Great Vault can supplement drops, whether pieces are BoE and available on the Auction House, any known bugs or quirks with this particular farm. 3-5 sentences.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { generateSetGuide };
