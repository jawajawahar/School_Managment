const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const REPO_OWNER = 'jawajawahar';
const REPO_NAME = 'School_Managment';
const OUTPUT_DIR = path.join(__dirname, '../downloads');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`📡 Fetching latest iOS .ipa artifact from GitHub Actions (${REPO_OWNER}/${REPO_NAME})...`);

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
      const ipaArtifact = artifacts.find((a) => a.name === 'GSMS_Teacher_App_IPA');

      if (!ipaArtifact) {
        console.log('⚠️ No IPA artifact found yet. Please wait for GitHub Actions build to complete.');
        return;
      }

      console.log(`✅ Found Latest IPA Artifact: ${ipaArtifact.name} (Created: ${ipaArtifact.created_at})`);
      console.log(`📦 Archive Size: ${(ipaArtifact.size_in_bytes / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`🔗 Download URL: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/runs/${ipaArtifact.workflow_run.id}`);
      console.log(`\n💡 To download directly: Open the URL above or use Sideloadly with the downloaded .ipa file.`);
    } catch (err) {
      console.error('❌ Error parsing response:', err.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request error:', err.message);
});
