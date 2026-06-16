require('dotenv').config();
const { query, run } = require('./db');
const path = require('path');
const fs = require('fs');

async function generateAIDescription(filePath) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const ext    = path.extname(filePath).slice(1).toLowerCase();
    const mime   = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const result = await model.generateContent([
      { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: mime[ext] || 'image/jpeg' } },
      'Describe what you see in this photo in 2–3 concise, vivid sentences. Focus on the main subject, the location feel, and any notable details.',
    ]);
    return result.response.text();
  } catch (err) {
    console.error('⚠️  AI description failed:', err.message);
    return null;
  }
}

async function runRegen() {
  const photos = await query('SELECT * FROM photos WHERE ai_description IS NULL');
  console.log(`Found ${photos.length} photos with missing descriptions.`);
  for (const p of photos) {
    const filePath = path.join(__dirname, 'uploads', p.filename);
    console.log(`Generating for ${p.original_name}...`);
    const desc = await generateAIDescription(filePath);
    if (desc) {
      await run('UPDATE photos SET ai_description = ? WHERE id = ?', [desc, p.id]);
      console.log(`✅ Success for ${p.original_name}!`);
    } else {
      console.log(`❌ Failed for ${p.original_name}.`);
    }
  }
}

runRegen().catch(console.error);
