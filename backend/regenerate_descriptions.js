require('dotenv').config();
const { query, run } = require('./db');
const path = require('path');
const fs = require('fs');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateAIDescription(filePath) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('⚠️  GEMINI_API_KEY environment variable is not defined in .env');
    return null;
  }
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
    console.error('⚠️  AI API error:', err.message);
    return null;
  }
}

async function generateWithRetry(filePath, retries = 3, delay = 2000) {
  let currentDelay = delay;
  for (let i = 0; i < retries; i++) {
    const desc = await generateAIDescription(filePath);
    if (desc) return desc;
    if (i < retries - 1) {
      console.log(`⏳ Retrying in ${currentDelay / 1000}s... (Attempt ${i + 2}/${retries})`);
      await sleep(currentDelay);
      currentDelay *= 2; // exponential backoff
    }
  }
  return null;
}

async function runRegen() {
  const photos = await query('SELECT * FROM photos WHERE ai_description IS NULL');
  const total = photos.length;
  console.log(`🔍 Found ${total} photos with missing descriptions.`);
  
  if (total === 0) {
    console.log('✨ All photos already have descriptions!');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < total; i++) {
    const p = photos[i];
    const filePath = path.join(__dirname, 'uploads', p.filename);
    console.log(`\n[${i + 1}/${total}] Generating for: ${p.original_name} (${p.filename})...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found at path: ${filePath}`);
      failCount++;
      continue;
    }

    const desc = await generateWithRetry(filePath);
    if (desc) {
      await run('UPDATE photos SET ai_description = ? WHERE id = ?', [desc, p.id]);
      console.log(`✅ Success!`);
      successCount++;
    } else {
      console.log(`❌ Failed to generate description.`);
      failCount++;
    }
  }

  console.log('\n======================================');
  console.log(`🎉 Run completed!`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Failed:  ${failCount}`);
  console.log(`======================================`);
  process.exit(0);
}

runRegen().catch((err) => {
  console.error('Fatal error running description regeneration:', err);
  process.exit(1);
});
