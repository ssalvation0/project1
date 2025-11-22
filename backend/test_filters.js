const axios = require('axios');

async function checkFilters() {
    try {
        const res = await axios.get('http://localhost:5001/api/transmogs/filters');
        console.log('Filters Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkFilters();
