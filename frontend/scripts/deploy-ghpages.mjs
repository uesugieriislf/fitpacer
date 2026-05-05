import { execSync } from 'child_process'
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoUrl = 'https://github.com/uesugieriislf/fitpacer.git'
const srcDir = 'C:\\Users\\levi\\projects\\fitpacer\\frontend\\dist'
const tmpDir = 'C:\\Users\\levi\\projects\\fitpacer\\deploy-tmp'

// Clean and recreate tmp
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir)

// Copy dist contents
cpSync(srcDir, tmpDir, { recursive: true })

// Add .nojekyll (already in dist, but double-check)
const nojekyll = join(tmpDir, '.nojekyll')
if (!existsSync(nojekyll)) writeFileSync(nojekyll, '')

// Run git commands
function run(cmd, cwd) {
  console.log('> ' + cmd)
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' })
    if (out.trim()) console.log(out.trim())
    return out
  } catch (e) {
    console.error(e.stderr || e.message)
    throw e
  }
}

run('git init', tmpDir)
run('git checkout -b gh-pages', tmpDir)
run('git add -A', tmpDir)
run('git commit -m deploy', tmpDir)
run('git remote add origin ' + repoUrl, tmpDir)
run('git push -f origin gh-pages', tmpDir)

console.log('Deployed to gh-pages branch')
