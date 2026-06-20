import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Vehicle3DModel({ vehicleType = 'scooter', color = '#1A3C6E' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 375;
    const height = container.clientHeight || 300;

    // Create scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x777788, 0.8);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 12, 8);
    scene.add(directionalLight);

    // Vehicle Group
    const vehicleGroup = new THREE.Group();
    const parsedColor = parseInt(color.replace('#', '0x'), 16) || 0xE8690B;

    // Premium Glossy Paint Material
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: parsedColor,
      roughness: 0.15,
      metalness: 0.35,
      flatShading: true
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.1
    });

    const seatMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.5,
      metalness: 0.1
    });

    // Build model based on type
    if (vehicleType === 'scooter') {
      // Body (Main frame)
      const bodyGeometry = new THREE.BoxGeometry(1.2, 0.6, 2.5);
      const body = new THREE.Mesh(bodyGeometry, paintMaterial);
      body.position.y = 0.5;
      vehicleGroup.add(body);

      // Front Shield
      const shieldGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.3);
      const shield = new THREE.Mesh(shieldGeometry, paintMaterial);
      shield.position.set(0, 1.0, 1.1);
      shield.rotation.x = -0.2;
      vehicleGroup.add(shield);

      // Seat
      const seatGeometry = new THREE.BoxGeometry(0.8, 0.2, 1.2);
      const seat = new THREE.Mesh(seatGeometry, seatMaterial);
      seat.position.set(0, 0.85, -0.2);
      vehicleGroup.add(seat);

      // Handlebars
      const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2);
      const handle = new THREE.Mesh(handleGeometry, seatMaterial);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, 1.5, 1.0);
      vehicleGroup.add(handle);

      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);

      const frontWheel = new THREE.Mesh(wheelGeometry, tireMaterial);
      frontWheel.rotation.z = Math.PI / 2;
      frontWheel.position.set(0, 0.4, 1.3);
      vehicleGroup.add(frontWheel);

      const backWheel = new THREE.Mesh(wheelGeometry, tireMaterial);
      backWheel.rotation.z = Math.PI / 2;
      backWheel.position.set(0, 0.4, -1.0);
      vehicleGroup.add(backWheel);

      camera.position.set(3, 2.2, 4.5);
      camera.lookAt(0, 0.6, 0);
    } else {
      // Car - Main Body
      const bodyGeometry = new THREE.BoxGeometry(2, 0.6, 4);
      const body = new THREE.Mesh(bodyGeometry, paintMaterial);
      body.position.y = 0.5;
      vehicleGroup.add(body);

      // Cabin
      const cabinGeometry = new THREE.BoxGeometry(1.6, 0.7, 2);
      const cabin = new THREE.Mesh(cabinGeometry, paintMaterial);
      cabin.position.set(0, 1.1, -0.2);
      vehicleGroup.add(cabin);

      // Windows
      const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaaddee, 
        roughness: 0.1, 
        metalness: 0.9, 
        transparent: true, 
        opacity: 0.7 
      });
      const windShieldGeometry = new THREE.BoxGeometry(1.4, 0.6, 0.1);
      const windShield = new THREE.Mesh(windShieldGeometry, windowMaterial);
      windShield.position.set(0, 1.1, 0.85);
      vehicleGroup.add(windShield);

      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);

      const positions = [
        [-1.1, 0.4, 1.2], [1.1, 0.4, 1.2],
        [-1.1, 0.4, -1.2], [1.1, 0.4, -1.2]
      ];

      positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, tireMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        vehicleGroup.add(wheel);
      });

      camera.position.set(4.5, 3, 6);
      camera.lookAt(0, 0.6, 0);
    }

    scene.add(vehicleGroup);

    // Animation variables
    let animationFrameId;
    let time = 0;

    // Floating Animation
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.02;
      
      if (vehicleType === 'scooter') {
        vehicleGroup.position.y = Math.sin(time) * 0.1;
      } else {
        vehicleGroup.position.y = Math.sin(time) * 0.08;
      }
      vehicleGroup.rotation.y += 0.005;
      
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // dispose of standard geometries and materials to avoid memory leaks
      scene.clear();
      renderer.dispose();
    };
  }, [vehicleType, color]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-transparent overflow-hidden"
      style={{ display: 'block', minHeight: '150px' }}
    />
  );
}

export default Vehicle3DModel;
