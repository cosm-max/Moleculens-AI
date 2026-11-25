import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** A lightweight, interactive particle globe that stays behind page content. */
export default function ParticleSphere({ active = false }) {
  const hostRef = useRef(null);
  const activeRef = useRef(active);
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setWebglAvailable(false);
      return undefined;
    }

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height);
    renderer.setClearColor(0x071426, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.z = 9.4;

    const globe = new THREE.Group();
    scene.add(globe);

    const count = 2100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const blue = new THREE.Color('#48a7ff');
    const orange = new THREE.Color('#ff9259');
    const white = new THREE.Color('#d4efff');
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < count; index += 1) {
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = goldenAngle * index;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const offset = index * 3;
      positions[offset] = x * 2.38;
      positions[offset + 1] = y * 2.38;
      positions[offset + 2] = z * 2.38;

      const highlight = Math.sin(angle * 2.3 + y * 7) > 0.88;
      const color = highlight ? orange : (index % 11 === 0 ? white : blue);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      sizes[index] = index % 17 === 0 ? 2.3 : 1.25;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    globe.add(particles);

    // Fine latitude/longitude arcs lend a molecular-instrument quality.
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#358ce8', transparent: true, opacity: 0.14 });
    for (let ring = 0; ring < 8; ring += 1) {
      const points = [];
      const latitude = -0.82 + ring * 0.234;
      const ringRadius = Math.sqrt(1 - latitude * latitude) * 2.39;
      for (let point = 0; point <= 120; point += 1) {
        const angle = (point / 120) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * ringRadius, latitude * 2.39, Math.sin(angle) * ringRadius));
      }
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }
    for (let arc = 0; arc < 10; arc += 1) {
      const points = [];
      const rotation = (arc / 10) * Math.PI;
      for (let point = 0; point <= 100; point += 1) {
        const angle = (point / 100) * Math.PI * 2;
        const x = Math.cos(angle) * 2.39;
        const y = Math.sin(angle) * 2.39;
        points.push(new THREE.Vector3(x * Math.cos(rotation), y, x * Math.sin(rotation)));
      }
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.45, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#1766bd', transparent: true, opacity: 0.035, side: THREE.BackSide }),
    );
    globe.add(halo);

    const pointer = { x: 0, y: 0 };
    let scrollRotation = 0;
    let rotationY = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId;
    let lastTime = 0;
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.42;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.3;
    };
    const onScroll = () => {
      scrollRotation = window.scrollY * 0.00012;
    };
    const resize = () => {
      const nextWidth = host.clientWidth || window.innerWidth;
      const nextHeight = host.clientHeight || window.innerHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    const animate = (time) => {
      frameId = window.requestAnimationFrame(animate);
      if (reducedMotion.matches && time - lastTime < 250) return;
      const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
      lastTime = time;
      rotationY += delta * (activeRef.current ? 0.21 : 0.055);
      globe.rotation.y = rotationY + scrollRotation;
      globe.rotation.x += (pointer.y - globe.rotation.x) * 0.018;
      globe.rotation.z += (pointer.x - globe.rotation.z) * 0.018;
      particleMaterial.opacity = activeRef.current ? 0.98 : 0.78 + Math.sin(time * 0.00045) * 0.08;
      renderer.render(scene, camera);
      if (reducedMotion.matches) {
        window.cancelAnimationFrame(frameId);
        frameId = undefined;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        if (frameId !== undefined) window.cancelAnimationFrame(frameId);
        frameId = undefined;
        animate(performance.now());
      } else if (frameId === undefined) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    reducedMotion.addEventListener?.('change', onMotionChange);
    animate(0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      reducedMotion.removeEventListener?.('change', onMotionChange);
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineMaterial.dispose();
      halo.geometry.dispose();
      halo.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="sphere-layer" aria-hidden="true">
      <div className="sphere-glow" />
      {webglAvailable ? <div className="sphere-canvas" ref={hostRef} /> : <div className="sphere-fallback" />}
      <span className="sphere-orbit orbit-one" />
      <span className="sphere-orbit orbit-two" />
    </div>
  );
}
