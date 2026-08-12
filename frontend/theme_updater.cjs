const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');

const replacements = [
  { search: /bg-white/g, replace: 'bg-green-dark' },
  { search: /bg-gray-50/g, replace: 'bg-green-mid' },
  { search: /text-gray-900/g, replace: 'text-gold' },
  { search: /text-gray-800/g, replace: 'text-gold' },
  { search: /text-gray-700/g, replace: 'text-cream/90' },
  { search: /text-gray-600/g, replace: 'text-cream/80' },
  { search: /text-blue-600/g, replace: 'text-gold-bright' },
  { search: /bg-blue-50/g, replace: 'bg-green-mid' },
  { search: /bg-blue-600/g, replace: 'bg-gold-bright text-green-dark' },
  { search: /bg-blue-700/g, replace: 'bg-gold text-green-dark' },
  { search: /hover:bg-green-50/g, replace: 'hover:bg-green-mid' },
  { search: /bg-green-600/g, replace: 'bg-gold-bright text-green-dark' },
  { search: /bg-green-700/g, replace: 'bg-gold text-green-dark' },
  { search: /bg-purple-600/g, replace: 'bg-gold-bright text-green-dark' },
  { search: /bg-purple-700/g, replace: 'bg-gold text-green-dark' },
  { search: /bg-teal-600/g, replace: 'bg-gold-bright text-green-dark' },
  { search: /bg-teal-700/g, replace: 'bg-gold text-green-dark' },
  { search: /bg-orange-600/g, replace: 'bg-gold-bright text-green-dark' },
  { search: /bg-orange-700/g, replace: 'bg-gold text-green-dark' },
  { search: /border-blue-100/g, replace: 'border-gold/20' },
  { search: /focus:ring-blue-500/g, replace: 'focus:ring-gold' },
];

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(dir, file);
    if (file === 'AzaadiHero.jsx') return; // skip the hero itself
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add baloo font to titles
    content = content.replace(/className="text-2xl font-bold/g, 'className="text-3xl font-baloo font-bold text-gold');
    content = content.replace(/className="text-3xl font-bold/g, 'className="text-4xl font-baloo font-bold text-gold');
    
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('Theme updated successfully.');
