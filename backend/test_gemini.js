require('dotenv').config();

async function test() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not defined in your backend/.env file!');
    process.exit(1);
  }

  console.log('🔑 API Key found:', process.env.GEMINI_API_KEY.slice(0, 10) + '...');

  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  try {
    console.log('🛰️ Sending a raw HTTP POST request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Say hello back in one sentence to verify the API key is active.' }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Connection failed! Status:', response.status);
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log('\n🎉 Connection successful! Gemini responded:');
    console.log('💬', data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
  } catch (err) {
    console.error('\n❌ Network or coding error details:');
    console.error(err.message);
  }
}

test();