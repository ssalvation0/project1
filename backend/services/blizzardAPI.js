const axios = require('axios');

const CLIENT_ID = process.env.BLIZZARD_CLIENT_ID;
const CLIENT_SECRET = process.env.BLIZZARD_CLIENT_SECRET;
const REGION = process.env.BLIZZARD_REGION || 'eu';

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post('https://oauth.battle.net/token', 
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
    
    console.log('✅ New access token obtained');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
};

const apiRequest = async (endpoint) => {
  try {
    const token = await getAccessToken();
    const url = `https://${REGION}.api.blizzard.com${endpoint}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Battlenet-Namespace': `static-${REGION}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('API request error:', error.message);
    throw error;
  }
};

// Експорт функцій
module.exports = {
  getItem: (itemId) => 
    apiRequest(`/data/wow/item/${itemId}?namespace=static-${REGION}&locale=en_US`),
  
  getItemMedia: (itemId) => 
    apiRequest(`/data/wow/media/item/${itemId}?namespace=static-${REGION}&locale=en_US`),
  
  // Item Appearance Sets (працює!)
  getItemAppearanceSet: (setId) =>
    apiRequest(`/data/wow/item-appearance-set/${setId}?namespace=static-${REGION}&locale=en_US`),
    
  getItemAppearanceSetsIndex: () =>
    apiRequest(`/data/wow/item-appearance-set/index?namespace=static-${REGION}&locale=en_US`),
  
  // Item Set (Tier sets)
  getItemSet: (setId) =>
    apiRequest(`/data/wow/item-set/${setId}?namespace=static-${REGION}&locale=en_US`),
    
  getItemSetsIndex: () =>
    apiRequest(`/data/wow/item-set/index?namespace=static-${REGION}&locale=en_US`),
  
  testConnection: async () => {
    try {
      await getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }
};