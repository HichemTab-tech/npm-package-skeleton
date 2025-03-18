import fs from 'fs/promises';
import path from 'path';
import prompts from 'prompts';
import {exec} from 'child_process';

const BASE_DIR = path.join(process.cwd());

async function run() {
    console.log('🎯 Initializing Package Setup...\n');

    const currentYear = new Date().getFullYear();


    /**
     * @typedef {Object} Answers
     * @property {'npm' | 'pnpm'} pkgManager - The selected package manager (npm or pnpm).
     * @property {string} packageName - The name of the package provided by the user.
     * @property {string} repoName - The repository name, suggested or provided by the user.
     * @property {string} authorName - The name of the package author.
     * @property {string} authorEmail - The email of the package author.
     * @property {string} githubUsername - The GitHub username of the author.
     */

    // noinspection JSUnusedGlobalSymbols
    /** @type {Answers} */
        // Step 1: Interactive prompts
    const answers = await prompts(
        [
            {
                type: 'select',
                name: 'pkgManager',
                message: '📦 Choose package manager:',
                choices: [{title: 'npm', value: 'npm'}, {title: 'pnpm', value: 'pnpm'}]
            },
            {
                type: 'text',
                name: 'packageName',
                message: '🌟 Enter package name:'
            },
            {
                type: prev => prev ? 'text' : null,
                name: 'repoName',
                message: '📌 Repo name (suggested):',
                initial: prev => prev
            },
            {
                type: 'text',
                name: 'authorName',
                message: '👤 Author Name:'
            },
            {
                type: 'text',
                name: 'authorEmail',
                message: '📧 Author Email:'
            },
            {
                type: 'text',
                name: 'githubUsername',
                message: '🐙 GitHub Username:'
            }
        ]
    );

    // Step 2: Define global replacements clearly AFTER getting answers
    const replacements = {
        "%PACKAGE-NAME%": answers.packageName,
        "%REPO-NAME%": answers.repoName,
        "%CURRENT-YEAR%": currentYear,
        "%AUTHOR-NAME%": answers.authorName,
        "%AUTHOR-EMAIL%": answers.authorEmail,
        "%GITHUB-OWNER-USERNAME%": answers.githubUsername
    };

    // Step 3: Finalize package.json before any replacements
    await finalizePackageJson(replacements);

    // Step 4: Clean unneeded lock files
    if (answers.pkgManager === 'npm') {
        await finalizePackageLockJson(replacements);
    } else {
        await finalizePnpmPackageLockYaml(replacements);
    }

    // Step 5: filters workflows based on selected package manager
    const workflowDir = path.join(BASE_DIR, 'stubs', '.github', 'workflows');
    const workflows = await fs.readdir(workflowDir);

    await Promise.all(workflows.map(async (file) => {
        const isNpmWorkflow = file.startsWith('npm-');
        const isPnpmWorkflow = file.startsWith('pnpm-');

        if ((answers.pkgManager === 'npm' && isPnpmWorkflow) || (answers.pkgManager === 'pnpm' && isNpmWorkflow)) {
            await fs.rm(path.join(workflowDir, file));
            console.log(`✅ Removed unwanted workflow: ${file}`);
        } else {
            console.log(`✅ Kept workflow: ${file}`);
        }
    }));

    // Step 6: Rename all stub files
    await renameStubFiles(path.join(BASE_DIR, 'stubs'));

    // Step 7: Replace placeholders in all files
    await replacePlaceholders(BASE_DIR, replacements, ['node_modules', '.git']);

    // Step 8: Cleanup setup scripts and temporary files (optional)
    await fs.rm(path.join(BASE_DIR, 'scripts'), {recursive: true, force: true});
    console.log('✅ Cleaned up temporary setup files.');

    console.log('\n🎉 Package Setup Complete!');

    exec('git init && git add . && git commit -m "Initial package setup"');

}

// helper functions clearly separated and organized
async function finalizePackageJson(replacements) {
    const stubPkgPath = path.join(BASE_DIR, 'stubs', 'package.json.stub');
    const finalPkgPath = path.join(BASE_DIR, 'package.json');

    let packageJsonContent = await fs.readFile(stubPkgPath, 'utf8');

    for (const [key, value] of Object.entries(replacements)) {
        packageJsonContent = packageJsonContent.replaceAll(key, value);
    }

    await fs.writeFile(finalPkgPath, packageJsonContent, 'utf8');
    console.log('✅ Created customized package.json');

    // remove the stub after replacement
    await fs.rm(stubPkgPath);
}

// helper functions clearly separated and organized
async function finalizePackageLockJson(replacements) {
    const stubPkgLockPath = path.join(BASE_DIR, 'stubs', 'package-lock.json.stub');
    const finalPkgLockPath = path.join(BASE_DIR, 'package-lock.json');

    let packageLockJsonContent = await fs.readFile(stubPkgLockPath, 'utf8');

    for (const [key, value] of Object.entries(replacements)) {
        packageLockJsonContent = packageLockJsonContent.replaceAll(key, value);
    }

    await fs.writeFile(finalPkgLockPath, packageLockJsonContent, 'utf8');
    console.log('✅ Created customized package-lock.json');

    // remove the stub after replacement
    await fs.rm(stubPkgLockPath);
}

// helper functions clearly separated and organized
async function finalizePnpmPackageLockYaml(replacements) {
    const stubPnpmPkgLockPath = path.join(BASE_DIR, 'stubs', 'pnpm-lock.yaml.stub');
    const finalPnpmPkgLockPath = path.join(BASE_DIR, 'pnpm-lock.yaml');

    // replace inside content directly
    let pnpmPackageLockContent = await fs.readFile(stubPnpmPkgLockPath, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
        pnpmPackageLockContent = pnpmPackageLockContent.replaceAll(key, value);
    }

    await fs.writeFile(finalPnpmPkgLockPath, pnpmPackageLockContent, 'utf8');
    console.log('✅ Created customized pnpm-lock.yaml');

    // remove the stub after replacement
    await fs.rm(stubPnpmPkgLockPath);
}

async function renameStubFiles(directory) {
    const entries = await fs.readdir(directory, {withFileTypes: true});

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            await renameStubFiles(entryPath);
        } else if (entry.name.endsWith('.stub')) {


            const fileName = path.basename(entryPath).replace('pnpm-', '').replace('npm-', '').replace('.stub', '');

            const finalPath = path.join(path.dirname(entryPath), fileName)
                .replace('\\stubs\\.github\\ISSUE_TEMPLATE', '\\.github\\ISSUE_TEMPLATE')
                .replace('\\stubs\\.github\\workflows', '\\.github\\workflows')
                .replace('\\stubs\\.github', '\\.github');
            await fs.rename(entryPath, finalPath);
            console.log(`✅ Renamed stub file: ${entry.name}`);
        }
    }
}

async function replacePlaceholders(directory, replacements, excludeDirs = []) {
    const entries = await fs.readdir(directory, {withFileTypes: true});

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (excludeDirs.includes(entry.name)) continue;

        if (entry.isDirectory()) {
            await replacePlaceholders(entryPath, replacements, excludeDirs);
        } else {
            const content = await fs.readFile(entryPath, 'utf8');
            let updatedContent = content;

            for (const [placeholder, replacement] of Object.entries(replacements)) {
                updatedContent = updatedContent.replaceAll(placeholder, replacement);
            }

            if (updatedContent !== content) {
                await fs.writeFile(entryPath, updatedContent, 'utf8');
                console.log(`✅ Updated placeholders in: ${entry.name}`);
            }
        }
    }
}

// Execute setup
run().catch((error) => {
    console.error('⚠️ Setup encountered an error:', error);
});