import { Color, DoubleSide, ShaderMaterial, Texture, AdditiveBlending } from 'three';

type HologramOptions = {
  color?: string;
  alpha?: number;
  fresnelPower?: number;
  scanlineDensity?: number;
  scanlineStrength?: number;
  noiseStrength?: number;
  useAdditive?: boolean;
};

export function createHologramMaterial(tex?: Texture, opts: HologramOptions = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uTex: { value: tex ?? null },
    uHasTex: { value: tex ? 1 : 0 },
    uColor: { value: new Color(opts.color ?? '#00e1ff') },
    uAlpha: { value: opts.alpha ?? 0.9 },
    uFresnelPower: { value: opts.fresnelPower ?? 2.0 },
    uScanDensity: { value: opts.scanlineDensity ?? 320.0 },
    uScanStrength: { value: opts.scanlineStrength ?? 0.1 },
    uNoiseStrength: { value: opts.noiseStrength ?? 0.06 }
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 viewPos = viewMatrix * worldPos;
        vViewDir = normalize(-viewPos.xyz);
        gl_Position = projectionMatrix * viewPos;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      uniform sampler2D uTex;
      uniform int uHasTex;
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uFresnelPower;
      uniform float uScanDensity;
      uniform float uScanStrength;
      uniform float uNoiseStrength;
      uniform float uTime;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Base from texture or color
        vec3 baseCol = uColor;
        if (uHasTex == 1) {
          vec4 t = texture2D(uTex, vUv);
          baseCol = mix(t.rgb, uColor, 0.15);
        }

        // Fresnel rim
        float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uFresnelPower);

        // Scanlines
        float scan = 1.0 - uScanStrength * (0.5 + 0.5 * sin(vUv.y * uScanDensity + uTime * 1.6));

        // Noise flicker
        float n = (hash(vUv * 250.0 + uTime * 0.5) - 0.5) * 2.0;
        float noise = 1.0 + uNoiseStrength * n;

        vec3 color = baseCol * scan * noise + fres * uColor * 0.6;

        gl_FragColor = vec4(color, uAlpha * (0.75 + 0.25 * fres));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    dithering: true,
    blending: opts.useAdditive ? AdditiveBlending : undefined
  });

  (material as any).updateTexture = (t?: Texture) => {
    material.uniforms.uTex.value = t ?? null;
    material.uniforms.uHasTex.value = t ? 1 : 0;
    material.needsUpdate = true;
  };

  (material as any).setColor = (hex: string) => {
    material.uniforms.uColor.value = new Color(hex);
  };

  (material as any).tick = (dt: number) => {
    material.uniforms.uTime.value += dt;
  };

  return material;
}