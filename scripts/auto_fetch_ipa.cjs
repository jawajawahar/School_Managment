const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'jawajawahar';
const REPO_NAME = 'School_Managment';
const OUTPUT_DIR = path.join(__dirname, '../downloads');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`📡 Checking latest iOS .ipa artifact from GitHub Actions (${REPO_OWNER}/${REPO_NAME})...\n`);

const options = {
  hostname: 'api.github.com',
  path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/artifacts`,
  headers: {
    'User-Agent': 'NodeJS-IPA-AutoFetcher',
    'Accept': 'application/vnd.github.v3+json',
  },
};

https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const artifacts = data.artifacts || [];
      const ipaArtifact = artifacts.find((a) => a.name === 'GSMS_Teacher_App_IPA' || a.name === 'GSMS_Teacher_App_iOS_IPA');

      if (!ipaArtifact) {
        console.log('⏳ GitHub Actions build is still in progress or queued on macOS runner.');
        console.log('👉 Check status at: https://github.com/jawajawahar/School_Managment/actions');
        return;
      }

      console.log(`✅ Found Latest IPA Artifact: ${ipaArtifact.name}`);
      console.log(`📅 Created At: ${ipaArtifact.created_at}`);
      console.log(`📦 Archive Size: ${(ipaArtifact.size_in_bytes / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`🔗 Direct Run Page: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/runs/${ipaArtifact.workflow_run.id}`);
      console.log(`\n🎉 To download: Open the URL above to download GSMS_Teacher_App_IPA.zip for Sideloadly!`);
    } catch (err) {
      console.error('❌ Error parsing response:', err.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request error:', err.message);
});
