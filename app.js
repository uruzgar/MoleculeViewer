/**
 * 3D Molekül Görselleştirici
 * Three.js + PubChem API Integration
 */

// ============================================
// CPK Color Standards for Elements
// ============================================
const CPK_COLORS = {
    'H': 0xFFFFFF,  // Hydrogen - White
    'C': 0x909090,  // Carbon - Gray
    'N': 0x3050F8,  // Nitrogen - Blue
    'O': 0xFF0D0D,  // Oxygen - Red
    'F': 0x90E050,  // Fluorine - Green-Yellow
    'Cl': 0x1FF01F,  // Chlorine - Green
    'Br': 0xA62929,  // Bromine - Dark Red
    'I': 0x940094,  // Iodine - Purple
    'S': 0xFFFF30,  // Sulfur - Yellow
    'P': 0xFF8000,  // Phosphorus - Orange
    'B': 0xFFB5B5,  // Boron - Salmon
    'Si': 0xF0C8A0,  // Silicon - Beige
    'Fe': 0xE06633,  // Iron - Orange-Brown
    'Na': 0xAB5CF2,  // Sodium - Purple
    'K': 0x8F40D4,  // Potassium - Purple
    'Ca': 0x3DFF00,  // Calcium - Green
    'Mg': 0x8AFF00,  // Magnesium - Yellow-Green
    'Zn': 0x7D80B0,  // Zinc - Blue-Gray
    'Cu': 0xC88033,  // Copper - Copper
    'DEFAULT': 0xFF69B4 // Default - Pink
};

// Atom radii (Van der Waals radii, scaled)
const ATOM_RADII = {
    'H': 0.31,
    'C': 0.76,
    'N': 0.71,
    'O': 0.66,
    'F': 0.57,
    'Cl': 0.99,
    'Br': 1.14,
    'I': 1.33,
    'S': 1.05,
    'P': 1.07,
    'DEFAULT': 0.8
};

// ============================================
// Global Variables
// ============================================
let scene, camera, renderer, controls;
let moleculeGroup = null;
let floatingAtoms = [];
let animationId = null;
let isAnimating = true;

// DOM Elements
const canvas = document.getElementById('molecule-canvas');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsEl = document.getElementById('search-suggestions');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-message');
const infoPanel = document.getElementById('info-panel');
const closeBtn = document.getElementById('close-panel');
const toggleBtn = document.getElementById('toggle-panel');
const panelHeader = document.querySelector('.panel-header');

// ============================================
// Three.js Scene Setup
// ============================================
function initScene() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 15);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    scene.add(directionalLight2);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.minDistance = 3;
    controls.maxDistance = 50;

    // Handle resize
    window.addEventListener('resize', onWindowResize);

    // Create floating atoms
    createFloatingAtoms();

    // Start animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// Floating Atoms (Anti-Gravity Effect)
// ============================================
function createFloatingAtoms() {
    const elements = ['C', 'H', 'O', 'N', 'S', 'Cl'];
    const numAtoms = 60;

    for (let i = 0; i < numAtoms; i++) {
        const element = elements[Math.floor(Math.random() * elements.length)];
        const color = CPK_COLORS[element] || CPK_COLORS.DEFAULT;
        const radius = (ATOM_RADII[element] || ATOM_RADII.DEFAULT) * 0.5;

        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.8
        });

        const atom = new THREE.Mesh(geometry, material);

        // Random initial position
        atom.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 20
        );

        // Store animation data
        atom.userData = {
            element: element,
            originalPos: atom.position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            phase: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 0.5,
            isConverging: false,
            targetPos: null
        };

        scene.add(atom);
        floatingAtoms.push(atom);
    }
}

function animateFloatingAtoms() {
    const time = Date.now() * 0.001;

    floatingAtoms.forEach((atom, index) => {
        if (atom.userData.isConverging && atom.userData.targetPos) {
            // Converge to target position
            atom.position.lerp(atom.userData.targetPos, 0.08);

            // Fade out when close to target
            const dist = atom.position.distanceTo(atom.userData.targetPos);
            if (dist < 0.1) {
                atom.material.opacity = Math.max(0, atom.material.opacity - 0.05);
            }
        } else {
            // Float freely
            const phase = atom.userData.phase;
            const speed = atom.userData.floatSpeed;

            atom.position.x += Math.sin(time * speed + phase) * 0.01;
            atom.position.y += Math.cos(time * speed * 0.7 + phase) * 0.015;
            atom.position.z += Math.sin(time * speed * 0.5 + phase) * 0.008;

            // Add slight drift
            atom.position.add(atom.userData.velocity);

            // Boundary check - wrap around
            if (atom.position.x > 25) atom.position.x = -25;
            if (atom.position.x < -25) atom.position.x = 25;
            if (atom.position.y > 20) atom.position.y = -20;
            if (atom.position.y < -20) atom.position.y = 20;
            if (atom.position.z > 15) atom.position.z = -15;
            if (atom.position.z < -15) atom.position.z = 15;
        }
    });
}

function triggerConvergeAnimation(centerPoint = new THREE.Vector3(0, 0, 0)) {
    floatingAtoms.forEach((atom, index) => {
        atom.userData.isConverging = true;
        // Add some randomness to target
        atom.userData.targetPos = centerPoint.clone().add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            )
        );
    });

    // After convergence, hide floating atoms
    setTimeout(() => {
        floatingAtoms.forEach(atom => {
            atom.visible = false;
        });
    }, 2000);
}

function resetFloatingAtoms() {
    floatingAtoms.forEach(atom => {
        atom.visible = true;
        atom.material.opacity = 0.8;
        atom.userData.isConverging = false;
        atom.userData.targetPos = null;
        atom.position.copy(atom.userData.originalPos);
    });
}

// ============================================
// Animation Loop
// ============================================
function animate() {
    animationId = requestAnimationFrame(animate);

    if (isAnimating) {
        animateFloatingAtoms();
    }

    // Auto-rotate molecule if exists
    if (moleculeGroup && !controls.autoRotate) {
        moleculeGroup.rotation.y += 0.002;
    }

    controls.update();
    renderer.render(scene, camera);
}

// ============================================
// PubChem API Integration
// ============================================
const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

async function searchMolecule(name) {
    showLoading(true);
    hideError();

    try {
        // Step 1: Get CID from compound name
        const cidResponse = await fetch(
            `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`
        );

        if (!cidResponse.ok) {
            throw new Error('Molekül bulunamadı. Lütfen farklı bir isim deneyin.');
        }

        const cidData = await cidResponse.json();
        const cid = cidData.IdentifierList.CID[0];

        // Step 2: Get 3D conformer data
        const conformerResponse = await fetch(
            `${PUBCHEM_BASE}/compound/cid/${cid}/JSON?record_type=3d`
        );

        if (!conformerResponse.ok) {
            throw new Error('3D yapı verisi bulunamadı.');
        }

        const conformerData = await conformerResponse.json();

        // Step 3: Get properties
        const propsResponse = await fetch(
            `${PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`
        );

        let properties = {};
        if (propsResponse.ok) {
            const propsData = await propsResponse.json();
            properties = propsData.PropertyTable.Properties[0];
        }

        // Step 4: Try to get additional properties (boiling point)
        let boilingPoint = '-';
        try {
            const bpResponse = await fetch(
                `${PUBCHEM_BASE}/compound/cid/${cid}/property/BoilingPoint/JSON`
            );
            if (bpResponse.ok) {
                const bpData = await bpResponse.json();
                if (bpData.PropertyTable?.Properties?.[0]?.BoilingPoint) {
                    boilingPoint = bpData.PropertyTable.Properties[0].BoilingPoint + ' °C';
                }
            }
        } catch (e) {
            // Boiling point not available
        }

        // Parse and render molecule
        const moleculeData = parsePubChemData(conformerData);
        renderMolecule(moleculeData);

        // Update info panel
        updateInfoPanel({
            name: name,
            iupacName: properties.IUPACName || name,
            formula: properties.MolecularFormula || '-',
            weight: properties.MolecularWeight ? properties.MolecularWeight + ' g/mol' : '-',
            boilingPoint: boilingPoint,
            atomCount: moleculeData.atoms.length,
            bondCount: moleculeData.bonds.length,
            elements: moleculeData.elementCounts
        });

        showLoading(false);

    } catch (error) {
        showLoading(false);
        showError(error.message);
        console.error('Error fetching molecule:', error);
    }
}

// ============================================
// Autocomplete Logic
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchSuggestions(query) {
    if (query.length < 3) {
        suggestionsEl.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(query)}/json?limit=10`
        );

        if (response.ok) {
            const data = await response.json();
            const suggestions = data.dictionary_terms?.compound || [];
            displaySuggestions(suggestions);
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
        suggestionsEl.classList.remove('active');
        return;
    }

    suggestionsEl.innerHTML = suggestions
        .map(term => `<div class="suggestion-item" data-molecule="${term}">${term}</div>`)
        .join('');

    suggestionsEl.classList.add('active');
}

function parsePubChemData(data) {
    const compound = data.PC_Compounds[0];
    const atoms = [];
    const bonds = [];
    const elementCounts = {};

    // Parse atoms
    const atomElements = compound.atoms.element;
    const coords = compound.coords[0].conformers[0];
    const x = coords.x;
    const y = coords.y;
    const z = coords.z || x.map(() => 0); // Some molecules might not have z

    // Element number to symbol mapping
    const elementSymbols = {
        1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S',
        17: 'Cl', 35: 'Br', 53: 'I', 5: 'B', 14: 'Si', 11: 'Na',
        19: 'K', 20: 'Ca', 12: 'Mg', 26: 'Fe', 29: 'Cu', 30: 'Zn'
    };

    for (let i = 0; i < atomElements.length; i++) {
        const elementNum = atomElements[i];
        const symbol = elementSymbols[elementNum] || 'X';

        atoms.push({
            element: symbol,
            x: x[i],
            y: y[i],
            z: z[i] || 0
        });

        // Count elements
        elementCounts[symbol] = (elementCounts[symbol] || 0) + 1;
    }

    // Parse bonds
    if (compound.bonds) {
        const aid1 = compound.bonds.aid1;
        const aid2 = compound.bonds.aid2;
        const order = compound.bonds.order || aid1.map(() => 1);

        for (let i = 0; i < aid1.length; i++) {
            bonds.push({
                atom1: aid1[i] - 1, // Convert to 0-indexed
                atom2: aid2[i] - 1,
                order: order[i] || 1
            });
        }
    }

    return { atoms, bonds, elementCounts };
}

// ============================================
// Molecule Rendering
// ============================================
function renderMolecule(data) {
    // Clear existing molecule
    if (moleculeGroup) {
        scene.remove(moleculeGroup);
        moleculeGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    // Trigger converge animation
    triggerConvergeAnimation();

    moleculeGroup = new THREE.Group();

    // Calculate center of mass for centering
    let centerX = 0, centerY = 0, centerZ = 0;
    data.atoms.forEach(atom => {
        centerX += atom.x;
        centerY += atom.y;
        centerZ += atom.z;
    });
    centerX /= data.atoms.length;
    centerY /= data.atoms.length;
    centerZ /= data.atoms.length;

    // Create atoms
    const atomMeshes = [];
    data.atoms.forEach((atom, index) => {
        const color = CPK_COLORS[atom.element] || CPK_COLORS.DEFAULT;
        const radius = (ATOM_RADII[atom.element] || ATOM_RADII.DEFAULT) * 0.5;

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.2,
            roughness: 0.3,
            emissive: color,
            emissiveIntensity: 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            atom.x - centerX,
            atom.y - centerY,
            atom.z - centerZ
        );

        moleculeGroup.add(mesh);
        atomMeshes.push(mesh);
    });

    // Create bonds
    data.bonds.forEach(bond => {
        const atom1 = atomMeshes[bond.atom1];
        const atom2 = atomMeshes[bond.atom2];

        if (!atom1 || !atom2) return;

        createBond(atom1.position, atom2.position, bond.order, moleculeGroup);
    });

    // Add molecule to scene with delay for animation effect
    setTimeout(() => {
        scene.add(moleculeGroup);

        // Reset camera
        camera.position.set(0, 0, 15);
        controls.reset();

        // Scale molecule to fit view
        const box = new THREE.Box3().setFromObject(moleculeGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 8 / maxDim;
        moleculeGroup.scale.setScalar(Math.min(scale, 2));

    }, 1500);
}

function createBond(pos1, pos2, order, parent) {
    const direction = new THREE.Vector3().subVectors(pos2, pos1);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);

    // Bond radius and offset for multiple bonds
    const bondRadius = 0.08;
    const bondOffset = 0.2;

    // Create bond material
    const bondMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.3,
        roughness: 0.5
    });

    if (order === 1) {
        // Single bond
        createSingleBond(midpoint, direction, length, bondRadius, bondMaterial, parent);
    } else if (order === 2) {
        // Double bond
        const perpendicular = getPerpendicular(direction);
        const offset = perpendicular.multiplyScalar(bondOffset);

        createSingleBond(
            midpoint.clone().add(offset),
            direction,
            length,
            bondRadius * 0.8,
            bondMaterial,
            parent
        );
        createSingleBond(
            midpoint.clone().sub(offset),
            direction,
            length,
            bondRadius * 0.8,
            bondMaterial,
            parent
        );
    } else if (order === 3) {
        // Triple bond
        const perpendicular = getPerpendicular(direction);
        const offset = perpendicular.multiplyScalar(bondOffset);

        createSingleBond(midpoint, direction, length, bondRadius * 0.7, bondMaterial, parent);
        createSingleBond(
            midpoint.clone().add(offset),
            direction,
            length,
            bondRadius * 0.7,
            bondMaterial,
            parent
        );
        createSingleBond(
            midpoint.clone().sub(offset),
            direction,
            length,
            bondRadius * 0.7,
            bondMaterial,
            parent
        );
    }
}

function createSingleBond(position, direction, length, radius, material, parent) {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
    const bond = new THREE.Mesh(geometry, material);

    bond.position.copy(position);

    // Align cylinder with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
    );
    bond.setRotationFromQuaternion(quaternion);

    parent.add(bond);
}

function getPerpendicular(vector) {
    const v = vector.clone().normalize();

    // Find a vector not parallel to v
    let arbitrary = new THREE.Vector3(1, 0, 0);
    if (Math.abs(v.dot(arbitrary)) > 0.9) {
        arbitrary = new THREE.Vector3(0, 1, 0);
    }

    // Cross product gives perpendicular vector
    return new THREE.Vector3().crossVectors(v, arbitrary).normalize();
}

// ============================================
// UI Updates
// ============================================
function updateInfoPanel(data) {
    document.getElementById('molecule-name').textContent =
        data.name.charAt(0).toUpperCase() + data.name.slice(1);
    document.getElementById('iupac-name').textContent = data.iupacName;
    document.getElementById('molecular-formula').innerHTML = formatFormula(data.formula);
    document.getElementById('molecular-weight').textContent = data.weight;
    document.getElementById('boiling-point').textContent = data.boilingPoint;
    document.getElementById('atom-count').textContent = data.atomCount;
    document.getElementById('bond-count').textContent = data.bondCount;

    // Element distribution
    const distEl = document.getElementById('element-distribution');
    distEl.innerHTML = '';

    Object.entries(data.elements).forEach(([element, count]) => {
        const badge = document.createElement('div');
        badge.className = 'element-badge';

        const color = CPK_COLORS[element] || CPK_COLORS.DEFAULT;
        const colorHex = '#' + color.toString(16).padStart(6, '0');

        badge.innerHTML = `
            <span class="color-dot" style="background: ${colorHex}; ${element === 'H' ? 'border: 1px solid #333;' : ''}"></span>
            <span>${element}: ${count}</span>
        `;
        distEl.appendChild(badge);
    });

    // Show panel
    infoPanel.classList.remove('hidden');

    // Auto-minimize on mobile
    if (window.innerWidth <= 768) {
        infoPanel.classList.add('minimized');
    } else {
        infoPanel.classList.remove('minimized');
    }

    setTimeout(() => {
        infoPanel.classList.add('visible');
    }, 100);
}

function formatFormula(formula) {
    // Convert numbers to subscript
    return formula.replace(/(\d+)/g, '<sub>$1</sub>');
}

function showLoading(show) {
    loadingEl.classList.toggle('hidden', !show);
}

function showError(message) {
    errorEl.textContent = '⚠️ ' + message;
    errorEl.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    errorEl.classList.add('hidden');
}

function hideInfoPanel() {
    infoPanel.classList.remove('visible');
    setTimeout(() => {
        infoPanel.classList.add('hidden');
    }, 400);
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Search button click
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchMolecule(query);
        }
    });

    // Enter key in search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                suggestionsEl.classList.remove('active');
                searchMolecule(query);
            }
        }
    });

    // Close panel button
    closeBtn.addEventListener('click', () => {
        hideInfoPanel();

        // Clear molecule and reset floating atoms
        if (moleculeGroup) {
            scene.remove(moleculeGroup);
            moleculeGroup = null;
        }
        resetFloatingAtoms();
    });

    // Panel toggle button
    const togglePanel = () => {
        infoPanel.classList.toggle('minimized');
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
    });

    panelHeader.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            togglePanel();
        }
    });

    // Autocomplete on input
    const debouncedFetch = debounce((e) => {
        const query = e.target.value.trim();
        fetchSuggestions(query);
    }, 300);

    searchInput.addEventListener('input', debouncedFetch);

    // Quick search suggestions on focus
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length === 0) {
            suggestionsEl.innerHTML = `
                <div class="suggestion-item" data-molecule="Benzene">Benzene (Benzen)</div>
                <div class="suggestion-item" data-molecule="Ethanol">Ethanol (Etanol)</div>
                <div class="suggestion-item" data-molecule="Caffeine">Caffeine (Kafein)</div>
                <div class="suggestion-item" data-molecule="Aspirin">Aspirin</div>
                <div class="suggestion-item" data-molecule="Glucose">Glucose (Glukoz)</div>
                <div class="suggestion-item" data-molecule="Methane">Methane (Metan)</div>
                <div class="suggestion-item" data-molecule="Acetone">Acetone (Aseton)</div>
                <div class="suggestion-item" data-molecule="Acetic acid">Acetic Acid (Asetik Asit)</div>
            `;
            suggestionsEl.classList.add('active');
        } else if (searchInput.value.trim().length >= 3) {
            fetchSuggestions(searchInput.value.trim());
        }
    });

    // Handle suggestion clicks
    suggestionsEl.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            const molecule = item.dataset.molecule;
            searchInput.value = molecule;
            suggestionsEl.classList.remove('active');
            searchMolecule(molecule);
        }
    });

    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsEl.classList.remove('active');
        }
    });
}

// ============================================
// Initialize Application
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initScene();
    initEventListeners();

    console.log('🧪 3D Molekül Görselleştirici başlatıldı!');
    console.log('Örnek moleküller: Benzene, Ethanol, Caffeine, Aspirin, Glucose');
});
