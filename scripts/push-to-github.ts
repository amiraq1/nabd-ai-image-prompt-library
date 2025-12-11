// Script to push project to GitHub
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Files and directories to ignore
const ignoreList = [
  'node_modules',
  '.git',
  '.replit',
  '.cache',
  '.config',
  '.local',
  'dist',
  '.upm',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'attached_assets',
  'package-lock.json',
];

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  return parts.some(part => ignoreList.includes(part));
}

function getAllFiles(dirPath: string, basePath: string = ''): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    
    if (shouldIgnore(relativePath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else if (stat.isFile()) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.push({ path: relativePath, content });
      } catch (e) {
        // Skip binary files
        console.log(`Skipping binary file: ${relativePath}`);
      }
    }
  }
  
  return files;
}

async function main() {
  const repoName = 'nabd-ai-image-prompt-library';
  const description = 'نبض - مكتبة عربية لتوليد صور AI باستخدام البرومبتات الإبداعية';
  
  console.log('Getting GitHub client...');
  const octokit = await getGitHubClient();
  
  console.log('Getting authenticated user...');
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  console.log(`Authenticated as: ${owner}`);
  
  // Check if repo exists, create if not
  let repo;
  try {
    console.log(`Checking if repo ${repoName} exists...`);
    const { data } = await octokit.repos.get({ owner, repo: repoName });
    repo = data;
    console.log(`Repo exists: ${repo.html_url}`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log('Repo not found, creating new repo...');
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: false,
        auto_init: true,
      });
      repo = data;
      console.log(`Created new repo: ${repo.html_url}`);
      // Wait a moment for repo to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      throw error;
    }
  }
  
  // Get all files
  console.log('Collecting files...');
  const projectPath = process.cwd();
  const files = getAllFiles(projectPath);
  console.log(`Found ${files.length} files to upload`);
  
  // Get current commit SHA
  let treeSha: string;
  let parentSha: string | undefined;
  
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
    });
    parentSha = ref.object.sha;
    
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: parentSha,
    });
    treeSha = commit.tree.sha;
  } catch (e) {
    console.log('No existing commits, starting fresh...');
    treeSha = '';
  }
  
  // Create blobs for all files
  console.log('Creating file blobs...');
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  
  for (const file of files) {
    try {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoName,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      console.log(`  Created blob for: ${file.path}`);
    } catch (e: any) {
      console.log(`  Failed to create blob for ${file.path}: ${e.message}`);
    }
  }
  
  // Create tree
  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    tree: treeItems,
    base_tree: treeSha || undefined,
  });
  
  // Create commit
  console.log('Creating commit...');
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: 'Update: نبض - AI Image Prompt Library with security and SEO improvements',
    tree: tree.sha,
    parents: parentSha ? [parentSha] : [],
  });
  
  // Update reference
  console.log('Updating reference...');
  try {
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
      sha: newCommit.sha,
    });
  } catch (e) {
    // If ref doesn't exist, create it
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: 'refs/heads/main',
      sha: newCommit.sha,
    });
  }
  
  console.log('\n✅ Successfully pushed to GitHub!');
  console.log(`📁 Repository: ${repo.html_url}`);
}

main().catch(console.error);
