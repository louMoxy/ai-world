import { Color, Uniform } from 'three'
import { Effect, EffectAttribute } from 'postprocessing'

/**
 * Shared GLSL: edges found from jumps in depth. Uses the second difference of depth, so it
 * finds silhouettes and creases but ignores flat sloping ground. Needs a `thickness` uniform.
 */
const DEPTH_EDGES = /* glsl */ `
  float distanceAt(const in vec2 uv) {
    return -getViewZ(readDepth(uv));
  }

  float depthEdge(const in vec2 uv, const in float z) {
    vec2 o = texelSize * thickness;
    float zl = distanceAt(uv - vec2(o.x, 0.0));
    float zr = distanceAt(uv + vec2(o.x, 0.0));
    float zd = distanceAt(uv - vec2(0.0, o.y));
    float zu = distanceAt(uv + vec2(0.0, o.y));
    float e = (abs(zl + zr - 2.0 * z) + abs(zu + zd - 2.0 * z)) / max(z, 0.001);
    return smoothstep(0.008, 0.03, e) * (1.0 - smoothstep(110.0, 200.0, z)); // fade at the horizon
  }
`

/** Ink outlines around everything. */
export class OutlineEffect extends Effect {
  constructor({ color = '#1d2433', thickness = 1, strength = 1 } = {}) {
    super(
      'OutlineEffect',
      /* glsl */ `
        uniform vec3 lineColor;
        uniform float thickness;
        uniform float strength;
        ${DEPTH_EDGES}

        void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
          float edge = depthEdge(uv, -getViewZ(depth));
          outputColor = vec4(mix(inputColor.rgb, lineColor, edge * strength), inputColor.a);
        }
      `,
      {
        attributes: EffectAttribute.DEPTH,
        uniforms: new Map([
          ['lineColor', new Uniform(new Color(color))],
          ['thickness', new Uniform(thickness)],
          ['strength', new Uniform(strength)],
        ]),
      },
    )
  }
}

/** Cuts colours down to a few levels per channel, with ordered dithering per pixel block. */
export class PosterizeEffect extends Effect {
  constructor({ levels = 6, cell = 5 } = {}) {
    super(
      'PosterizeEffect',
      /* glsl */ `
        uniform float levels;
        uniform float cell;

        float bayer2(vec2 a) {
          a = floor(a);
          return fract(a.x / 2.0 + a.y * a.y * 0.75);
        }
        float bayer4(vec2 a) {
          return bayer2(0.5 * a) * 0.25 + bayer2(a);
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          // Work in display (gamma) space so the steps look even.
          vec3 c = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));
          vec2 block = floor(uv * resolution / cell);
          float threshold = bayer4(block) - 0.5;
          c = floor(c * (levels - 1.0) + 0.5 + threshold * 0.45) / (levels - 1.0);
          outputColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(2.2)), inputColor.a);
        }
      `,
      {
        uniforms: new Map([
          ['levels', new Uniform(levels)],
          ['cell', new Uniform(cell)],
        ]),
      },
    )
  }
}

/**
 * A technical drawing: white lines on blue paper with a grid. Lines come from depth jumps
 * (outlines) and from brightness jumps (the facets of the low-poly shapes).
 */
export class BlueprintEffect extends Effect {
  constructor({ thickness = 1, grid = 32 } = {}) {
    super(
      'BlueprintEffect',
      /* glsl */ `
        uniform vec3 paper;
        uniform vec3 ink;
        uniform float thickness;
        uniform float grid;
        ${DEPTH_EDGES}

        float luma(const in vec2 uv) {
          return dot(texture2D(inputBuffer, uv).rgb, vec3(0.299, 0.587, 0.114));
        }

        float gridLine(const in float size) {
          vec2 p = mod(gl_FragCoord.xy, size);
          return (p.x < 1.0 || p.y < 1.0) ? 1.0 : 0.0;
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
          float z = -getViewZ(depth);
          bool sky = depth >= 0.9999;

          // Paper, very faintly shaded so shapes still read.
          float l = luma(uv);
          vec3 col = sky ? paper : paper * (0.85 + 0.35 * l);
          col = mix(col, ink, 0.07 * gridLine(grid) + 0.08 * gridLine(grid * 5.0));

          float lines = 0.0;
          if (!sky) {
            vec2 o = texelSize * max(1.0, thickness * 0.5);
            float facets = abs(luma(uv - vec2(o.x, 0.0)) - luma(uv + vec2(o.x, 0.0)))
                         + abs(luma(uv - vec2(0.0, o.y)) - luma(uv + vec2(0.0, o.y)));
            float fade = 1.0 - smoothstep(60.0, 150.0, z);
            lines = max(depthEdge(uv, z), smoothstep(0.04, 0.12, facets) * 0.55 * fade);
          }
          outputColor = vec4(mix(col, ink, lines), 1.0);
        }
      `,
      {
        attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
        uniforms: new Map([
          ['paper', new Uniform(new Color('#1b4f8e'))],
          ['ink', new Uniform(new Color('#eaf4ff'))],
          ['thickness', new Uniform(thickness)],
          ['grid', new Uniform(grid)],
        ]),
      },
    )
  }
}

/**
 * How the AI sees the world: a heat map of distance, glowing contours, a sweeping scan bar,
 * and AI entities (characters, ships) lit up in their own colour. Pairs with the 'vision'
 * material mode, which turns everything else black.
 */
export class VisionEffect extends Effect {
  constructor({ thickness = 1 } = {}) {
    super(
      'VisionEffect',
      /* glsl */ `
        uniform float thickness;
        uniform float time;
        ${DEPTH_EDGES}

        vec3 heat(const in float t) {
          vec3 a = vec3(0.01, 0.02, 0.08);
          vec3 b = vec3(0.18, 0.03, 0.35);
          vec3 c = vec3(0.85, 0.12, 0.25);
          vec3 d = vec3(1.0, 0.75, 0.2);
          if (t < 0.45) return mix(a, b, t / 0.45);
          if (t < 0.8) return mix(b, c, (t - 0.45) / 0.35);
          return mix(c, d, (t - 0.8) / 0.2);
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
          float z = -getViewZ(depth);
          bool sky = depth >= 0.9999;

          vec3 col = sky ? vec3(0.005, 0.01, 0.03) : heat(1.0 - clamp((z - 20.0) / 100.0, 0.0, 1.0)) * 0.28;

          // Contours in cyan.
          if (!sky) col += vec3(0.1, 0.75, 1.0) * depthEdge(uv, z) * 0.55;

          // Anything not black was drawn by an AI entity (or a station's crystal): light it up.
          float entity = max(inputColor.r, max(inputColor.g, inputColor.b));
          if (!sky && entity > 0.01) col = inputColor.rgb * 2.2 + 0.08;

          // A scan bar sweeping down the screen, and fine scanlines.
          float sweep = fract(uv.y + time * 0.12);
          col += vec3(0.15, 0.8, 1.0) * smoothstep(0.97, 1.0, sweep) * 0.25;
          col *= 0.88 + 0.12 * step(0.5, fract(gl_FragCoord.y / 3.0));

          outputColor = vec4(col, 1.0);
        }
      `,
      {
        attributes: EffectAttribute.DEPTH,
        uniforms: new Map([
          ['thickness', new Uniform(thickness)],
          ['time', new Uniform(0)],
        ]),
      },
    )
  }

  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('time').value += deltaTime ?? 0
  }
}
