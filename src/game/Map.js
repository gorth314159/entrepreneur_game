/**
 * Handles HTML5 Canvas rendering of the city grid, buildings, roads, and customer particles.
 */
export default class Map {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Array} properties - List of game Property objects
   * @param {Function} onSelectProperty - Callback when a property is clicked
   */
  constructor(canvas, properties, onSelectProperty) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.properties = properties;
    this.onSelectProperty = onSelectProperty;
    
    this.selectedProperty = null;
    this.hoveredProperty = null;
    
    // Animation states
    this.particles = [];
    
    // Grid settings
    this.cols = 20;
    this.rows = 15;
    this.cellW = canvas.width / this.cols;  // 40px
    this.cellH = canvas.height / this.rows; // 40px
    
    // Road definitions (grid coordinates)
    this.roads = {
      rows: [3, 7, 11],
      cols: [4, 10, 15]
    };

    // Town state (assigned dynamically)
    this.town = null;

    this.setupListeners();
  }

  getResidentialZones() {
    const zones = [
      { name: 'Valley Estate', gridX: 1, gridY: 12, w: 3, h: 2 },
      { name: 'Metro Condos', gridX: 12, gridY: 0, w: 3, h: 2 },
      { name: 'Suburban Villas', gridX: 16, gridY: 8, w: 3, h: 2 }
    ];
    if (this.town && this.town.developmentManager && this.town.developmentManager.isProjectActive('aura_heights')) {
      zones.push({ name: 'Aura Heights', gridX: 16, gridY: 0, w: 3, h: 2, isLuxury: true });
    }
    return zones;
  }

  setupListeners() {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredProperty = null;
      this.canvas.style.cursor = 'default';
    });
  }

  /**
   * Translates mouse coordinates to canvas coordinates.
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    const gridX = Math.floor(pos.x / this.cellW);
    const gridY = Math.floor(pos.y / this.cellH);

    // Find if mouse is over a property
    let found = null;
    for (const prop of this.properties) {
      if (gridX >= prop.gridX && gridX < prop.gridX + prop.width &&
          gridY >= prop.gridY && gridY < prop.gridY + prop.height) {
        found = prop;
        break;
      }
    }

    if (found !== this.hoveredProperty) {
      this.hoveredProperty = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
    }
  }

  handleMouseClick(e) {
    const pos = this.getMousePos(e);
    const gridX = Math.floor(pos.x / this.cellW);
    const gridY = Math.floor(pos.y / this.cellH);

    let clickedProp = null;
    for (const prop of this.properties) {
      if (gridX >= prop.gridX && gridX < prop.gridX + prop.width &&
          gridY >= prop.gridY && gridY < prop.gridY + prop.height) {
        clickedProp = prop;
        break;
      }
    }

    this.selectedProperty = clickedProp;
    this.onSelectProperty(clickedProp);
  }

  /**
   * Spawn particles running from a residential sector to a specific business.
   */
  spawnCustomerParticles(businessProp, quantity = 5) {
    // Pick a random residential zone as source
    const zones = this.getResidentialZones();
    if (zones.length === 0) return;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const startX = (zone.gridX + zone.w / 2) * this.cellW;
    const startY = (zone.gridY + zone.h / 2) * this.cellH;

    const endX = (businessProp.gridX + businessProp.width / 2) * this.cellW;
    const endY = (businessProp.gridY + businessProp.height / 2) * this.cellH;

    const colors = ['#00f2fe', '#4facfe', '#00f5d4', '#fee140', '#ff0844'];
    const pColor = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < quantity; i++) {
      this.particles.push({
        x: startX + (Math.random() - 0.5) * 15,
        y: startY + (Math.random() - 0.5) * 15,
        targetX: endX + (Math.random() - 0.5) * 15,
        targetY: endY + (Math.random() - 0.5) * 15,
        speed: 1.5 + Math.random() * 2,
        size: 3 + Math.random() * 3,
        color: pColor,
        progress: 0
      });
    }
  }

  /**
   * Update particle positions.
   */
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        this.particles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
    }
  }

  /**
   * Renders the entire game map.
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Grid Background (sleek grid lines)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    for (let c = 0; c <= this.cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * this.cellW, 0);
      this.ctx.lineTo(c * this.cellW, this.canvas.height);
      this.ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * this.cellH);
      this.ctx.lineTo(this.canvas.width, r * this.cellH);
      this.ctx.stroke();
    }

    // 2. Draw Roads
    this.ctx.fillStyle = '#11121a';
    // Draw horizontal roads
    this.roads.rows.forEach(r => {
      this.ctx.fillRect(0, r * this.cellH, this.canvas.width, this.cellH);
      
      // Draw center dashed line
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 8]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, (r + 0.5) * this.cellH);
      this.ctx.lineTo(this.canvas.width, (r + 0.5) * this.cellH);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });
    // Draw vertical roads
    this.roads.cols.forEach(c => {
      this.ctx.fillRect(c * this.cellW, 0, this.cellW, this.canvas.height);
      
      // Center dashed line
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 8]);
      this.ctx.beginPath();
      this.ctx.moveTo((c + 0.5) * this.cellW, 0);
      this.ctx.lineTo((c + 0.5) * this.cellW, this.canvas.height);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });

    // Draw road intersections beautifully
    this.ctx.fillStyle = '#161722';
    this.roads.rows.forEach(r => {
      this.roads.cols.forEach(c => {
        this.ctx.fillRect(c * this.cellW, r * this.cellH, this.cellW, this.cellH);
      });
    });

    // 3. Draw Residential Zones (Houses)
    this.getResidentialZones().forEach(zone => {
      const zX = zone.gridX * this.cellW;
      const zY = zone.gridY * this.cellH;
      const zW = zone.w * this.cellW;
      const zH = zone.h * this.cellH;

      // Draw backdrop
      this.ctx.fillStyle = zone.isLuxury ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
      this.ctx.strokeStyle = zone.isLuxury ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = zone.isLuxury ? 1.5 : 1;
      this.drawRoundedRect(zX + 4, zY + 4, zW - 8, zH - 8, 8, true, true);

      // Render houses inside
      this.ctx.fillStyle = zone.isLuxury ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < zone.w; i++) {
        for (let j = 0; j < zone.h; j++) {
          const houseX = zX + i * this.cellW + 10;
          const houseY = zY + j * this.cellH + 10;
          const hSize = 20;

          this.ctx.beginPath();
          this.ctx.moveTo(houseX + hSize/2, houseY);
          this.ctx.lineTo(houseX + hSize, houseY + hSize/3);
          this.ctx.lineTo(houseX + hSize, houseY + hSize);
          this.ctx.lineTo(houseX, houseY + hSize);
          this.ctx.lineTo(houseX, houseY + hSize/3);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }

      // Draw Zone Label
      this.ctx.fillStyle = zone.isLuxury ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 255, 255, 0.4)';
      this.ctx.font = 'bold 9px "Outfit"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(zone.name.toUpperCase(), zX + zW / 2, zY + zH - 10);
    });

    // 4. Draw Properties
    this.properties.forEach(prop => {
      const px = prop.gridX * this.cellW + 6;
      const py = prop.gridY * this.cellH + 6;
      const pw = prop.width * this.cellW - 12;
      const ph = prop.height * this.cellH - 12;

      const isSelected = this.selectedProperty === prop;
      const isHovered = this.hoveredProperty === prop;

      // Card Background (dark slate gradient)
      let cardGradient = this.ctx.createLinearGradient(px, py, px, py + ph);
      cardGradient.addColorStop(0, '#1a1b26');
      cardGradient.addColorStop(1, '#0e0f17');
      this.ctx.fillStyle = cardGradient;
      this.drawRoundedRect(px, py, pw, ph, 10, true, false);

      // Highlight/Outline
      if (isSelected) {
        // Glowing cyan pulsing outline for selection
        this.ctx.strokeStyle = '#00f2fe';
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#00f2fe';
        this.drawRoundedRect(px, py, pw, ph, 10, false, true);
        this.ctx.shadowBlur = 0; // reset
      } else if (isHovered) {
        // Hover highlight
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.drawRoundedRect(px, py, pw, ph, 10, false, true);
      } else {
        // Default border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;
        this.drawRoundedRect(px, py, pw, ph, 10, false, true);
      }

      // Owner Banner (If owned)
      if (prop.owner) {
        this.ctx.fillStyle = prop.owner.color;
        // Small owned tag in top corner
        this.drawRoundedRect(px + 4, py + 4, 10, 10, 3, true, false);
      }

      // Icon placeholder / type glyph
      this.drawPropertyIcon(prop, px + pw/2, py + ph/3);

      // Labels: Name & Price
      this.ctx.textAlign = 'center';
      
      // Name
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '600 11px "Outfit"';
      this.ctx.fillText(prop.name, px + pw/2, py + ph - 26);

      // Price or Status Info
      this.ctx.fillStyle = prop.owner ? '#8e9bb0' : '#00f5d4';
      this.ctx.font = '500 10px "Outfit"';
      if (prop.owner) {
        if (prop.type === 'Apartments') {
          this.ctx.fillText(`Rent: $${prop.rent}`, px + pw/2, py + ph - 12);
        } else if (prop.type === 'Bank') {
          this.ctx.fillText(`Rate: ${(prop.interestRate * 100).toFixed(0)}%`, px + pw/2, py + ph - 12);
        } else if (prop.type === 'Farm') {
          this.ctx.fillText(`Price: $${prop.wholesalePrice}`, px + pw/2, py + ph - 12);
        } else {
          this.ctx.fillText(`Price: $${prop.price}`, px + pw/2, py + ph - 12);
        }
      } else {
        this.ctx.fillText(`Buy: $${prop.basePrice.toLocaleString()}`, px + pw/2, py + ph - 12);
      }

      // Star Upgrade indicators
      if (prop.owner && prop.upgradeLevel > 1) {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '10px sans-serif';
        const stars = '★'.repeat(prop.upgradeLevel - 1);
        this.ctx.fillText(stars, px + pw/2, py + ph/2 + 8);
      }
    });

    // 5. Draw Particles
    this.updateParticles();
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0; // reset
    });
  }

  /**
   * Helper to draw property icons.
   */
  drawPropertyIcon(prop, x, y) {
    this.ctx.strokeStyle = prop.owner ? prop.owner.color : '#8e9bb0';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1.5;

    switch (prop.type) {
      case 'Bank':
        // A Greek column temple
        this.ctx.beginPath();
        this.ctx.rect(x - 12, y - 8, 24, 18);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x - 15, y - 8);
        this.ctx.lineTo(x, y - 16);
        this.ctx.lineTo(x + 15, y - 8);
        this.ctx.closePath();
        this.ctx.stroke();
        break;
      case 'AdServices':
        // A megaphone
        this.ctx.beginPath();
        this.ctx.moveTo(x - 8, y - 4);
        this.ctx.lineTo(x + 6, y - 10);
        this.ctx.lineTo(x + 10, y + 6);
        this.ctx.lineTo(x - 4, y + 4);
        this.ctx.closePath();
        this.ctx.stroke();
        // Handle
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y + 4);
        this.ctx.lineTo(x - 6, y + 10);
        this.ctx.stroke();
        break;
      case 'Farm':
        // A wheat sheaf or silo/barn shape
        this.ctx.beginPath();
        this.ctx.rect(x - 10, y - 8, 14, 18);
        this.ctx.stroke();
        // Silo dome
        this.ctx.beginPath();
        this.ctx.arc(x - 3, y - 8, 7, Math.PI, 0);
        this.ctx.stroke();
        // Windmill blades outline
        this.ctx.beginPath();
        this.ctx.arc(x + 8, y, 6, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'GroceryStore':
        // Shopping cart shape
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y - 10);
        this.ctx.lineTo(x - 6, y - 10);
        this.ctx.lineTo(x - 2, y + 2);
        this.ctx.lineTo(x + 10, y + 2);
        this.ctx.lineTo(x + 12, y - 6);
        this.ctx.lineTo(x - 4, y - 6);
        this.ctx.stroke();
        // Wheels
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y + 6, 2.5, 0, Math.PI * 2);
        this.ctx.arc(x + 8, y + 6, 2.5, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'Restaurant':
        // Fork and spoon crossed or chef hat
        this.ctx.beginPath();
        this.ctx.arc(x, y - 4, 8, 0, Math.PI * 2);
        this.ctx.stroke();
        // Cup rim
        this.ctx.beginPath();
        this.ctx.rect(x - 5, y + 4, 10, 6);
        this.ctx.stroke();
        break;
      case 'RetailStore':
        // Shopping bag shape
        this.ctx.beginPath();
        this.ctx.rect(x - 10, y - 6, 20, 16);
        this.ctx.stroke();
        // Bag handle
        this.ctx.beginPath();
        this.ctx.arc(x, y - 6, 6, Math.PI, 0);
        this.ctx.stroke();
        break;
      case 'MechanicShop':
        // Wrench or car silhouette
        this.ctx.beginPath();
        this.ctx.arc(x, y - 2, 7, 0, Math.PI * 2);
        this.ctx.stroke();
        // handle
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y + 3);
        this.ctx.lineTo(x + 12, y + 11);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.lineWidth = 1.5; // restore
        break;
      case 'Apartments':
        // Multi-tier skyline building
        this.ctx.beginPath();
        this.ctx.rect(x - 12, y - 10, 10, 22);
        this.ctx.rect(x + 2, y - 4, 10, 16);
        this.ctx.stroke();
        break;
    }
  }

  /**
   * Helper to draw rounded rectangles on the Canvas.
   */
  drawRoundedRect(x, y, width, height, radius, fill, stroke) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height - radius);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    
    if (fill) this.ctx.fill();
    if (stroke) this.ctx.stroke();
  }
}
