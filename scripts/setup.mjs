import fs from 'fs/promises';
import path from 'path';
// noinspection NpmUsedModulesInstalled
import prompts from 'prompts';
import {exec} from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BASE_DIR = path.join(process.cwd());

async function run() {
    console.log('🎯 Initializing Package Setup...\n');

    const currentYear = new Date().getFullYear();


    /**
     * @typedef {Object} Answers
     * @property {'npm' | 'pnpm'} pkgManager - The selected package manager (npm or pnpm).
     * @property {string} displayName - The display name of the package provided by the user.
     * @property {string} packageName - The name of the package provided by the user.
     * @property {string} repoName - The repository name, suggested or provided by the user.
     * @property {string} authorName - The name of the package author.
     * @property {string} authorEmail - The email of the package author.
     * @property {string} githubUsername - The GitHub username of the author.
     * @property {boolean} installLatestDeps - Whether to re-install the latest dependencies.
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
                name: 'displayName',
                message: '📝 Enter display name:',
            },
            {
                type: 'text',
                name: 'packageName',
                message: '🌟 Enter package name:',
                initial: prev => prev.replace(/ /g, '-').toLowerCase()
            },
            {
                type: 'text',
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
            },
            {
                type: "select",
                name: "installLatestDeps",
                message: "🚀 Do you want to re-install the latest dependencies ?",
                choices: [{ title: "Yes", value: "true" }, { title: "No", value: "false"}],
            }
        ]
    );

    // Step 2: Define global replacements clearly AFTER getting answers
    const replacements = {
        "%PASCALCASE-NAME%": toPascalCase(answers.displayName),
        "%DISPLAY-NAME%": answers.displayName,
        "%PACKAGE-NAME%": answers.packageName,
        "%REPO-NAME%": answers.repoName,
        "%CURRENT-YEAR%": currentYear,
        "%AUTHOR-NAME%": answers.authorName,
        "%AUTHOR-EMAIL%": answers.authorEmail,
        "%GITHUB-OWNER-USERNAME%": answers.githubUsername
    };

    // Step 3: Finalize package.json before any replacements
    await finalizePackageJson(replacements);
    await fs.rm(path.join(BASE_DIR, 'package-lock.json'), {force: true});
    await fs.rm(path.join(BASE_DIR, 'node_modules'), {recursive: true, force: true});

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

    // Step 6: Cleanup project specific files
    const filesToRemove = ['LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md'];
    await Promise.all(filesToRemove.map(async (file) => {
        await fs.rm(path.join(BASE_DIR, file), {force: true});
        console.log(`✅ Removed project specific file: ${file}`);
    }));

    // Step 7: Rename all stub files
    await renameStubFiles(path.join(BASE_DIR, 'stubs'));

    // Step 8: Replace placeholders in all files
    await replacePlaceholders(BASE_DIR, replacements, ['node_modules', '.git']);

    // Step 9: Cleanup setup scripts and temporary files (optional)
    await fs.rm(path.join(BASE_DIR, 'scripts'), {recursive: true, force: true});
    await fs.rm(path.join(BASE_DIR, 'stubs'), {recursive: true, force: true});
    console.log('✅ Cleaned up temporary setup files.');

    await installLatestDeps(answers);

    console.log('\n🎉 Package Setup Complete!');

    // renaming and initializing git
    console.log('\n🚀 Initializing git...');

    await execAsync('git init && git add . && git commit --no-verify --no-edit -m "Initial package setup"');

    console.log('\n🎉 Git initialized and first commit done!');

    console.log('\n🚀 All set up and ready to go! Time to unleash your creativity and start coding like a rockstar! 🎸');

    console.log('\n⭐ If you found this helpful, consider supporting the project by giving it a star on GitHub at https://github.com/HichemTab-tech/npm-package-skeleton and contributing! Every bit helps 😊');
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
                .replace('\\stubs\\.github', '\\.github')
                .replace('\\stubs\\root', '\\');
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

function toPascalCase(str) {
    return str
        .split(/[\s\-]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Install latest dependencies
 * @param answers
 */
async function installLatestDeps(answers) {
    if (answers.installLatestDeps === "true") {
        console.log("⏳ Installing latest dependencies");
        const packageString = await fs.readFile('package.json', 'utf8');
        const packageJson = JSON.parse(packageString);
        // noinspection JSUnresolvedReference
        const devDeps = Object.keys(packageJson.devDependencies??{});
        const deps = Object.keys(packageJson.dependencies??{});

        const devDepsCommand = devDeps.map(dep => `${dep}@latest`).join(' ');
        const depsCommand = deps.map(dep => `${dep}@latest`).join(' ');

        if (answers.pkgManager === 'npm') {
            await execAsync(`npm install ${devDepsCommand} -D`);
            await execAsync(`npm install ${depsCommand}`);
        }
        else{
            await execAsync(`pnpm add ${devDepsCommand} -D`);
            await execAsync(`pnpm add ${depsCommand}`);
        }
        console.log("✅ Latest dependencies installed");
    }
}

// Execute setup
run().catch((error) => {
    console.error('⚠️ Setup encountered an error:', error);
}).finally(() => {
    // Ensure TTY is restored so Node can exit and the shell prompt returns
    if (process.stdin && process.stdin.isTTY) {
        try { process.stdin.setRawMode(false); } catch {}
        process.stdin.pause();
    }
    // Make sure we end on a clean new line
    process.stdout.write('\n');
});