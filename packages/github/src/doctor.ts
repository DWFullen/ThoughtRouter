import { loadEnv } from '@thoughtrouter/config';

const env = loadEnv();

const lines: string[] = [];
if (!env.GITHUB_TOKEN) {
  lines.push('❌ Missing GITHUB_TOKEN');
} else {
  lines.push('✅ GITHUB_TOKEN present');
}
if (!env.GITHUB_OWNER) lines.push('❌ Missing GITHUB_OWNER');
if (!env.GITHUB_PROJECT_NUMBER) lines.push('❌ Missing GITHUB_PROJECT_NUMBER');
if (!env.GITHUB_REPOSITORY) lines.push('❌ Missing GITHUB_REPOSITORY');

if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_PROJECT_NUMBER) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ['Bearer', env.GITHUB_TOKEN].join(' ') },
    body: JSON.stringify({
      query: 'query { viewer { login } }'
    })
  });
  if (response.ok) lines.push('✅ GitHub GraphQL reachable with provided token');
  else lines.push('❌ GitHub GraphQL request failed');
}

console.log(lines.join('\n'));
