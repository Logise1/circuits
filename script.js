
// ==========================================
// Math & Solver Utilities
// ==========================================
class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = Array(rows).fill(0).map(() => Array(cols).fill(0));
    }

    static solve(A, b) {
        // Gaussian Elimination
        const n = A.rows;
        // Augment Matrix A with b
        const M = A.data.map((row, i) => [...row, b[i]]);

        for (let i = 0; i < n; i++) {
            // Pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                    maxRow = k;
                }
            }
            [M[i], M[maxRow]] = [M[maxRow], M[i]];

            if (Math.abs(M[i][i]) < 1e-10) continue; // Singular or nearly singular

            for (let k = i + 1; k < n; k++) {
                const factor = M[k][i] / M[i][i];
                for (let j = i; j <= n; j++) {
                    M[k][j] -= factor * M[i][j];
                }
            }
        }

        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            if (Math.abs(M[i][i]) < 1e-10) continue;
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += M[i][j] * x[j];
            }
            x[i] = (M[i][n] - sum) / M[i][i];
        }
        return x;
    }
}

// ==========================================
// Application Constants
// ==========================================
const GRID_SIZE = 20;
const COMP_WIDTH = 60;
const COMP_HEIGHT = 60;

// ==========================================
// Component Classes
// ==========================================
class Component {
    constructor(type, x, y, id) {
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0; // 0, 1, 2, 3 (x90 deg)
        this.width = COMP_WIDTH;
        this.height = COMP_HEIGHT;
        this.terminals = this.getTerminalsConfig();
        this.properties = this.DefaultProperties();
        this.state = {
            voltageDrop: 0,
            current: 0,
            power: 0,
            burnt: false,
            nodeIds: [null, null],
            animationOffset: 0 // For fans etc
        };
    }

    DefaultProperties() {
        switch (this.type) {
            case 'battery': return { voltage: 9, internalResistance: 1.5 };
            case 'resistor': return { resistance: 100, powerRating: 0.5 };
            case 'light': return { resistance: 50, powerRating: 1.0, maxLumens: 100 };
            case 'switch': return { closed: false, resistance: 0.01 };
            case 'fan': return { resistance: 20, powerRating: 2.0 };
            case 'diode': return { forwardVoltage: 0.7, breakdownVoltage: 50 };
            default: return {};
        }
    }

    getTerminalsConfig() {
        return [
            { id: 0, x: -30, y: 0 },
            { id: 1, x: 30, y: 0 }
        ];
    }

    hitTest(x, y) {
        return x >= this.x - this.width / 2 &&
            x <= this.x + this.width / 2 &&
            y >= this.y - this.height / 2 &&
            y <= this.y + this.height / 2;
    }

    getAbsoluteTerminals() {
        const cos = Math.cos(this.rotation * Math.PI / 2);
        const sin = Math.sin(this.rotation * Math.PI / 2);

        return this.terminals.map(t => {
            const rx = t.x * cos - t.y * sin;
            const ry = t.x * sin + t.y * cos;
            return {
                x: this.x + rx,
                y: this.y + ry,
                id: t.id
            };
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 2);

        if (this.state.burnt) {
            ctx.filter = "grayscale(100%) brightness(50%)";
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f8fafc';
        ctx.fillStyle = '#1e293b';

        if (this.type === 'resistor') this.drawResistor(ctx);
        else if (this.type === 'battery') this.drawBattery(ctx);
        else if (this.type === 'light') this.drawLight(ctx);
        else if (this.type === 'switch') this.drawSwitch(ctx);
        else if (this.type === 'fan') this.drawFan(ctx);
        else if (this.type === 'diode') this.drawDiode(ctx);

        if (this.state.burnt) {
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🔥", 0, 0);
        }

        ctx.restore();
    }

    drawResistor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-20, 0);
        ctx.lineTo(-15, -10); ctx.lineTo(-5, 10);
        ctx.lineTo(5, -10); ctx.lineTo(15, 10);
        ctx.lineTo(20, 0); ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(-12, -4, 4, 8); ctx.fillRect(-4, -4, 4, 8); ctx.fillRect(4, -4, 4, 8);
    }

    drawBattery(ctx) {
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(10, 0); ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 4; ctx.moveTo(-10, -15); ctx.lineTo(-10, 15); ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 2; ctx.moveTo(10, -8); ctx.lineTo(10, 8); ctx.stroke();
        ctx.save(); ctx.lineWidth = 1; ctx.font = "10px Arial"; ctx.fillStyle = "#aaa"; ctx.fillText("+", 12, -10); ctx.restore();
    }

    drawLight(ctx) {
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = this.state.burnt ? '#333' : `rgba(255, 255, 200, ${Math.min(1, Math.abs(this.state.current) * 10)})`;
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(-4, -5); ctx.lineTo(4, -5); ctx.lineTo(8, 5); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 2; ctx.moveTo(-30, 0); ctx.lineTo(-14, 0); ctx.moveTo(30, 0); ctx.lineTo(14, 0); ctx.stroke();
        if (!this.state.burnt && Math.abs(this.state.current) > 0.01) {
            const glow = Math.min(30, Math.abs(this.state.current) * 100);
            ctx.shadowColor = "#FFFF00"; ctx.shadowBlur = glow; ctx.strokeStyle = `rgba(255,255,0,${Math.min(1, glow / 20)})`; ctx.stroke(); ctx.shadowBlur = 0;
        }
    }

    drawSwitch(ctx) {
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-15, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(15, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-15, 0);
        if (this.properties.closed) ctx.lineTo(15, 0); else ctx.lineTo(12, -12);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(-15, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, 0, 2, 0, Math.PI * 2); ctx.fill();
    }

    drawFan(ctx) {
        // Casing
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();

        // Blades
        ctx.save();
        if (!this.state.burnt) {
            // Speed depends on power/current
            const speed = this.state.power * 2;
            this.state.animationOffset = (this.state.animationOffset + speed) % (Math.PI * 2);
        }
        ctx.rotate(this.state.animationOffset);

        ctx.fillStyle = "#3b82f6";
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(0, -10, 8, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.rotate(Math.PI * 2 / 3);
        }
        ctx.restore();

        // Leads
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-25, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(25, 0); ctx.stroke();
    }

    drawDiode(ctx) {
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(10, 0); ctx.stroke();

        // Triangle
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(10, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fillStyle = this.state.burnt ? "#333" : "#ccc";
        ctx.fill();
        ctx.stroke();

        // Bar
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.moveTo(10, -10);
        ctx.lineTo(10, 10);
        ctx.stroke();
    }
}

// ==========================================
// Main Application
// ==========================================
class App {
    constructor() {
        this.canvas = document.getElementById('circuit-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.components = [];
        this.wires = []; // Array of connections { comp1Id, term1Coord, comp2Id, term2Coord } -- Actually simpler: {startComp, startTerm, endComp, endTerm}

        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.selectedComponent = null;
        this.propertiesPanel = document.getElementById('properties-content');
        this.zoomLevelEl = document.getElementById('zoom-level');

        // Wire creation state
        this.wireDrag = null; // { comp, termIndex, currentMouseX, currentMouseY }

        // Animation
        this.wireDashOffset = 0;

        this.setupEvents();
        this.setupUI();

        requestAnimationFrame(() => this.loop());

        // Auto-save/load mock
        setTimeout(() => this.resetBoard(), 100);
    }

    resetBoard() {
        // Add a demo circuit
        // Battery
        const b = new Component('battery', 0, 0);
        // Resistor
        const r = new Component('resistor', 0, -100);
        r.rotation = 1;
        // Light
        const l = new Component('light', 100, 0);
        l.rotation = 1;
        // Switch
        const s = new Component('switch', -100, 0);
        s.rotation = 1;
        const f = new Component('fan', 0, 100);

        this.components.push(b, r, l, s, f);
        // Connect them (optional, let user play)
        this.wires.push(
            { startComp: b, startTermId: 1, endComp: r, endTermId: 1 },
            { startComp: r, startTermId: 0, endComp: b, endTermId: 0 }
        );
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.components = [];
            this.wires = [];
        });

        // SAVE / LOAD
        document.getElementById('save-btn').addEventListener('click', () => this.saveCircuit());
        document.getElementById('load-trigger-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', (e) => this.loadCircuit(e));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedComponent) {
                this.components = this.components.filter(c => c !== this.selectedComponent);
                // Remove wires connected to it
                this.wires = this.wires.filter(w => w.startComp !== this.selectedComponent && w.endComp !== this.selectedComponent);
                this.selectedComponent = null;
                this.updatePropertiesPanel();
            }
            if (e.key === 'r' && this.selectedComponent) {
                this.selectedComponent.rotation = (this.selectedComponent.rotation + 1) % 4;
            }
        });
    }

    saveCircuit() {
        // Serialize
        const data = {
            components: this.components.map(c => ({
                id: c.id, type: c.type, x: c.x, y: c.y, rotation: c.rotation, properties: c.properties
            })),
            wires: this.wires.map(w => ({
                startCompId: w.startComp.id,
                startTermId: w.startTermId,
                endCompId: w.endComp.id,
                endTermId: w.endTermId
            })),
            camera: this.camera
        };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "circuito.json";
        link.click();
    }

    loadCircuit(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                this.components = [];
                this.wires = [];

                // Rehydrate components
                const compMap = new Map();
                data.components.forEach(c => {
                    const comp = new Component(c.type, c.x, c.y, c.id);
                    comp.rotation = c.rotation;
                    comp.properties = c.properties;
                    compMap.set(c.id, comp);
                    this.components.push(comp);
                });

                // Rehydrate wires
                data.wires.forEach(w => {
                    const start = compMap.get(w.startCompId);
                    const end = compMap.get(w.endCompId);
                    if (start && end) {
                        this.wires.push({
                            startComp: start, startTermId: w.startTermId,
                            endComp: end, endTermId: w.endTermId
                        });
                    }
                });

                if (data.camera) this.camera = data.camera;

            } catch (err) {
                alert("Error cargando archivo: " + err);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    }

    setupUI() {
        // Drag and Drop from sidebar
        const items = document.querySelectorAll('.component-item');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', item.dataset.type);
            });
        });

        // Drop on canvas
        this.canvas.addEventListener('dragover', e => e.preventDefault());
        this.canvas.addEventListener('drop', e => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type) {
                const rect = this.canvas.getBoundingClientRect();
                const worldPos = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
                const comp = new Component(type, worldPos.x, worldPos.y);
                this.components.push(comp);
            }
        });
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
            y: (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
            y: (wy - this.camera.y) * this.camera.zoom + this.canvas.height / 2
        };
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.screenToWorld(mx, my);

        // 1. Check terminals (start wire)
        // Hit test radius slightly larger for convenience
        for (let c of this.components) {
            const terminals = c.getAbsoluteTerminals();
            for (let t of terminals) {
                if (Math.hypot(t.x - worldPos.x, t.y - worldPos.y) < 15) {
                    this.wireDrag = { comp: c, termId: t.id, startX: t.x, startY: t.y, currX: worldPos.x, currY: worldPos.y };
                    return;
                }
            }
        }

        // 2. Check component bodies (select/drag)
        let hit = null;
        for (let i = this.components.length - 1; i >= 0; i--) {
            if (this.components[i].hitTest(worldPos.x, worldPos.y)) {
                hit = this.components[i];
                break;
            }
        }

        if (hit) {
            this.selectedComponent = hit;
            this.draggingComp = hit;
            this.updatePropertiesPanel();
        } else {
            this.selectedComponent = null;
            this.isDragging = true; // Panning
            this.updatePropertiesPanel();
        }

        this.lastMouse = { x: mx, y: my };
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.screenToWorld(mx, my);

        if (this.wireDrag) {
            this.wireDrag.currX = worldPos.x;
            this.wireDrag.currY = worldPos.y;
        } else if (this.draggingComp) {
            this.draggingComp.x += (mx - this.lastMouse.x) / this.camera.zoom;
            this.draggingComp.y += (my - this.lastMouse.y) / this.camera.zoom;
        } else if (this.isDragging) {
            this.camera.x -= (mx - this.lastMouse.x) / this.camera.zoom;
            this.camera.y -= (my - this.lastMouse.y) / this.camera.zoom;
        }

        // Hover Check for Terminals (for visual feedback)
        this.hoveredTerminal = null;
        let pannedOverSomething = false;

        if (!this.draggingComp && !this.isDragging && !this.wireDrag) {
            for (let c of this.components) {
                const terminals = c.getAbsoluteTerminals();
                for (let t of terminals) {
                    if (Math.hypot(t.x - worldPos.x, t.y - worldPos.y) < 15) {
                        this.hoveredTerminal = { x: t.x, y: t.y };
                        pannedOverSomething = true;
                        break;
                    }
                }
                if (pannedOverSomething) break;
            }
        }

        this.canvas.style.cursor = pannedOverSomething ? 'crosshair' : (this.isDragging ? 'grabbing' : 'default');

        this.lastMouse = { x: mx, y: my };
    }

    onMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const worldPos = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

        if (this.wireDrag) {
            // Check if dropped on a valid terminal
            for (let c of this.components) {
                const terminals = c.getAbsoluteTerminals();
                for (let t of terminals) {
                    if (Math.hypot(t.x - worldPos.x, t.y - worldPos.y) < 15) {
                        // Create wire
                        // Allow self connections? No.
                        if (c !== this.wireDrag.comp) {
                            this.wires.push({
                                startComp: this.wireDrag.comp,
                                startTermId: this.wireDrag.termId,
                                endComp: c,
                                endTermId: t.id
                            });
                        }
                    }
                }
            }
            this.wireDrag = null;
        }

        this.isDragging = false;
        this.draggingComp = null;
    }

    onWheel(e) {
        const zoomSpeed = 0.1;
        const delta = -Math.sign(e.deltaY) * zoomSpeed;
        const newZoom = Math.max(0.1, Math.min(5, this.camera.zoom + delta));
        this.camera.zoom = newZoom;
        this.zoomLevelEl.innerText = Math.round(newZoom * 100) + '%';
    }

    updatePropertiesPanel(onlyStats = false) {
        const panelEl = document.getElementById('properties-panel');
        if (!this.selectedComponent) {
            panelEl.classList.remove('visible');
            return;
        }

        panelEl.classList.add('visible');
        const c = this.selectedComponent;

        if (!onlyStats) {
            // Render Structure & Inputs
            document.getElementById('prop-title').innerText = c.type.toUpperCase();
            let html = '';

            const createInput = (label, key, step = 1) => `
                 <div class="prop-row">
                     <label>${label}</label>
                     <input type="number" step="${step}" value="${c.properties[key]}" 
                     onchange="window.updateCompProp('${c.id}', '${key}', this.value)">
                 </div>`;

            if (c.type === 'battery') {
                html += createInput('Voltaje (V)', 'voltage', 0.1);
                html += createInput('Res. Interna (Ω)', 'internalResistance', 0.1);
            } else if (c.type === 'resistor') {
                html += createInput('Resistencia (Ω)', 'resistance', 10);
                html += createInput('Límite (W)', 'powerRating', 0.1);
            } else if (c.type === 'light' || c.type === 'fan') {
                html += createInput('Resistencia (Ω)', 'resistance', 1);
            } else if (c.type === 'switch') {
                html += `
                 <div class="prop-row">
                     <button class="glass-btn" style="width:100%" onclick="window.toggleSwitch('${c.id}')">
                         ${c.properties.closed ? 'Cerrado' : 'Abierto'}
                     </button>
                 </div>`;
            }

            // Placeholder for stats
            html += `<div id="live-stats-container" class="live-stats"></div>`;

            if (c.state.burnt) {
                html += `<div style="color: #ef4444; font-weight: bold; margin-top: 10px; text-align:center">¡QUEMADO!</div>
                 <button class="glass-btn danger" style="width:100%; margin-top:5px;" onclick="window.repairComp('${c.id}')">Reparar</button>`;
            }

            this.propertiesPanel.innerHTML = html;
        }

        // Update Stats ONLY
        const statsEl = document.getElementById('live-stats-container');
        if (statsEl) {
            let statsHtml = '';
            if (c.state.burnt) {
                statsHtml = '<div class="stat-item"><span class="stat-label">Estado</span><span class="stat-value" style="color:#ef4444">DAÑADO</span></div>';
            } else {
                statsHtml += `<div class="stat-item"><span class="stat-label">Corriente</span><span class="stat-value">${(c.state.current * 1000).toFixed(1)} mA</span></div>`;
                statsHtml += `<div class="stat-item"><span class="stat-label">Potencia</span><span class="stat-value">${(c.state.power).toFixed(3)} W</span></div>`;
                statsHtml += `<div class="stat-item"><span class="stat-label">V. Caída</span><span class="stat-value">${(c.state.voltageDrop).toFixed(2)} V</span></div>`;

                if (c.type === 'diode') {
                    statsHtml += `<div class="stat-item"><span class="stat-label">Modo</span><span class="stat-value">${c.state.voltageDrop > 0.5 ? 'ON' : 'OFF'}</span></div>`;
                }
            }
            statsEl.innerHTML = statsHtml;
        }
    }

    deselect() {
        this.selectedComponent = null;
        this.updatePropertiesPanel();
    }

    // ===================================
    // Simulation Engine
    // ===================================
    solveCircuit() {
        // 1. Identification of Nodes
        // A node is a set of connected terminals.

        let nodeCount = 0;
        const terminalToNodeMap = new Map(); // keyString(compId, termId) -> nodeIndex

        // Start by assigning unique node to every terminal
        // Then merge sets based on wires
        // Using Disjoint Set (Union-Find) is simple here

        const parent = [];
        const getSize = () => parent.length;
        const makeSet = () => { parent.push(parent.length); return parent.length - 1; };
        const find = (i) => { if (parent[i] === i) return i; return parent[i] = find(parent[i]); };
        const union = (i, j) => { const rootI = find(i); const rootJ = find(j); if (rootI !== rootJ) parent[rootI] = rootJ; };

        // Map every terminal to an initial set
        const getTermKey = (c, tId) => `${c.id}_${tId}`;
        const keyToSetId = new Map();

        this.components.forEach(c => {
            c.terminals.forEach(t => {
                const p = makeSet();
                keyToSetId.set(getTermKey(c, t.id), p);
            });
        });

        // Union sets based on wires
        this.wires.forEach(w => {
            const k1 = getTermKey(w.startComp, w.startTermId);
            const k2 = getTermKey(w.endComp, w.endTermId);
            union(keyToSetId.get(k1), keyToSetId.get(k2));
        });

        // Collect unique roots -> Matrix Nodes
        // We need to map root IDs to Matrix Indices 0, 1, 2...
        // But one root must be GROUND (Reference). 
        // We pick the root connected to the negative terminal of the first battery, or just index 0.
        // Let's iterate components to see actual connectivity.

        const distinctRoots = new Set();
        this.components.forEach(c => {
            c.terminals.forEach(t => distinctRoots.add(find(keyToSetId.get(getTermKey(c, t.id)))));
        });

        // If no nodes, return
        if (distinctRoots.size === 0) return;

        const rootsArray = Array.from(distinctRoots);
        const rootToMatrixIdx = new Map();

        // Pick ground: Prefer battery negative
        let groundRoot = rootsArray[0];
        const battery = this.components.find(c => c.type === 'battery');
        if (battery) {
            // terminal 0 is usually negative (left) in our draw logic? Actually let's just pick one.
            groundRoot = find(keyToSetId.get(getTermKey(battery, 0))); // Say term 0 is Neg
        }

        // Assign indices
        let matrixSize = 0;
        rootsArray.forEach(r => {
            if (r === groundRoot) {
                rootToMatrixIdx.set(r, -1); // Ground
            } else {
                rootToMatrixIdx.set(r, matrixSize++);
            }
        });

        if (matrixSize === 0) {
            // Only ground, no current
            this.components.forEach(c => { c.state.current = 0; c.state.voltageDrop = 0; });
            return;
        }

        // 2. Build MNA Matrix
        // Variables: N node voltages (excluding ground).
        // Plus M current variables for voltage sources (batteries).

        const voltageSources = this.components.filter(c => c.type === 'battery' && !c.state.burnt);
        const numVars = matrixSize + voltageSources.length;
        const A = new Matrix(numVars, numVars);
        const b = Array(numVars).fill(0);

        // Helper to add conductance to A
        const addG = (nodeIdx1, nodeIdx2, G) => {
            if (nodeIdx1 !== -1) A.data[nodeIdx1][nodeIdx1] += G;
            if (nodeIdx2 !== -1) A.data[nodeIdx2][nodeIdx2] += G;
            if (nodeIdx1 !== -1 && nodeIdx2 !== -1) {
                A.data[nodeIdx1][nodeIdx2] -= G;
                A.data[nodeIdx2][nodeIdx1] -= G;
            }
        };

        // Fill passive components inputs (Resistors, Lights, Switch)
        // Batteries are special (Voltage sources)
        // Switches are just small resistors if closed

        this.components.forEach(c => {
            if (c.state.burnt) return;

            const n1 = rootToMatrixIdx.get(find(keyToSetId.get(getTermKey(c, 0))));
            const n2 = rootToMatrixIdx.get(find(keyToSetId.get(getTermKey(c, 1))));

            if (c.type === 'resistor' || c.type === 'light' || c.type === 'fan') {
                const R = parseFloat(c.properties.resistance); // Safe parsing
                if (R > 0) addG(n1, n2, 1 / R);
            } else if (c.type === 'switch') {
                const R = c.properties.closed ? 0.01 : 1e9; // 10mOhm or 1GOhm
                addG(n1, n2, 1 / R);
            } else if (c.type === 'diode') {
                // Heuristic: If last frame VDrop > 0.7, conduct (low R), else block (high R)
                // Default to blocked (High R) initially
                let R = 1e7;
                if (c.state.voltageDrop > c.properties.forwardVoltage) R = 0.1; // Conducting
                addG(n1, n2, 1 / R);
            } else if (c.type === 'battery') {
                // For a REAL battery with internal resistance:
                // Model as ideal voltage source (V) + series resistance (r).
                // But MNA standard for Voltage Source connects two nodes directly with constraint.
                // We said earlier: V_a - V_b + I_batt * r_int = V_emf
                // That fits into the Source Row.
                // Or we can treat the battery as a resistor G=1/r_int between nodes, AND a current injection?
                // No, standard MNA with internal R is:
                // 1. Current enters n1, leaves n2.
                // 2. Equation: V_n2 - V_n1 - I_src * r_int = -V_emf (assuming n2 is +, n1 is -)

                // Let's assume term 1 is POS (+), term 0 is NEG (-).
                // Current flow defined from + to - external, so internal flow is - to +. (0 to 1).
                // Wait, standard conv: Current I leaves 1 (+), enters 0 (-).
                // internal: I goes 0 -> 1.
                // V1 - V0 = V_emf - I * r_int.

                // Let's map Source Index `srcIdx` logic.
                const srcIdx = matrixSize + voltageSources.indexOf(c);

                // KCL contributions for I_src
                // I_src flows out of 1 (+), into 0 (-).
                // So at node 1 (pos), we subtract I_src? Or add?
                // Standard: I_branch variable direction is usually 0->1.
                // If I variable is 0->1:
                // Node 0: leaves -> -1
                // Node 1: enters -> +1
                // Eq: V1 - V0 = V_target.

                // Real battery equation: V1 - V0 = V_emf - I_branch * R_int
                // => V1 - V0 + R_int * I_branch = V_emf

                if (n1 !== -1) A.data[srcIdx][n1] = -1;
                if (n2 !== -1) A.data[srcIdx][n2] = 1;
                if (n1 !== -1) A.data[n1][srcIdx] = -1;
                if (n2 !== -1) A.data[n2][srcIdx] = 1;

                // V2 - V1 = E - I*RInt => V2 - V1 + I*RInt = E
                // Current I flows - to + inside source (N1 to N2).
                const rInt = parseFloat(c.properties.internalResistance) || 0;
                A.data[srcIdx][srcIdx] = rInt;

                // V2 - V1 = E - I*R -> V2 - V1 + I*R = E. Correct is +R if I is n1->n2. 
                // But wait, if I is n1->n2, it flows from - to + inside battery? 
                // Battery pumps charge from - to +. So yes, I flows - to +.
                // Load uses I from + to -.

                b[srcIdx] = parseFloat(c.properties.voltage);
            }
        });

        // Add small leakage to diagonals to avoid singular matrix if floating
        for (let i = 0; i < matrixSize; i++) {
            A.data[i][i] += 1e-9;
        }

        const x = Matrix.solve(A, b);

        // 3. Update Component States from Solution
        const getNodeV = (rIdx) => {
            if (rIdx === -1) return 0;
            return x[rIdx];
        };

        this.components.forEach(c => {
            if (c.state.burnt) {
                c.state.current = 0;
                c.state.power = 0;
                return;
            }

            const n1 = rootToMatrixIdx.get(find(keyToSetId.get(getTermKey(c, 0))));
            const n2 = rootToMatrixIdx.get(find(keyToSetId.get(getTermKey(c, 1))));
            const v1 = getNodeV(n1);
            const v2 = getNodeV(n2);

            if (c.type === 'battery') {
                const srcIdx = matrixSize + voltageSources.indexOf(c);
                const iBatt = x[srcIdx]; // Direction n1 -> n2
                const rInt = parseFloat(c.properties.internalResistance);

                // Terminal Voltage
                c.state.voltageDrop = v2 - v1;
                c.state.current = iBatt; // Signed current
                // Power dissipated in internal resistance? Or delivered?
                // User wants to know if things burn. Battery power usually load.
                // But internal heat = I^2 * rInt
                const pInt = iBatt * iBatt * rInt;
                c.state.power = pInt;

            } else {
                const V = v2 - v1;
                let R = parseFloat(c.properties.resistance);
                if (c.type === 'switch') R = c.properties.closed ? 0.01 : 1e9;
                if (c.type === 'diode') R = (c.state.voltageDrop > c.properties.forwardVoltage) ? 0.1 : 1e7;

                const I = V / R;
                c.state.current = I; // Signed
                c.state.voltageDrop = V;
                c.state.power = I * I * R;

                // Burn Logic
                if (['resistor', 'light', 'fan'].includes(c.type)) {
                    if (c.state.power > c.properties.powerRating * 1.5) { // 50% buffer before instant burn
                        c.state.burnt = true;
                        // Trigger visual refresh
                        this.updatePropertiesPanel();
                    }
                }
            }
            c.state.nodeIds = [n1, n2];
        });
    }

    loop() {
        // Run physics
        this.solveCircuit();

        // Render
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update Grid Background
        const gridSize = 40 * this.camera.zoom;
        const offX = -this.camera.x * this.camera.zoom + this.canvas.width / 2;
        const offY = -this.camera.y * this.camera.zoom + this.canvas.height / 2;

        this.canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        this.canvas.style.backgroundPosition = `${offX}px ${offY}px`;

        this.ctx.save();
        // Camera Transform
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y); // Move world opposite to camera

        this.wireDashOffset -= 1;

        // Draw Wires with Loop
        // Group wires by current flow if possible? No, independent draw is OK.
        // We know startComp and endComp coordinates. 
        // We also know connection nodes. 
        // But what is the current in THIS wire?
        // Wire connects node A and node B. Voltage A and B are known.
        // The wire itself is ideal (0 ohm). So current is undefined locally unless we track branch currents.
        // Our MNA only gives Component currents.
        // But we want to visualize flow.
        // Approximation: Flow is from higher Potential Node to lower Potential Node.
        // We can just use the Potential Difference of the nodes it connects.
        // Wait, if it's an ideal wire, Potential A = Potential B.
        // So we can't determine direction just from V.
        // We need branch currents. Complex in Node Analysis.
        // SHORTCUT: Just trace current from Source components outward? Hard.
        // ALTERNATIVE: Just animate "Active" wires. Wires connected to nodes with V > 0? No.
        // Let's just animate based on the average voltage of the node relative to ground? 
        // No, that doesn't show flow.

        // BETTER SHORTCUT for Visuals: 
        // Use component currents.
        // If a wire is connected to a component carrying current I, animate that wire with speed I.
        // A wire segment connects C1.T1 to C2.T2.
        // If C1 is a resistor with current I entering T1, then wire has current I leaving T1.
        // We can look at the component connected to the wire.

        for (let w of this.wires) {
            const startT = w.startComp.getAbsoluteTerminals().find(t => t.id === w.startTermId);
            const endT = w.endComp.getAbsoluteTerminals().find(t => t.id === w.endTermId);
            if (startT && endT) {
                this.ctx.beginPath();
                this.ctx.moveTo(startT.x, startT.y);
                this.ctx.lineTo(endT.x, endT.y);
                this.ctx.strokeStyle = '#64748b';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([]);
                this.ctx.stroke();

                // Current Flow Overlay
                // Determine current in this wire segment.
                // It's equal to the current flowing out of StartComp's terminal.
                // StartComp.state.current is magnitude? No effectively I through it.
                // We need to know direction relative to terminal.
                // Terminal 0 vs 1.
                // If current > 0, flow is 1->0 (conventional? No usually + to -).
                // In our model: I = (V_1 - V_0)/R. So if V1>V0, I>0. Flows 1->0 inside component?
                // R is passive. Current flows V_high -> V_low.
                // So if V1 > V0, current flows 1 -> 0 THROUGH component.
                // So at Terminal 1, current ENTERS component from wire.
                // So Wire current flows INTO T1.
                // So Wire direction (Target -> T1).

                // Let's simply take the max current of the two components it connects to as visual proxy.
                const i1 = Math.abs(w.startComp.state.current);
                const i2 = Math.abs(w.endComp.state.current);
                const flow = Math.max(i1, i2);

                if (flow > 0.001) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(startT.x, startT.y);
                    this.ctx.lineTo(endT.x, endT.y);
                    this.ctx.strokeStyle = '#facc15'; // Current color
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    // Speed prop to current
                    const speed = flow * 200;
                    this.ctx.lineDashOffset = -Date.now() / 1000 * speed;
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
        }

        // Draw Active Wire
        if (this.wireDrag) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#fbbf24'; // Active drag color
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.moveTo(this.wireDrag.startX, this.wireDrag.startY);
            this.ctx.lineTo(this.wireDrag.currX, this.wireDrag.currY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw Components
        for (let c of this.components) {
            c.draw(this.ctx);

            // Draw Terminals debug dots
            const terms = c.getAbsoluteTerminals();
            this.ctx.fillStyle = '#fff';
            for (let t of terms) {
                this.ctx.beginPath(); this.ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); this.ctx.fill();
            }

            if (c === this.selectedComponent) {
                this.ctx.strokeStyle = '#3b82f6';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(c.x - c.width / 2 - 5, c.y - c.height / 2 - 5, c.width + 10, c.height + 10);
            }
        }

        // Draw Hover Highlight
        if (this.hoveredTerminal) {
            this.ctx.beginPath();
            this.ctx.arc(this.hoveredTerminal.x, this.hoveredTerminal.y, 8, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#22c55e'; // Green
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.ctx.restore();

        if (this.selectedComponent && !this.selectedComponent.state.burnt) {
            // Update dynamic values in panel every frame or so to show results
            // We can just re-render the variable parts, but calling updatePropertiesPanel is easier
            // To avoid performance hit, maybe check if values changed significantly?
            // For simplicity, let's just call it if frameCount % 10 === 0
            if (!this.frameCount) this.frameCount = 0;
            this.frameCount++;
            if (this.frameCount % 5 === 0) {
                this.updatePropertiesPanel(true); // only stats
            }
        }

        requestAnimationFrame(() => this.loop());
    }
}


// Global hooks for UI
window.app = null;
window.onload = () => {
    window.app = new App();
};

window.updateCompProp = (id, key, val) => {
    const c = window.app.components.find(comp => comp.id === id);
    if (c) {
        c.properties[key] = parseFloat(val);
        window.app.updatePropertiesPanel();
    }
};

window.toggleSwitch = (id) => {
    const c = window.app.components.find(comp => comp.id === id);
    if (c) {
        c.properties.closed = !c.properties.closed;
        window.app.updatePropertiesPanel();
    }
};

window.repairComp = (id) => {
    const c = window.app.components.find(comp => comp.id === id);
    if (c) {
        c.state.burnt = false;
        c.state.power = 0;
        window.app.updatePropertiesPanel();
    }
};
