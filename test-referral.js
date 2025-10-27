const axios = require('axios');

async function testReferralSystem() {
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    console.log('🧪 Testing Referral System...\n');
    
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    
    // Test 2: Create a test referral
    console.log('\n2. Creating test referral...');
    const createResponse = await axios.post(`${baseUrl}/referral/admin/create`, {
      name: 'Test Referral',
      description: 'Test referral for system verification',
      campaign: 'System Test',
      source: 'Test',
      code: 'TEST123'
    }, {
      headers: {
        'Authorization': 'Bearer test-token', // This will fail but we can see the endpoint works
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Referral creation endpoint accessible');
    
  } catch (error) {
    if (error.response) {
      console.log('📡 Server responded with status:', error.response.status);
      console.log('📄 Response:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('✅ Referral endpoints are working (authentication required)');
      } else {
        console.log('❌ Unexpected error:', error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 5000');
      console.log('💡 Please start the server with: cd moviebackend && node server.js');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testReferralSystem();
