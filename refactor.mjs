import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Convert wrapper class
  content = content.replace(/className="min-h-screen bg-slate-50[^"]*"/g, 'className="w-full flex-1 flex flex-col"');
  content = content.replace(/className="min-h-screen bg-transparent[^"]*"/g, 'className="w-full flex-1 flex flex-col"');
  
  // 2. dashboard specific - remove header entirely
  if (file === 'Dashboard.tsx') {
    content = content.replace(/<header[\s\S]*?<\/header>/, '');
  } else if (!['Landing.tsx', 'Login.tsx', 'Signup.tsx', 'ForgotPassword.tsx'].includes(file)) {
    // 3. other protected pages - convert header to standard div block, remove sticky
    content = content.replace(/<header className="bg-white border-b border-slate-200 sticky top-0 z-[0-9]+">/g, '<div className="bg-transparent mt-2 mb-4">');
    content = content.replace(/<\/header>/g, '</div>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Successfully refactored layout classNames and headers.');
