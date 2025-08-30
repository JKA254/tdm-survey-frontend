// Alternative API URL configuration for reverse proxy
const API_URL_ALTERNATIVES = [
    'https://tdmbackup.synology.me:8080/api',  // Direct HTTPS
    'https://tdmbackup.synology.me/api/node',   // Reverse proxy
    'https://tdmbackup.synology.me/node/api',   // Alternative proxy path
    'http://192.168.1.147:8080/api'             // HTTP fallback (will be blocked)
];

// Test each URL and use the first working one
async function findWorkingAPI() {
    for (const url of API_URL_ALTERNATIVES) {
        try {
            console.log('Testing API URL:', url);
            const response = await fetch(`${url}/land_parcels`, { 
                mode: 'cors',
                method: 'HEAD' // Just test connectivity
            });
            
            if (response.ok) {
                console.log('✅ Working API URL found:', url);
                return url;
            }
        } catch (error) {
            console.log('❌ Failed:', url, error.message);
        }
    }
    
    console.error('❌ No working API URL found');
    return null;
}

// Usage example:
// const workingAPI = await findWorkingAPI();
// if (workingAPI) {
//     const API_URL = workingAPI;
// }
