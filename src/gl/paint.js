import * as THREE from 'three';

/**
 * Vernice metallizzata con trasparente (clearcoat) + fiocchi metallici +
 * "light sweep": la lama di luce che attraversa la carrozzeria ogni 6 secondi,
 * come nelle pubblicità delle auto.
 *
 * Tutto passa da onBeforeCompile: restiamo su MeshPhysicalMaterial, quindi
 * continuiamo ad avere PBR, envMap e ombre gratis.
 */
export function createPaintMaterial({
  color = 0x141821,
  roughness = 0.24,
  metalness = 1,
  flake = 0.075,
  envMapIntensity = 1.55
} = {}) {
  const uniforms = {
    uTime: { value: 0 },
    // x: posizione della lama nello spazio locale, y: larghezza, z: intensità
    uSweep: { value: new THREE.Vector3(-99, 0.34, 0) },
    uFlake: { value: flake }
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    iridescence: 0.12,
    iridescenceIOR: 1.4,
    envMapIntensity
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLocalPos;
         varying vec3 vWorldNrm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vLocalPos = position;
         vWorldNrm = normalize(mat3(modelMatrix) * normal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLocalPos;
         varying vec3 vWorldNrm;
         uniform float uTime;
         uniform vec3 uSweep;
         uniform float uFlake;

         // hash 3D stabile: i fiocchi non "nuotano" quando la camera si muove
         vec3 hash33(vec3 p){
           p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                    dot(p, vec3(269.5, 183.3, 246.1)),
                    dot(p, vec3(113.5, 271.9, 124.6)));
           return fract(sin(p) * 43758.5453123);
         }`
      )
      // fiocchi metallici: micro-perturbazione della normale ad alta frequenza
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         {
           vec3 cell = floor(vLocalPos * 260.0);
           vec3 f = hash33(cell) * 2.0 - 1.0;
           float sparkle = step(0.55, hash33(cell + 7.0).x);
           normal = normalize(normal + f * uFlake * (0.35 + sparkle));
         }`
      )
      // lama di luce: banda gaussiana sulle superfici rivolte verso l'alto
      .replace(
        '#include <tonemapping_fragment>',
        `{
           float d = abs(vLocalPos.x - uSweep.x) / max(uSweep.y, 0.001);
           float band = exp(-d * d);
           band *= smoothstep(-0.35, 0.95, vWorldNrm.y);
           gl_FragColor.rgb += band * uSweep.z * vec3(1.0, 0.93, 0.86);
         }
         #include <tonemapping_fragment>`
      );
  };

  // Chiave di cache: forza la ricompilazione se cambiano i parametri custom.
  material.customProgramCacheKey = () => `paint-${flake}`;

  return { material, uniforms };
}

/**
 * Pilota il light sweep: un passaggio ogni `period` secondi, con accelerazione
 * in ingresso e dissolvenza in uscita. Da chiamare a ogni frame.
 */
export function updateSweep(uniforms, elapsed, { period = 6, span = 3.6, duration = 1.15 } = {}) {
  const t = elapsed % period;
  if (t > duration) {
    uniforms.uSweep.value.z = 0;
    return;
  }
  const p = t / duration;
  const eased = 1 - Math.pow(1 - p, 2.4); // parte veloce, chiude morbido
  uniforms.uSweep.value.x = -span * 0.5 + eased * span;
  uniforms.uSweep.value.z = Math.sin(p * Math.PI) * 1.35;
}
