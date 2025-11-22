const axios = require('axios');

const REGION = 'eu';
const LOCALE = 'en_GB';
const OAUTH_URL = `https://${REGION}.battle.net/oauth/token`;
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;

let accessToken = null;
let tokenExpiration = 0;

async function getAccessToken() {
    const clientId = process.env.BLIZZARD_CLIENT_ID;
    const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Blizzard API credentials not found in .env');
    }

    // Return cached token if valid
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }

    try {
        console.log('🔑 Authenticating with Blizzard API...');
        const response = await axios.post(OAUTH_URL, null, {
            params: { grant_type: 'client_credentials' },
            auth: {
                username: clientId,
                password: clientSecret
            }
        });

        accessToken = response.data.access_token;
        // Set expiration slightly before actual time (expires_in is in seconds)
        tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;

        console.log('✅ Blizzard API Token received');
        return accessToken;
    } catch (error) {
        console.error('❌ Failed to authenticate with Blizzard:', error.message);
        throw error;
    }
}

async function getBlizzardData(endpoint, params = {}) {
    const token = await getAccessToken();

    try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            params: {
                ...params,
                namespace: `static-${REGION}`,
                locale: LOCALE
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`❌ API Error [${endpoint}]:`, error.message);
        throw error;
    }
}

// Get all item sets index
async function getItemSetsIndex() {
    // Note: Blizzard API has "item-set" endpoint
    return getBlizzardData('/item-set/index');
}

// Get specific item set details
async function getItemSet(id) {
    return getBlizzardData(`/item-set/${id}`);
}

// Get item media (icon)
async function getItemMedia(itemId) {
    try {
        const data = await getBlizzardData(`/media/item/${itemId}`);
        // Find the icon asset
        const iconAsset = data.assets.find(a => a.key === 'icon');
        return iconAsset ? iconAsset.value : null;
    } catch (error) {
        return null;
    }
}

// Get item details (for class/expansion extraction)
async function getItem(itemId) {
    return getBlizzardData(`/item/${itemId}`);
}

// Search/Filter item sets (simulated since API doesn't support complex filtering on index)
// We will fetch the index and then fetch details for a batch, or use a known list
// For optimization, we might need to fetch all sets once and cache them
async function getAllSetsWithDetails() {
    const index = await getItemSetsIndex();
    const sets = index.item_sets;

    // This is heavy, so we should cache this result in memory in the route handler
    // For now, let's just return the index and let the route handler manage details fetching
    return sets;
}

module.exports = {
    getItemSetsIndex,
    getItemSet,
    getItemMedia,
    getItem
};

