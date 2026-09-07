const fs = require('fs');

function optimizeSvg(filePath) {
  if (!fs.existsSync(filePath)) return;
  let svg = fs.readFileSync(filePath, 'utf8');

  // 1. Remove date text at top right if present
  svg = svg.replace(/<text[^>]*y="20"[^>]*>[\s\S]*?<\/text>/g, '');

  // 2. Remove radar chart group
  // The radar chart has class="radar"
  const radarMatch = svg.match(/<g transform="translate\(980[^\"]*\"[\s\S]*?<\/polygon>\s*<\/g>/);
  if (radarMatch) {
    svg = svg.replace(radarMatch[0], '');
    console.log('Removed radar chart from', filePath);
  }

  // 3. Shift everything up by Y_SHIFT to remove top void
  const Y_SHIFT = 135;
  const NEW_HEIGHT = 850 - Y_SHIFT; // 715

  // Update SVG height and viewBox
  svg = svg.replace(/height="850"/g, `height="${NEW_HEIGHT}"`);
  svg = svg.replace(/viewBox="0 0 1280 850"/g, `viewBox="0 0 1280 ${NEW_HEIGHT}"`);

  // Update background rect height
  svg = svg.replace(/<rect([^>]*)height="850"([^>]*)class="fill-bg"/g, `<rect$1height="${NEW_HEIGHT}"$2class="fill-bg"`);

  // Wrap all elements after <rect ... class="fill-bg"> in a shifted group (if not already shifted)
  if (!svg.includes('transform="translate(0, -')) {
    const bgRectEnd = svg.indexOf('class="fill-bg">') + 'class="fill-bg">'.length;
    const svgEnd = svg.lastIndexOf('</svg>');

    const content = svg.substring(bgRectEnd, svgEnd);
    const newContent = `\n<g transform="translate(0, -${Y_SHIFT})">\n${content}\n</g>\n`;

    svg = svg.substring(0, bgRectEnd) + newContent + svg.substring(svgEnd);
  }

  fs.writeFileSync(filePath, svg, 'utf8');
  console.log(`Optimized ${filePath}: new height = ${NEW_HEIGHT}, shifted up by ${Y_SHIFT}px`);
  console.log(`Checks: hasRadar=${svg.includes('class="radar"')}, hasPullReq=${svg.includes('PullReq')}`);
}

optimizeSvg('profile-3d-contrib/profile-night-purple.svg');
optimizeSvg('profile-3d-contrib/profile-night-view.svg');
