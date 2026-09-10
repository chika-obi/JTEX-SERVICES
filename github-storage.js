import crypto from 'crypto';

// In-memory caches for fast serverless responses
const inMemoryCache = {
  config: null,
  configFetchedAt: 0,
  logs: null,
  logsFetchedAt: 0,
  images: new Map() // filename -> { buffer, mimeType, updatedAt }
};

export function getGitHubConfig() {
  const token = (
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_TOKENS ||
    process.env.GH_TOKEN ||
    ''
  ).trim();
  const repoFull = (process.env.GITHUB_REPO || 'chika-obi/JTEX-SERVICES').trim();
  const branch = (process.env.GITHUB_BRANCH || 'main').trim();
  const [owner, repo] = repoFull.split('/');
  const salt = (process.env.PIN_SALT || 'kpanuku_jtex_2026_salt').trim();

  return {
    token,
    owner: owner || 'chika-obi',
    repo: repo || 'JTEX-SERVICES',
    branch,
    salt,
    isConfigured: Boolean(token)
  };
}

export function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(`${salt}:${String(pin || '').trim()}`).digest('hex');
}

export function verifyPin({ enteredPin, storedHash, storedPlain, envOverride, defaultPin = '1965' }) {
  if (!enteredPin) return false;
  const cleanEntered = String(enteredPin).trim();
  const { salt } = getGitHubConfig();

  // 1. Environment variable override takes highest priority if set
  if (envOverride && cleanEntered === String(envOverride).trim()) {
    return true;
  }

  // 2. Salted SHA-256 hash comparison
  if (storedHash) {
    const computed = hashPin(cleanEntered, salt);
    if (computed === storedHash) return true;
  }

  // 3. Plaintext fallback (for existing site-config.json files)
  if (storedPlain && cleanEntered === String(storedPlain).trim()) {
    return true;
  }

  // 4. Default factory PIN fallback if neither is stored
  if (!storedHash && !storedPlain && cleanEntered === String(defaultPin).trim()) {
    return true;
  }

  return false;
}

/**
 * Cache an uploaded image buffer in memory so it can be served immediately
 */
export function cacheUploadedImage(filename, buffer, mimeType) {
  inMemoryCache.images.set(filename, {
    buffer,
    mimeType: mimeType || 'image/jpeg',
    updatedAt: Date.now()
  });
}

/**
 * Retrieve an uploaded image buffer from in-memory cache
 */
export function getCachedUploadedImage(filename) {
  return inMemoryCache.images.get(filename) || null;
}

/**
 * Fetch a raw file from GitHub repository
 */
export async function fetchRawFromGitHub(filePath) {
  const { owner, repo, branch, token } = getGitHubConfig();
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?t=${Date.now()}`;
  const headers = {};
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) return null;

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Atomic multi-file commit to GitHub via Git Data API (Trees & Commits)
 * files: Array of { path: string, content: string | Buffer, isBinary?: boolean }
 */
export async function commitFilesToGitHub({ files, message }) {
  const { token, owner, repo, branch, isConfigured } = getGitHubConfig();

  if (!isConfigured) {
    console.warn('[Storage] GITHUB_TOKEN not configured. Changes saved locally only.');
    return { success: false, reason: 'NO_TOKEN' };
  }

  try {
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'JTEX-Services-App',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    // 1. Get branch head ref
    const refRes = await fetch(`${apiBase}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) {
      const errText = await refRes.text();
      throw new Error(`Failed to get branch ref (${refRes.status}): ${errText}`);
    }
    const refData = await refRes.json();
    const commitSha = refData.object.sha;

    // 2. Get the commit to find base tree
    const commitRes = await fetch(`${apiBase}/git/commits/${commitSha}`, { headers });
    if (!commitRes.ok) {
      const errText = await commitRes.text();
      throw new Error(`Failed to get commit (${commitRes.status}): ${errText}`);
    }
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems = [];
    for (const file of files) {
      let contentPayload;
      let encoding;

      if (file.isBinary || Buffer.isBuffer(file.content)) {
        const buf = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
        contentPayload = buf.toString('base64');
        encoding = 'base64';
      } else {
        contentPayload = typeof file.content === 'string' ? file.content : JSON.stringify(file.content, null, 2);
        encoding = 'utf-8';
      }

      const blobRes = await fetch(`${apiBase}/git/blobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentPayload, encoding })
      });

      if (!blobRes.ok) {
        const errText = await blobRes.text();
        throw new Error(`Failed to create blob for ${file.path} (${blobRes.status}): ${errText}`);
      }

      const blobData = await blobRes.json();
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    // 4. Create new tree
    const treeRes = await fetch(`${apiBase}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });

    if (!treeRes.ok) {
      const errText = await treeRes.text();
      throw new Error(`Failed to create tree (${treeRes.status}): ${errText}`);
    }
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // 5. Create new commit
    const newCommitRes = await fetch(`${apiBase}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || 'Admin update via JTEX Console [skip ci]',
        tree: newTreeSha,
        parents: [commitSha]
      })
    });

    if (!newCommitRes.ok) {
      const errText = await newCommitRes.text();
      throw new Error(`Failed to create commit (${newCommitRes.status}): ${errText}`);
    }
    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    // 6. Update reference
    const updateRefRes = await fetch(`${apiBase}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false
      })
    });

    if (!updateRefRes.ok) {
      const errText = await updateRefRes.text();
      throw new Error(`Failed to update branch ref (${updateRefRes.status}): ${errText}`);
    }

    console.log(`[Storage] Successfully committed to GitHub: ${newCommitSha} (${message})`);
    return { success: true, commitSha: newCommitSha };
  } catch (err) {
    console.error('[Storage] Error committing to GitHub:', err.message);
    return { success: false, error: err.message };
  }
}
