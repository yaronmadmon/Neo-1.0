// Install dependencies for all workspace packages
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const packages = [
  // Base packages first (no workspace deps)
  { dir: 'packages/contracts', deps: [] },
  // Packages that depend on contracts
  { dir: 'packages/safety', deps: ['@neo/contracts'] },
  { dir: 'packages/premium', deps: ['@neo/contracts'] },
  { dir: 'packages/core/templates', deps: ['@neo/contracts'] },
  { dir: 'packages/core/runtime', deps: ['@neo/contracts'] },
  // Packages with more dependencies
  { dir: 'packages/core/ai-engine', deps: ['@neo/contracts', '@neo/safety', 'openai@^4.47.0', '@anthropic-ai/sdk@^0.24.0'] },
  { dir: 'packages/core/app-generator', deps: ['@neo/contracts', '@neo/templates', '@neo/ai-engine', '@neo/safety'] },
  // Apps
  { dir: 'apps/server', deps: ['@neo/contracts', '@neo/premium', '@neo/app-generator', '@neo/ai-engine', '@neo/templates', '@neo/safety', '@neo/runtime', 'fastify@^4.26.2', 'pino-pretty@^10.2.3'] },
  { dir: 'apps/web', deps: ['react@^18.3.1', 'react-dom@^18.3.1', 'vite@^5.1.0', '@vitejs/plugin-react@^4.2.1', 'tailwindcss@^3.4.1', 'autoprefixer@^10.4.17', 'postcss@^8.4.35', '@types/react@^18.3.0', '@types/react-dom@^18.3.0'] },
];

console.log('Installing dependencies for workspace packages...\n');

for (const pkg of packages) {
  const pkgDir = path.join(rootDir, pkg.dir);
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  
  if (!fs.existsSync(pkgJsonPath)) {
    console.log(`⚠️  Skipping ${pkg.dir} - package.json not found`);
    continue;
  }

  console.log(`📦 Installing dependencies for ${pkg.dir}...`);
  
  try {
    // For workspace packages, link them using file: protocol
    const deps = pkg.deps.map(dep => {
      if (dep.startsWith('@neo/')) {
        const pkgName = dep.split('@')[0] || dep;
        // Find the actual package directory
        for (const otherPkg of packages) {
          const otherPkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, otherPkg.dir, 'package.json'), 'utf8'));
          if (otherPkgJson.name === dep || otherPkgJson.name === pkgName) {
            const relPath = path.relative(pkgDir, path.join(rootDir, otherPkg.dir));
            return `${dep}@file:${relPath.replace(/\\/g, '/')}`;
          }
        }
        return dep;
      }
      return dep;
    });

    if (deps.length > 0) {
      // Use npm install with file: paths for workspace packages
      const cmd = `npm install ${deps.join(' ')} --no-package-lock --legacy-peer-deps`;
      execSync(cmd, { cwd: pkgDir, stdio: 'inherit' });
    } else {
      console.log(`   (no dependencies to install)`);
    }
    
    console.log(`✅ ${pkg.dir} done\n`);
  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${pkg.dir}:`, error.message);
    // Continue with other packages
  }
}

console.log('✅ Dependency installation complete!');
