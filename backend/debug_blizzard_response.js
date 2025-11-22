require('dotenv').config();
const blizzardService = require('./utils/blizzardService');

async function inspectSet() {
    try {
        console.log('🔍 Fetching a sample set...');
        // Fetch a known set ID (e.g., one from the previous logs or a standard tier set)
        // Set 1886 is a recent one, or let's try to find one from the index
        const index = await blizzardService.getItemSetsIndex();
        if (index.item_sets.length > 0) {
            const targetId = index.item_sets[0].id;
            console.log(`Fetching details for set ID: ${targetId}`);
            const details = await blizzardService.getItemSet(targetId);
            console.log(JSON.stringify(details, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectSet();
