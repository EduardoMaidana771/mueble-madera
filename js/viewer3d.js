/* 3D viewer (Three.js r147 UMD + OrbitControls from examples/js).
   Scene units are metres; model data is in mm and scaled by 0.001. */
(function (root) {
  'use strict';

  const TEX_MM = 600;        // one texture tile covers 600 × 600 mm
  const TEX_PX = 1024;
  const OPEN_ANGLE = 100 * Math.PI / 180;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Finger-joint panel: lamellas 40–60 mm wide along the grain, varying tone,
  // fine grain lines and occasional finger-joint zigzags across a lamella.
  function fingerJointCanvas(seed) {
    const r = rng(seed);
    const c = document.createElement('canvas');
    c.width = c.height = TEX_PX;
    const g = c.getContext('2d');
    const pxmm = TEX_PX / TEX_MM;
    const widths = [];
    let sum = 0;
    while (sum < TEX_PX - 40 * pxmm) {
      const w = Math.round((40 + r() * 20) * pxmm);
      widths.push(w); sum += w;
    }
    widths[widths.length - 1] += TEX_PX - sum;
    let y = 0;
    widths.forEach(function (w) {
      const nJ = r() < 0.55 ? 1 : (r() < 0.5 ? 2 : 0);
      const joints = [];
      for (let k = 0; k < nJ; k++) joints.push(Math.round((0.1 + 0.8 * r()) * TEX_PX));
      joints.sort(function (a, b) { return a - b; });
      const bounds = [0].concat(joints).concat([TEX_PX]);
      const tones = bounds.slice(0, -1).map(function () {
        return { h: 28 + r() * 8, s: 40 + r() * 14, l: 70 + r() * 11 };
      });
      if (tones.length > 1) tones[tones.length - 1] = tones[0]; // wraps seamlessly along x
      for (let i = 0; i < bounds.length - 1; i++) {
        const t = tones[i];
        g.fillStyle = 'hsl(' + t.h + ',' + t.s + '%,' + t.l + '%)';
        g.fillRect(bounds[i], y, bounds[i + 1] - bounds[i], w);
      }
      // grain lines along x
      const nLines = Math.round(w / 3);
      for (let k = 0; k < nLines; k++) {
        const ly = y + r() * w;
        g.strokeStyle = 'rgba(120,80,40,' + (0.04 + r() * 0.1) + ')';
        g.lineWidth = 0.6 + r() * 1.4;
        g.beginPath();
        const amp = r() * 2.5, ph = r() * 6.28, fr = 0.004 + r() * 0.01;
        for (let x = 0; x <= TEX_PX; x += 16) {
          const yy = ly + Math.sin(x * fr + ph) * amp;
          if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
        g.stroke();
      }
      // finger-joint zigzags
      joints.forEach(function (jx) {
        g.strokeStyle = 'rgba(90,55,25,0.55)';
        g.lineWidth = 1.4;
        g.beginPath();
        const pitch = 6 * pxmm, amp = 5 * pxmm;
        let up = true;
        for (let yy = y; yy <= y + w; yy += pitch / 2) {
          const xx = jx + (up ? -amp : amp);
          if (yy === y) g.moveTo(xx, yy); else g.lineTo(xx, yy);
          up = !up;
        }
        g.stroke();
      });
      // glue line between lamellas
      g.fillStyle = 'rgba(80,50,20,0.28)';
      g.fillRect(0, y, TEX_PX, 1.2);
      y += w;
    });
    return c;
  }

  function plyCanvas(seed, base, line) {
    const r = rng(seed);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 160; k++) {
      const y = r() * 512;
      g.strokeStyle = line.replace('A', (0.05 + r() * 0.12).toFixed(3));
      g.lineWidth = 0.5 + r() * 1.5;
      g.beginPath();
      const amp = 2 + r() * 8, ph = r() * 6.28, fr = 0.006 + r() * 0.012;
      for (let x = 0; x <= 512; x += 8) {
        const yy = y + Math.sin(x * fr + ph) * amp;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.stroke();
    }
    return c;
  }

  function Viewer(container, overlay) {
    const THREE = root.THREE;
    this.THREE = THREE;
    this.container = container;
    this.overlay = overlay;
    this.open = false;
    this.showDims = false;
    this.movers = [];
    this.labels = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    this.controls = new THREE.OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8d7f6e, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(-2.5, 4, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(3, 2, -2);
    this.scene.add(fill);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: 0xd9d2c7, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    this.floor = floor;
    this.scene.add(floor);

    this.materials = this.makeMaterials();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.dimGroup = new THREE.Group();
    this.scene.add(this.dimGroup);

    const self = this;
    this.resize();
    if (root.ResizeObserver) new root.ResizeObserver(function () { self.resize(); }).observe(container);
    else root.addEventListener('resize', function () { self.resize(); });
    this.clock = new THREE.Clock();
    (function loop() {
      root.requestAnimationFrame(loop);
      if (!container.offsetParent) return;
      self.tick();
    })();
  }

  Viewer.prototype.makeMaterials = function () {
    const THREE = this.THREE;
    function tex(canvas) {
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    }
    const fj = [11, 23, 37].map(function (s) {
      return new THREE.MeshStandardMaterial({ map: tex(fingerJointCanvas(s)), roughness: 0.62, metalness: 0 });
    });
    return {
      fj: fj,
      euc3: new THREE.MeshStandardMaterial({ map: tex(plyCanvas(5, '#ead9bd', 'rgba(150,110,60,A)')), roughness: 0.75 }),
      ced4: new THREE.MeshStandardMaterial({ map: tex(plyCanvas(9, '#b86b4b', 'rgba(90,35,20,A)')), roughness: 0.7 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xa9aeb3, metalness: 0.75, roughness: 0.32 }),
      black: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.2, roughness: 0.55 }),
      edge: new THREE.LineBasicMaterial({ color: 0x3b2a1a, transparent: true, opacity: 0.35 }),
      dim: new THREE.LineBasicMaterial({ color: 0x0b57d0 })
    };
  };

  // BoxGeometry faces: +x,-x (u=z,v=y) · +y,-y (u=x,v=z) · +z,-z (u=x,v=y)
  const FACE_AXES = [['z', 'y'], ['z', 'y'], ['x', 'z'], ['x', 'z'], ['x', 'y'], ['x', 'y']];

  Viewer.prototype.boxGeometry = function (e) {
    const THREE = this.THREE;
    const d = { x: e.x1 - e.x0, y: e.y1 - e.y0, z: e.z1 - e.z0 };
    const geo = new THREE.BoxGeometry(d.x, d.y, d.z);
    if (!e.grain) return geo;
    const uv = geo.attributes.uv;
    const r = rng(hash(e.id));
    const ou = r(), ov = r();
    const T = e.mat === 'fj' ? TEX_MM : 900;
    for (let f = 0; f < 6; f++) {
      const ax = FACE_AXES[f];
      const su = d[ax[0]], sv = d[ax[1]];
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        const u = uv.getX(i), v = uv.getY(i);
        let U, V;
        if (ax[1] === e.grain) { U = v * sv / T; V = u * su / T; } else { U = u * su / T; V = v * sv / T; }
        uv.setXY(i, U + ou, V + ov);
      }
    }
    uv.needsUpdate = true;
    return geo;
  };

  Viewer.prototype.materialFor = function (e) {
    if (e.mat === 'fj') return this.materials.fj[hash(e.id) % 3];
    return this.materials[e.mat] || this.materials.metal;
  };

  Viewer.prototype.setModel = function (m) {
    const THREE = this.THREE;
    this.model = m;
    const rootG = this.root;
    while (rootG.children.length) {
      const ch = rootG.children.pop();
      ch.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    }
    const S = 0.001;
    rootG.scale.set(S, S, S);
    rootG.position.set(-m.W / 2 * S, 0, -m.Dc / 2 * S);
    const groups = {};
    this.movers = m.movables.map(function (mv) {
      const g = new THREE.Group();
      if (mv.type === 'hinged') g.position.set(mv.pivotX, 0, mv.pivotZ);
      rootG.add(g);
      groups[mv.id] = g;
      return { mv: mv, g: g, t: this.open ? 1 : 0 };
    }, this);
    const self = this;
    m.elements.forEach(function (e) {
      const mesh = new THREE.Mesh(self.boxGeometry(e), self.materialFor(e));
      const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2, cz = (e.z0 + e.z1) / 2;
      const parent = e.group && groups[e.group] ? groups[e.group] : rootG;
      const off = parent === rootG ? { x: 0, z: 0 } : { x: parent.position.x, z: parent.position.z };
      mesh.position.set(cx - off.x, cy, cz - off.z);
      if (e.mat === 'fj' || e.mat === 'euc3' || e.mat === 'ced4') {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), self.materials.edge);
        mesh.add(edges);
      }
      parent.add(mesh);
    });
    this.applyMovers(true);
    this.buildDims();
    this.preset(this.lastPreset || 'persp');
  };

  Viewer.prototype.applyMovers = function (snap) {
    const target = this.open ? 1 : 0;
    let moving = false;
    this.movers.forEach(function (o) {
      if (snap) o.t = target;
      else if (Math.abs(o.t - target) > 1e-3) { o.t += (target - o.t) * 0.14; moving = true; } else o.t = target;
      const mv = o.mv, t = o.t;
      if (mv.type === 'hinged') o.g.rotation.y = (mv.hinge === 'left' ? -1 : 1) * OPEN_ANGLE * t;
      else if (mv.type === 'sliding') o.g.position.x = mv.dx * t;
      else if (mv.type === 'drawer') o.g.position.z = mv.dz * t;
    });
    return moving;
  };

  Viewer.prototype.setOpen = function (v) { this.open = !!v; };
  Viewer.prototype.setDims = function (v) {
    this.showDims = !!v;
    this.dimGroup.visible = this.showDims;
    this.overlay.style.display = this.showDims ? '' : 'none';
  };

  Viewer.prototype.buildDims = function () {
    const THREE = this.THREE;
    const m = this.model, S = 0.001;
    const g = this.dimGroup;
    while (g.children.length) g.remove(g.children[0]);
    this.overlay.innerHTML = '';
    this.labels = [];
    const x0 = -m.W / 2 * S, x1 = m.W / 2 * S;
    const front = (m.Dc / 2 + (m.doors.some(function (d) { return d.type === 'hinged'; }) ? 22 : 0)) * S;
    const back = (-m.Dc / 2 - m.tb) * S;
    const H = m.H * S, off = 0.08, tick = 0.03;
    const self = this;
    function seg(a, b) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2])]);
      g.add(new THREE.Line(geo, self.materials.dim));
    }
    function label(pos, text) {
      const el = document.createElement('span');
      el.className = 'dim-label';
      el.textContent = text;
      self.overlay.appendChild(el);
      self.labels.push({ el: el, p: new THREE.Vector3(pos[0], pos[1], pos[2]) });
    }
    // width, along the floor in front
    seg([x0, 0.002, front + off], [x1, 0.002, front + off]);
    seg([x0, 0.002, front + off - tick], [x0, 0.002, front + off + tick]);
    seg([x1, 0.002, front + off - tick], [x1, 0.002, front + off + tick]);
    label([0, 0.002, front + off], 'Ancho ' + m.W + ' mm');
    // height, left front edge
    seg([x0 - off, 0, front], [x0 - off, H, front]);
    seg([x0 - off - tick, 0, front], [x0 - off + tick, 0, front]);
    seg([x0 - off - tick, H, front], [x0 - off + tick, H, front]);
    label([x0 - off, H / 2, front], 'Alto ' + m.H + ' mm');
    // depth, top right
    seg([x1 + off, H, back], [x1 + off, H, front]);
    seg([x1 + off, H - tick, back], [x1 + off, H + tick, back]);
    seg([x1 + off, H - tick, front], [x1 + off, H + tick, front]);
    label([x1 + off, H, (back + front) / 2], 'Prof. ' + Math.round((front - back) / S) + ' mm');
    this.dimGroup.visible = this.showDims;
    this.overlay.style.display = this.showDims ? '' : 'none';
  };

  Viewer.prototype.preset = function (name) {
    const m = this.model;
    if (!m) return;
    this.lastPreset = name;
    const S = 0.001;
    const H = m.H * S, W = m.W * S;
    const fov = this.camera.fov * Math.PI / 180;
    const size = Math.max(H, W / Math.max(this.camera.aspect, 0.5));
    const dist = size / 2 / Math.tan(fov / 2) * 1.25 + m.Dc * S;
    const target = new this.THREE.Vector3(0, H / 2, 0);
    let pos;
    if (name === 'front') pos = [0, H / 2, dist];
    else if (name === 'side') pos = [dist, H / 2, 0.05];
    else pos = [-dist * 0.62, H * 0.82, dist * 0.8];
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.controls.target.copy(target);
    this.controls.update();
  };

  Viewer.prototype.setTheme = function (dark) {
    this.renderer.setClearColor(dark ? 0x1f1d1a : 0xf3efe8, 1);
    this.floor.material.color.set(dark ? 0x3a3631 : 0xdcd5ca);
  };

  Viewer.prototype.resize = function () {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 520;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  Viewer.prototype.tick = function () {
    this.applyMovers(false);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.showDims && this.labels.length) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const v = new this.THREE.Vector3();
      this.labels.forEach(function (l) {
        v.copy(l.p).project(this.camera);
        const behind = v.z > 1;
        l.el.style.display = behind ? 'none' : '';
        l.el.style.transform = 'translate(-50%,-50%) translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px)';
      }, this);
    }
  };

  root.RoperoViewer = {
    supported: function () { return !!(root.THREE && root.THREE.OrbitControls); },
    create: function (container, overlay) { return new Viewer(container, overlay); }
  };
})(typeof self !== 'undefined' ? self : this);
