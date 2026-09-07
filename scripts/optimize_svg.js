const fs = require('fs');

function optimizeSvg(filePath) {
  if (!fs.existsSync(filePath)) return;
  const svg = fs.readFileSync(filePath, 'utf8');

  // 1. Extract style block
  const styleStart = svg.indexOf('<style>');
  const styleEnd = svg.indexOf('</style>') + 8;
  if (styleStart === -1 || styleEnd === -1) {
    console.log(`Could not find style block in ${filePath}`);
    return;
  }
  const styleContent = svg.substring(styleStart, styleEnd);

  // 2. Find rectEnd
  const rectMatch = svg.match(/<rect[^>]*class="fill-bg"[^>]*><\/rect>/);
  if (!rectMatch) {
    console.log(`Could not find background rect in ${filePath}`);
    return;
  }
  const rectEnd = svg.indexOf(rectMatch[0]) + rectMatch[0].length;

  // 3. Scan top-level groups after background rect
  let depth = 0;
  let groupStart = -1;
  const groups = [];

  for (let i = rectEnd; i < svg.length; i++) {
    if (svg.substr(i, 2) === '<g' && (svg[i+2] === ' ' || svg[i+2] === '>')) {
      if (depth === 0) groupStart = i;
      depth++;
    } else if (svg.substr(i, 4) === '</g>') {
      depth--;
      if (depth === 0) {
        groups.push({
          start: groupStart,
          end: i + 4,
          content: svg.substring(groupStart, i + 4)
        });
      }
    }
  }

  if (groups.length < 4) {
    console.log(`File ${filePath} has unexpected group count (${groups.length}), skipping.`);
    return;
  }

  const group0 = groups[0].content; // 3D isometric commit blocks
  // groups[1] is the radar chart - excluded completely!
  const group2 = groups[2].content; // Language donut chart
  let group3 = groups[3].content;   // Bottom stats (contributions, stars, forks)

  // Remove top right date text from group3 if present
  group3 = group3.replace(/<text[^>]*y="20"[^>]*>[\s\S]*?<\/text>/, '');

  const Y_SHIFT = 135;
  const NEW_HEIGHT = 850 - Y_SHIFT; // 715

  // Assemble the reconstructed, 100% compliant and valid SVG
  const optimizedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${NEW_HEIGHT}" viewBox="0 0 1280 ${NEW_HEIGHT}">${styleContent}<rect x="0" y="0" width="1280" height="${NEW_HEIGHT}" class="fill-bg"></rect><g transform="translate(0, -${Y_SHIFT})">${group0}${group2}${group3}</g></svg>`;

  // Strict XML Validation check before writing to disk
  const stack = [];
  const regex = /<(\/)?([a-zA-Z0-9:-]+)([^>]*?)(\/)?>/g;
  let m;
  let hasError = false;

  while ((m = regex.exec(optimizedSvg)) !== null) {
    const isClose = !!m[1];
    const tagName = m[2];
    const isSelfClosing = !!m[4] || m[3].trim().endsWith('/');

    if (tagName === 'link' || tagName === 'meta' || tagName === 'img' || tagName === 'br' || tagName === 'hr') continue;

    if (!isSelfClosing) {
      if (isClose) {
        if (stack.length === 0 || stack.pop() !== tagName) {
          hasError = true;
          break;
        }
      } else {
        stack.push(tagName);
      }
    }
  }

  if (hasError || stack.length > 0) {
    console.error(`XML validation failed for ${filePath}! Aborting optimization.`);
    return;
  }

  fs.writeFileSync(filePath, optimizedSvg, 'utf8');
  console.log(`Successfully optimized and validated ${filePath} (height: ${NEW_HEIGHT}, shift: -${Y_SHIFT}px)`);
}

optimizeSvg('profile-3d-contrib/profile-night-purple.svg');
optimizeSvg('profile-3d-contrib/profile-night-view.svg');
