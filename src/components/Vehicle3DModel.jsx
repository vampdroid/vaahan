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

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.1,
      metalness: 0.9
    });

    // Build model based on type
    if (vehicleType === 'scooter') {
      // 1. Rear main body (Curved engine/chassis cover)
      const rearBodyGeom = new THREE.CylinderGeometry(0.5, 0.55, 1.4, 16);
      const rearBody = new THREE.Mesh(rearBodyGeom, paintMaterial);
      rearBody.rotation.x = Math.PI / 2; // lie horizontal
      rearBody.position.set(0, 0.75, -0.4);
      vehicleGroup.add(rearBody);

      // 2. Contoured Seat
      const seatGeom = new THREE.BoxGeometry(0.65, 0.15, 1.1);
      const seat = new THREE.Mesh(seatGeom, seatMaterial);
      seat.position.set(0, 1.05, -0.4);
      vehicleGroup.add(seat);

      // 3. Floorboard (Bottom rider deck)
      const floorGeom = new THREE.BoxGeometry(0.7, 0.08, 1.1);
      const floor = new THREE.Mesh(floorGeom, seatMaterial);
      floor.position.set(0, 0.45, 0.35);
      vehicleGroup.add(floor);

      // 4. Front steering column cover (tilt stem)
      const stemCoverGeom = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 16);
      const stemCover = new THREE.Mesh(stemCoverGeom, paintMaterial);
      stemCover.rotation.x = 0.25; // tilt forward
      stemCover.position.set(0, 0.95, 0.85);
      vehicleGroup.add(stemCover);

      // 5. Front apron shield (Leg shield)
      const apronGeom = new THREE.BoxGeometry(0.85, 0.9, 0.12);
      const apron = new THREE.Mesh(apronGeom, paintMaterial);
      apron.rotation.x = 0.25;
      apron.position.set(0, 0.9, 0.95);
      vehicleGroup.add(apron);

      // 6. Handlebars
      const stemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
      const stem = new THREE.Mesh(stemGeom, seatMaterial);
      stem.position.set(0, 1.35, 0.8);
      vehicleGroup.add(stem);

      const barGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8);
      const bar = new THREE.Mesh(barGeom, seatMaterial);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 1.55, 0.75);
      vehicleGroup.add(bar);

      const gripGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
      const leftGrip = new THREE.Mesh(gripGeom, seatMaterial);
      leftGrip.rotation.z = Math.PI / 2;
      leftGrip.position.set(-0.45, 1.55, 0.75);
      vehicleGroup.add(leftGrip);
      
      const rightGrip = new THREE.Mesh(gripGeom, seatMaterial);
      rightGrip.rotation.z = Math.PI / 2;
      rightGrip.position.set(0.45, 1.55, 0.75);
      vehicleGroup.add(rightGrip);

      // 7. Headlight
      const headlightHousingGeom = new THREE.BoxGeometry(0.25, 0.2, 0.25);
      const headlightHousing = new THREE.Mesh(headlightHousingGeom, paintMaterial);
      headlightHousing.position.set(0, 1.6, 0.78);
      vehicleGroup.add(headlightHousing);

      const headlightLensGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
      const headlightLensMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe0 });
      const headlightLens = new THREE.Mesh(headlightLensGeom, headlightLensMaterial);
      headlightLens.rotation.x = Math.PI / 2;
      headlightLens.position.set(0, 1.6, 0.91);
      vehicleGroup.add(headlightLens);

      // 8. Mirrors
      const mirrorStemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
      const leftMirrorStem = new THREE.Mesh(mirrorStemGeom, seatMaterial);
      leftMirrorStem.rotation.z = -0.4;
      leftMirrorStem.position.set(-0.3, 1.65, 0.75);
      vehicleGroup.add(leftMirrorStem);

      const rightMirrorStem = new THREE.Mesh(mirrorStemGeom, seatMaterial);
      rightMirrorStem.rotation.z = 0.4;
      rightMirrorStem.position.set(0.3, 1.65, 0.75);
      vehicleGroup.add(rightMirrorStem);

      const mirrorGlassGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
      const leftMirror = new THREE.Mesh(mirrorGlassGeom, chromeMaterial);
      leftMirror.rotation.x = Math.PI / 2;
      leftMirror.position.set(-0.38, 1.75, 0.75);
      vehicleGroup.add(leftMirror);

      const rightMirror = new THREE.Mesh(mirrorGlassGeom, chromeMaterial);
      rightMirror.rotation.x = Math.PI / 2;
      rightMirror.position.set(0.38, 1.75, 0.75);
      vehicleGroup.add(rightMirror);

      // 9. Wheels & mudguards
      const forkGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
      const fork = new THREE.Mesh(forkGeom, chromeMaterial);
      fork.position.set(0, 0.5, 1.25);
      vehicleGroup.add(fork);

      const frontFenderGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16, 1, false, 0, Math.PI);
      const frontFender = new THREE.Mesh(frontFenderGeom, paintMaterial);
      frontFender.rotation.x = Math.PI / 2;
      frontFender.rotation.y = Math.PI; // cover top half
      frontFender.position.set(0, 0.45, 1.25);
      vehicleGroup.add(frontFender);

      const rearFenderGeom = new THREE.BoxGeometry(0.6, 0.25, 0.7);
      const rearFender = new THREE.Mesh(rearFenderGeom, paintMaterial);
      rearFender.position.set(0, 0.58, -1.05);
      vehicleGroup.add(rearFender);

      const tireGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
      const frontTire = new THREE.Mesh(tireGeom, tireMaterial);
      frontTire.rotation.z = Math.PI / 2;
      frontTire.position.set(0, 0.35, 1.25);
      vehicleGroup.add(frontTire);

      const backTire = new THREE.Mesh(tireGeom, tireMaterial);
      backTire.rotation.z = Math.PI / 2;
      backTire.position.set(0, 0.35, -1.05);
      vehicleGroup.add(backTire);

      const rimGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 16);
      const frontRim = new THREE.Mesh(rimGeom, chromeMaterial);
      frontRim.rotation.z = Math.PI / 2;
      frontRim.position.set(0, 0.35, 1.25);
      vehicleGroup.add(frontRim);

      const backRim = new THREE.Mesh(rimGeom, chromeMaterial);
      backRim.rotation.z = Math.PI / 2;
      backRim.position.set(0, 0.35, -1.05);
      vehicleGroup.add(backRim);

      // 10. Exhaust Silencer (on right side)
      const exhaustGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8);
      const exhaust = new THREE.Mesh(exhaustGeom, chromeMaterial);
      exhaust.rotation.x = Math.PI / 2 + 0.15; // slightly tilted up
      exhaust.position.set(0.42, 0.45, -0.7);
      vehicleGroup.add(exhaust);

      camera.position.set(3.2, 2.4, 4.8);
      camera.lookAt(0, 0.7, 0);
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
