'use client';
import { useEffect, useRef, useState } from 'react';
import { frameDue, settle, voxelFrameChanged, type VoxelFrame } from '../lab/render-policy';
const silhouette = [
  '00000000011111111000',
  '00000000111111111100',
  '00000000110111111100',
  '00000000111111111100',
  '00000000111111111100',
  '00000000111110000000',
  '00000000111111110000',
  '00000000111110000000',
  '10000001111110000000',
  '11000011111110000000',
  '11100111111111100000',
  '11111111111100100000',
  '01111111111100000000',
  '00111111111100000000',
  '00011111111000000000',
  '00001111110000000000',
  '00000110110000000000',
  '00000110011000000000',
  '00000111001110000000',
];
export default function CinematicScene() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false,
      started = false;
    let dispose = () => {};
    function initialize() {
      if (started || disposed) return;
      started = true;
      Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ])
        .then(([T, { RoundedBoxGeometry }, { RoomEnvironment }]) => {
          if (disposed || !host.current) return;
          const el = host.current;
          let mobile = innerWidth <= 700;
          let reduced =
            matchMedia('(prefers-reduced-motion:reduce)').matches ||
            document.documentElement.classList.contains('motion-quiet');
          let renderer: InstanceType<typeof T.WebGLRenderer>;
          try {
            renderer = new T.WebGLRenderer({
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
            });
          } catch {
            return;
          }
          renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
          renderer.setSize(el.clientWidth, el.clientHeight);
          renderer.setClearColor(0, 0);
          renderer.toneMapping = T.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.05;
          el.appendChild(renderer.domElement);
          const scene = new T.Scene();
          const camera = new T.PerspectiveCamera(
            mobile ? 41 : 34,
            el.clientWidth / el.clientHeight,
            0.1,
            120,
          );
          camera.position.set(0, 1.2, 25);
          camera.lookAt(0, 0, 0);
          const pmrem = new T.PMREMGenerator(renderer),
            room = new RoomEnvironment();
          const environment = pmrem.fromScene(room, 0.015);
          scene.environment = environment.texture;
          room.dispose();
          pmrem.dispose();
          const chrome = new T.MeshPhysicalMaterial({
            color: '#c6d0cb',
            metalness: 0.82,
            roughness: 0.24,
            clearcoat: 1,
            clearcoatRoughness: 0.12,
            envMapIntensity: 1.25,
          });
          const cube = new RoundedBoxGeometry(0.222, 0.222, 0.222, 1, 0.025);
          const points: { x: number; y: number; z: number; s: number }[] = [];
          silhouette.forEach((row, y) =>
            [...row].forEach((cell, x) => {
              if (cell === '1') {
                const depth = y > 15 ? 2 : y > 7 ? 4 : 3;
                for (let d = 0; d < depth; d++)
                  for (let sx = 0; sx < 2; sx++)
                    for (let sy = 0; sy < 2; sy++)
                      points.push({
                        x: (x - 9.5) * 0.48 + sx * 0.24,
                        y: (9 - y) * 0.48 - sy * 0.24,
                        z: (d - (depth - 1) / 2) * 0.46,
                        s: Math.sin(x * 123.21 + y * 17.43 + d * 23.12 + sx + sy * 3) * 0.5 + 0.5,
                      });
              }
            }),
          );
          const mesh = new T.InstancedMesh(cube, chrome, points.length);
          mesh.frustumCulled = false;
          const model = new T.Group();
          model.add(mesh);
          scene.add(model);
          const object = new T.Object3D(),
            color = new T.Color();
          points.forEach((p, i) =>
            mesh.setColorAt(
              i,
              color.set(p.s > 0.98 ? '#d4fc73' : p.s > 0.25 ? '#a7beb0' : '#536c5d'),
            ),
          );
          const light = new T.DirectionalLight('#e9fff5', 4.5);
          light.position.set(-8, 12, 12);
          scene.add(light);
          const edge = new T.DirectionalLight('#c5ff48', 6);
          edge.position.set(7, 3, -8);
          scene.add(edge);
          scene.add(new T.HemisphereLight('#eaffef', '#09140d', 1.4));
          const spotlight = new T.PointLight('#d4ff68', 80, 25, 2);
          spotlight.position.set(3, -4, 3);
          scene.add(spotlight);
          const rig = new T.Group();
          scene.add(rig);
          const rings: InstanceType<typeof T.Mesh>[] = [];
          const ringMats: InstanceType<typeof T.MeshBasicMaterial>[] = [];
          for (let i = 0; i < 3; i++) {
            const mat = new T.MeshBasicMaterial({
              color: i === 2 ? '#d5ff71' : '#91baa0',
              transparent: true,
              opacity: i === 2 ? 0.4 : 0.12,
            });
            const ring = new T.Mesh(
              new T.TorusGeometry(5.8 + i * 0.38, i === 2 ? 0.016 : 0.009, 6, 160),
              mat,
            );
            ring.rotation.set(Math.PI / 2 + i * 0.22, 0.2 + i * 0.1, 0.35);
            rings.push(ring);
            ringMats.push(mat);
            rig.add(ring);
          }
          const scanMat = new T.MeshBasicMaterial({
            color: '#caff63',
            transparent: true,
            opacity: 0.24,
            side: T.DoubleSide,
            depthWrite: false,
            blending: T.AdditiveBlending,
          });
          const scan = new T.Mesh(new T.PlaneGeometry(9.5, 0.025), scanMat);
          model.add(scan);
          const dustCount = mobile ? 200 : 650,
            dustCoords = new Float32Array(dustCount * 3);
          for (let i = 0; i < dustCount; i++) {
            dustCoords[i * 3] = Math.sin(i * 74.31) * 22;
            dustCoords[i * 3 + 1] = Math.cos(i * 19.13) * 14;
            dustCoords[i * 3 + 2] = Math.sin(i * 3.21) * 15;
          }
          const dustGeo = new T.BufferGeometry();
          dustGeo.setAttribute('position', new T.BufferAttribute(dustCoords, 3));
          const dustMat = new T.PointsMaterial({
            size: 0.022,
            color: '#c8f291',
            transparent: true,
            opacity: 0.5,
            blending: T.AdditiveBlending,
            depthWrite: false,
          });
          const dust = new T.Points(dustGeo, dustMat);
          scene.add(dust);
          const letters = [
            '11110010001010001',
            '10001011011010010',
            '10001010101010100',
            '11110010001011000',
            '10001010001010100',
            '10001010001010010',
            '11110010001010001',
          ];
          const mark: { x: number; y: number }[] = [];
          letters.forEach((r, y) =>
            [...r].forEach((v, x) => {
              if (v === '1')
                for (let a = 0; a < 2; a++)
                  for (let b = 0; b < 2; b++)
                    mark.push({ x: (x - 8) * 0.48 + a * 0.24, y: (3 - y) * 0.48 - b * 0.24 });
            }),
          );
          let previousVoxels: VoxelFrame | null = null;
          let desktopOpen = !!document.body.dataset.bmkDesktop;
          let mode = 0,
            wire = false,
            px = 0,
            py = 0,
            drag = 0,
            dragTarget = 0,
            down = false,
            lastX = 0,
            burst = 0,
            entrance = 1,
            explode = 1,
            logo = 0,
            clock = 0,
            raf = 0,
            last = 0,
            overlayOpen = false;
          function state(value: string) {
            if (el.dataset.renderState !== value) el.dataset.renderState = value;
          }
          function request() {
            if (
              !raf &&
              !document.hidden &&
              !overlayOpen &&
              !desktopOpen &&
              scrollY / innerHeight <= 1.65
            ) {
              state('rendering');
              raf = requestAnimationFrame(draw);
            }
          }
          const visibility = () => {
            if (document.hidden || overlayOpen || desktopOpen) {
              cancelAnimationFrame(raf);
              raf = 0;
              state('suspended');
            } else {
              last = 0;
              request();
            }
          };
          const overlay = (e: Event) => {
            overlayOpen = (e as CustomEvent).detail;
            visibility();
          };
          const desktopFocus = (e: Event) => {
            desktopOpen = Boolean((e as CustomEvent).detail);
            visibility();
          };
          const scrolling = () => {
            const scroll = scrollY / innerHeight;
            el.style.opacity = String(Math.max(0, 1 - Math.max(0, scroll - 0.45) * 0.95));
            if (scroll > 1.65) {
              cancelAnimationFrame(raf);
              raf = 0;
              state('suspended');
            } else request();
          };
          const pointer = (e: PointerEvent) => {
            if (desktopOpen || overlayOpen || document.hidden || scrollY / innerHeight > 1.65)
              return;
            request();
            px = e.clientX / innerWidth - 0.5;
            py = e.clientY / innerHeight - 0.5;
            if (down) {
              dragTarget += (e.clientX - lastX) * 0.007;
              lastX = e.clientX;
            }
          };
          const start = (e: PointerEvent) => {
            if (e.target instanceof Element && e.target.closest('[data-scene-drag]')) {
              down = true;
              lastX = e.clientX;
            }
          };
          const end = () => {
            down = false;
          };
          const modeEvent = (e: Event) => {
            const v = (e as CustomEvent).detail;
            mode = v === 'explode' ? 1 : v === 'mark' ? 2 : 0;
            burst = 1;
            request();
          };
          const settings = (e: Event) => {
            const v = (e as CustomEvent).detail;
            if (v.wire !== undefined) {
              wire = v.wire;
              chrome.wireframe = wire;
              chrome.roughness = wire ? 0.5 : 0.24;
            }
            if (v.reduced !== undefined) reduced = v.reduced;
            if (v.tone) {
              const c = v.tone === 'ice' ? '#a3e4ff' : v.tone === 'amber' ? '#ffd496' : '#c5ff48';
              edge.color.set(c);
              spotlight.color.set(c);
              scanMat.color.set(c);
              ringMats[2].color.set(c);
            }
            if (v.rotate) dragTarget += v.rotate;
            if (v.reset) {
              dragTarget = 0;
              burst = 1;
            }
            request();
          };
          addEventListener('pointermove', pointer, { passive: true });
          addEventListener('pointerdown', start);
          addEventListener('pointerup', end);
          addEventListener('pointercancel', end);
          addEventListener('bmk-scene-mode', modeEvent);
          addEventListener('bmk-scene-settings', settings);
          const resize = new ResizeObserver(() => {
            mobile = innerWidth <= 700;
            renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
            renderer.setSize(el.clientWidth, el.clientHeight);
            camera.aspect = el.clientWidth / el.clientHeight;
            camera.fov = mobile ? 41 : 34;
            camera.updateProjectionMatrix();
            request();
          });
          resize.observe(el);
          function draw(t: number) {
            raf = 0;
            const scroll = scrollY / innerHeight;
            if (document.hidden || overlayOpen || desktopOpen || scroll > 1.65) return;
            if (!frameDue(t, last, mobile)) {
              request();
              return;
            }
            const dt = Math.min((t - last) / 1000, 0.045) || 0.016;
            last = t;
            if (!reduced) clock += dt;
            const ease = 1 - Math.exp(-dt * 4);
            entrance = reduced ? 0 : entrance * Math.exp(-dt * 1.8);
            const flow = reduced ? 0 : Math.min(1, Math.max(0, (scroll - 0.08) / 1.05));
            explode += (Math.max(mode === 1 ? 1 : 0, flow, entrance) - explode) * ease;
            logo += ((mode === 2 ? 1 : 0) - logo) * ease;
            drag += (dragTarget - drag) * ease;
            burst = settle(burst * Math.exp(-dt * 3), 0);
            explode = settle(explode, Math.max(mode === 1 ? 1 : 0, flow, entrance));
            if (entrance < 0.001) entrance = 0;
            logo = settle(logo, mode === 2 ? 1 : 0);
            model.position.set(
              mobile ? 0 : 4.25 + logo * 0.4 - explode * 3.5,
              mobile ? -2.15 : 0,
              0,
            );
            model.scale.setScalar(mobile ? 0.66 : 1.17);
            model.rotation.set(
              0.07 + (reduced ? 0 : py * 0.1),
              -0.4 +
                logo * 0.28 +
                drag +
                (reduced ? 0 : Math.sin(clock * 0.25) * 0.1 + px * 0.12) +
                flow * 0.6,
              -0.06 + logo * 0.04 + (reduced ? 0 : Math.sin(clock * 0.4) * 0.018),
            );
            const breath = reduced ? 0 : Math.sin(clock * 0.7) * 0.06;
            model.position.y += breath;
            const voxelFrame = { explode, logo, burst, clock };
            if (voxelFrameChanged(previousVoxels, voxelFrame)) {
              points.forEach((p, i) => {
                const a = i * 2.39996,
                  r = 5 + ((i % 53) / 53) * 7;
                const m = mark[i % mark.length],
                  mz = (Math.floor(i / mark.length) - 2) * 0.13;
                const x = p.x + (m.x - p.x) * logo,
                  y = p.y + (m.y - p.y) * logo,
                  z = p.z + (mz - p.z) * logo;
                const shock = Math.sin(i * 0.14 + clock * 2) * burst * 0.08;
                object.position.set(
                  x + (Math.cos(a + clock * 0.035) * r - x) * explode + shock,
                  y + (Math.sin(a) * r * 0.62 - y) * explode,
                  z + (Math.sin(i * 7.19) * 5 - z) * explode,
                );
                object.rotation.set(
                  explode * p.s * 4,
                  explode * (p.s * 5 + clock * 0.09),
                  explode * p.s * 3,
                );
                object.scale.setScalar((1 - explode * 0.45) * (1 + shock));
                object.updateMatrix();
                mesh.setMatrixAt(i, object.matrix);
              });
              mesh.instanceMatrix.needsUpdate = true;
              previousVoxels = voxelFrame;
            }
            rig.position.set(model.position.x, mobile ? -6.5 : -4.5, 0);
            rig.scale.setScalar(mobile ? 0.55 : 0.82);
            rig.rotation.y = reduced ? 0 : clock * 0.08;
            rings.forEach((ring, i) => {
              ring.rotation.z = (reduced ? 0 : clock * (i % 2 ? -0.035 : 0.04)) + i * 0.3;
              ringMats[i].opacity = (i === 2 ? 0.35 : 0.12) * (1 - explode);
            });
            scan.position.set(0, reduced ? 0 : Math.sin(clock * 0.5) * 4.6, 1);
            scanMat.opacity = (wire ? 0.06 : 0.18) * (1 - explode);
            dust.rotation.y = reduced ? 0 : clock * 0.015;
            renderer.render(scene, camera);
            if (
              !reduced ||
              Math.abs(explode - (mode === 1 ? 1 : 0)) > 0.001 ||
              Math.abs(logo - (mode === 2 ? 1 : 0)) > 0.001 ||
              Math.abs(dragTarget - drag) > 0.001
            )
              request();
            else state('settled');
          }
          document.addEventListener('visibilitychange', visibility);
          addEventListener('scroll', scrolling, { passive: true });
          addEventListener('bmk-overlay', overlay);
          addEventListener('bmk-desktop-focus', desktopFocus);
          scrolling();
          setReady(true);
          dispose = () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('visibilitychange', visibility);
            removeEventListener('scroll', scrolling);
            removeEventListener('bmk-overlay', overlay);
            removeEventListener('bmk-desktop-focus', desktopFocus);
            resize.disconnect();
            removeEventListener('pointermove', pointer);
            removeEventListener('pointerdown', start);
            removeEventListener('pointerup', end);
            removeEventListener('pointercancel', end);
            removeEventListener('bmk-scene-mode', modeEvent);
            removeEventListener('bmk-scene-settings', settings);
            cube.dispose();
            chrome.dispose();
            rings.forEach((r) => r.geometry.dispose());
            ringMats.forEach((m) => m.dispose());
            scan.geometry.dispose();
            scanMat.dispose();
            dustGeo.dispose();
            dustMat.dispose();
            environment.dispose();
            renderer.dispose();
            renderer.domElement.remove();
          };
        })
        .catch(() => {});
    }
    const hero = document.querySelector('.cinema-hero');
    const gate = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initialize();
          gate.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    if (hero) gate.observe(hero);
    else initialize();
    return () => {
      disposed = true;
      gate.disconnect();
      dispose();
    };
  }, []);
  return (
    <div className="cinematic-canvas" ref={host} aria-hidden="true">
      {!ready && (
        <div className="cinema-fallback">
          {silhouette.map((r, y) => (
            <div key={y}>
              {[...r].map((p, x) => (
                <i key={x} style={{ opacity: p === '1' ? 1 : 0 }} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
