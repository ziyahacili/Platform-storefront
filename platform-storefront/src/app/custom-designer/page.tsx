'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import { TextureLoader } from 'three';
import * as THREE from 'three';

import purseDiffuseFirst from '../../components/assets/ModelPhotos/coinpurse02_purse_Mat_Diffuse.png';
import purseNormalMapFirst from '../../components/assets/ModelPhotos/coinpurse02_purse_Mat_Normal.png';
import purseSpecularMapFirst from '../../components/assets/ModelPhotos/coinpurse02_purse_Mat_Specular.png';
import purseGlossinessMapFirst from '../../components/assets/ModelPhotos/coinpurse02_purse_Mat_Glossiness.png';

import purseDiffuseSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_purse_Mat_Diffuse.jpg';
import purseNormalSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_purse_Mat_Normal.jpg';
import purseGlossinessSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_purse_Mat_Glossiness.jpg';
import purseSpecularSecond from '../../components/assets/ModelPhotos/coinpurse02_purse_Mat_Specular.png';

import purseNormalThird from '../../components/assets/ModelPhotos/ThirdMaterial/leatherNormal.png';
import purseSpecularThird from '../../components/assets/ModelPhotos/ThirdMaterial/leatherRouhess.png';

import purseNormalForth from '../../components/assets/ModelPhotos/ForthMaterial/Bags_02_Leather_01_Normal.png';
import purseDiffuseForth from '../../components/assets/ModelPhotos/ForthMaterial/Bags_02_Leather_01_Diffuse.png';

import purseNormalFifth from '../../components/assets/ModelPhotos/FifthMaterial/Mat_Bag_Normal.png_0.png';
import purseNormal2Fifth from '../../components/assets/ModelPhotos/FifthMaterial/Mat_Bag_Normal.png_0 (1).png';
import purseRoughFifth from '../../components/assets/ModelPhotos/FifthMaterial/ao_met_rough_Mat_Bag_AO_Mat_Bag_Metallic_Mat_Bag_Roughness_ (2).jpeg';

import purseNormalSixth from '../../components/assets/ModelPhotos/SixthMaterial/Pouchette_LV_Normal_DirectX.png';
import purseRoughSixth from '../../components/assets/ModelPhotos/SixthMaterial/Pouchette_LV_Roughness.png';
import purseAoSixth from '../../components/assets/ModelPhotos/SixthMaterial/Pouchette_LV_Mixed_AO.png';

import purseNormalSeventh from '../../components/assets/ModelPhotos/SeventhMaterial/Jellybag_M_Normal_DirectX.png';
import purseRoughnessSeventh from '../../components/assets/ModelPhotos/SeventhMaterial/Jellybag_M_Roughness.png';
import purseAoSeventh from '../../components/assets/ModelPhotos/SeventhMaterial/Jellybag_M_Mixed_AO.png';
import purseOpacitySeventh from '../../components/assets/ModelPhotos/SeventhMaterial/Jellybag_M_Opacity.png';

import purseNormalEights from '../../components/assets/ModelPhotos/EightsMaterial/Claspbag00_Normal_Y-.png';
import purseRoughnessEights from '../../components/assets/ModelPhotos/EightsMaterial/Claspbag00_Roughness.png';
import purseAoEights from '../../components/assets/ModelPhotos/EightsMaterial/Claspbag00_Occlusion.png';
import purseOpacityEights from '../../components/assets/ModelPhotos/EightsMaterial/Claspbag00_Metalic.png';

import claspDiffuseFirst from '../../components/assets/ModelPhotos/coinpurse02_metal_Mat_Glossiness.png';
import claspNormalFirst from '../../components/assets/ModelPhotos/coinpurse02_metal_Mat_Normal.png';
import claspSpecularFirst from '../../components/assets/ModelPhotos/coinpurse02_metal_Mat_Specular.png';
import claspGlossinessFirst from '../../components/assets/ModelPhotos/coinpurse02_metal_Mat_Glossiness.png';

import claspDiffuseSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_metal_Mat_Glossiness.jpg';
import claspNormalSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_metal_Mat_Normal.jpg';
import claspGlossinessMapSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_metal_Mat_Glossiness.jpg';
import claspSpecularMapSecond from '../../components/assets/ModelPhotos/SecondMaterial/coinpurse02_metal_Mat_Specular.jpg';

import claspDiffuseThird from '../../components/assets/ModelPhotos/ClaspMaterial/Frame1_BaseColor.png';
import claspNormalThird from '../../components/assets/ModelPhotos/ClaspMaterial/Frame1_Normal.png';
import claspAoMapThird from '../../components/assets/ModelPhotos/ClaspMaterial/Frame1_AO.png';
import claspRoughnessMapThird from '../../components/assets/ModelPhotos/ClaspMaterial/Frame1_Roughness.png';

const BODY_OBJ_URL = '/ModelParts/model_1.obj';
const CLASP_OBJ_URL = '/ModelParts/model_0.obj';

type PurseTextureKey =
  | 'texture1'
  | 'texture2'
  | 'texture3'
  | 'texture4'
  | 'texture5'
  | 'texture6'
  | 'texture7'
  | 'texture8';

type ClaspTextureKey = 'claspTexture1' | 'claspTexture2' | 'claspTexture3';

// ─────────────────────────────────────────────────────────────────────────────
// ТЕКСТУРЫ СУМКИ
// Позиции файлов сохранены точно как в оригинальном Bags.jsx:
//   texture1 : diffuse/normal/specular/glossiness — оригинальный набор
//   texture2 : normal=NormalSecond, specular=purseSpecularSecond (purse_Mat_Specular.png, не SecondMaterial)
//   texture3 : normal=Third, specular=Third, glossiness=Third
//   texture4 : normal/specular/glossiness — все из Forth (намеренно)
//   texture5 : normal=Fifth_0, roughness=RoughFifth, specular=Normal2Fifth
//   texture6 : normal/roughness/ao — Sixth
//   texture7 : normal/roughness/specular/glossiness/ao/opacity — Seventh (glossiness=opacity намеренно)
//   texture8 : normal/roughness/specular/glossiness/ao/opacity — Eights (specular=normal, glossiness=roughness намеренно)
// ─────────────────────────────────────────────────────────────────────────────
const PURSE_TEXTURES: Record<
  PurseTextureKey,
  {
    label: string;
    preview: string;
    diffuse?: string;
    normal?: string;
    specular?: string;
    glossiness?: string;
    roughness?: string;
    ao?: string;
    opacity?: string;
  }
> = {
  texture1: {
    label: 'Ostrich',
    preview: purseDiffuseFirst.src,
    diffuse: purseDiffuseFirst.src,
    normal: purseNormalMapFirst.src,
    specular: purseSpecularMapFirst.src,
    glossiness: purseGlossinessMapFirst.src,
  },
  texture2: {
    label: 'Saffiano',
    preview: purseDiffuseSecond.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalSecond.src,
    specular: purseSpecularSecond.src, // purse_Mat_Specular.png (не из SecondMaterial) — оригинал
  },
  texture3: {
    label: 'Crocodile',
    preview: purseNormalThird.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalThird.src,
    specular: purseSpecularThird.src,
    glossiness: purseSpecularThird.src, // намеренно одна и та же текстура — оригинал
  },
  texture4: {
    label: 'Moose',
    preview: purseDiffuseForth.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalForth.src,
    specular: purseNormalForth.src,     // намеренно normal вместо specular — оригинал
    glossiness: purseNormalForth.src,   // намеренно normal вместо glossiness — оригинал
  },
  texture5: {
    label: 'Textured',
    preview: purseNormalFifth.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalFifth.src,
    roughness: purseRoughFifth.src,
    specular: purseNormal2Fifth.src,    // намеренно Normal2Fifth вместо specular — оригинал
  },
  texture6: {
    label: 'Luxury',
    preview: purseNormalSixth.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalSixth.src,
    roughness: purseRoughSixth.src,
    ao: purseAoSixth.src,
  },
  texture7: {
    label: 'Jelly',
    preview: purseNormalSeventh.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalSeventh.src,
    roughness: purseRoughnessSeventh.src,
    specular: purseRoughnessSeventh.src, // намеренно roughness вместо specular — оригинал
    glossiness: purseOpacitySeventh.src, // намеренно opacity вместо glossiness — оригинал
    ao: purseAoSeventh.src,
    opacity: purseOpacitySeventh.src,
  },
  texture8: {
    label: 'Claspbag',
    preview: purseNormalEights.src,
    // diffuse намеренно отсутствует — как в оригинале
    normal: purseNormalEights.src,
    roughness: purseRoughnessEights.src,
    specular: purseNormalEights.src,     // намеренно normal вместо specular — оригинал
    glossiness: purseRoughnessEights.src,// намеренно roughness вместо glossiness — оригинал
    ao: purseAoEights.src,
    opacity: purseOpacityEights.src,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ТЕКСТУРЫ ЗАСТЁЖКИ
// Позиции файлов сохранены точно как в оригинальном Bags.jsx:
//   claspTexture1 : diffuse/normal/specular/glossiness — оригинальный набор
//   claspTexture2 : normal/specular/glossiness (без diffuse) — оригинал
//   claspTexture3 : normal/roughness/specular(=normal намеренно)/ao — оригинал
// ─────────────────────────────────────────────────────────────────────────────
const CLASP_TEXTURES: Record<
  ClaspTextureKey,
  {
    label: string;
    diffuse?: string;
    normal?: string;
    specular?: string;
    glossiness?: string;
    roughness?: string;
    ao?: string;
  }
> = {
  claspTexture1: {
    label: 'Polished',
    diffuse: claspDiffuseFirst.src,
    normal: claspNormalFirst.src,
    specular: claspSpecularFirst.src,
    glossiness: claspGlossinessFirst.src,
  },
  claspTexture2: {
    label: 'Brushed',
    // diffuse намеренно отсутствует — как в оригинале
    normal: claspNormalSecond.src,
    specular: claspSpecularMapSecond.src,
    glossiness: claspGlossinessMapSecond.src,
  },
  claspTexture3: {
    label: 'Frame',
    // diffuse намеренно отсутствует — как в оригинале
    normal: claspNormalThird.src,
    roughness: claspRoughnessMapThird.src,
    specular: claspNormalThird.src, // намеренно normal вместо specular — оригинал
    ao: claspAoMapThird.src,
  },
};

const PURSE_COLORS = [
  { name: 'White', hex: '#D5D5D5' },
  { name: 'Black', hex: '#373434' },
  { name: 'Dove Grey', hex: '#C4B8A6' },
  { name: 'Pink', hex: '#DDBCB0' },
  { name: 'Grey', hex: '#686868' },
  { name: 'Grass', hex: '#476430' },
  { name: 'Strawberry', hex: '#D64D4E' },
  { name: 'Orange', hex: '#E68047' },
  { name: 'Light Blue', hex: '#71A2B2' },
  { name: 'Cyclamen', hex: '#C3495E' },
  { name: 'Blue', hex: '#3E4271' },
];

const CLASP_COLORS = [
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gold', hex: '#7A6B33' },
  { name: 'Warm', hex: '#A89A7F' },
  { name: 'Dark', hex: '#807766' },
];

// ─── Цвет фона Canvas ───────────────────────────────────────────────────────
// Проект имеет кремово-бежевую палитру (#EFEFEF страница, #F64FA0 акцент).
// Тёплый светлый нейтральный #F1F0EB — точно из оригинального Bags.jsx —
// идеально сочетается с темой и не отвлекает от модели.
const CANVAS_BG = '#F1F0EB';

// ─── Утилиты ────────────────────────────────────────────────────────────────

function useActivePurseTextures(key: PurseTextureKey) {
  const cfg = PURSE_TEXTURES[key];

  const urls = useMemo(() => {
    const map: Record<string, string> = {};
    if (cfg.diffuse)    map.diffuse    = cfg.diffuse;
    if (cfg.normal)     map.normal     = cfg.normal;
    if (cfg.specular)   map.specular   = cfg.specular;
    if (cfg.glossiness) map.glossiness = cfg.glossiness;
    if (cfg.roughness)  map.roughness  = cfg.roughness;
    if (cfg.ao)         map.ao         = cfg.ao;
    if (cfg.opacity)    map.opacity    = cfg.opacity;
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const keys    = useMemo(() => Object.keys(urls), [urls]);
  const urlList = useMemo(() => keys.map((k) => urls[k]), [keys, urls]);

  const loaded    = useLoader(TextureLoader, urlList.length > 0 ? urlList : ['']) as THREE.Texture | THREE.Texture[];
  const loadedArr = Array.isArray(loaded) ? loaded : [loaded];

  return useMemo(() => {
    const out: Partial<Record<string, THREE.Texture>> = {};
    keys.forEach((k, i) => { if (urlList[i] && loadedArr[i]) out[k] = loadedArr[i]; });
    return out;
  }, [keys, urlList, loadedArr]);
}

function useActiveClaspTextures(key: ClaspTextureKey) {
  const cfg = CLASP_TEXTURES[key];

  const urls = useMemo(() => {
    const map: Record<string, string> = {};
    if (cfg.diffuse)    map.diffuse    = cfg.diffuse;
    if (cfg.normal)     map.normal     = cfg.normal;
    if (cfg.specular)   map.specular   = cfg.specular;
    if (cfg.glossiness) map.glossiness = cfg.glossiness;
    if (cfg.roughness)  map.roughness  = cfg.roughness;
    if (cfg.ao)         map.ao         = cfg.ao;
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const keys    = useMemo(() => Object.keys(urls), [urls]);
  const urlList = useMemo(() => keys.map((k) => urls[k]), [keys, urls]);

  const loaded    = useLoader(TextureLoader, urlList.length > 0 ? urlList : ['']) as THREE.Texture | THREE.Texture[];
  const loadedArr = Array.isArray(loaded) ? loaded : [loaded];

  return useMemo(() => {
    const out: Partial<Record<string, THREE.Texture>> = {};
    keys.forEach((k, i) => { if (urlList[i] && loadedArr[i]) out[k] = loadedArr[i]; });
    return out;
  }, [keys, urlList, loadedArr]);
}

function disposeMaterial(mat: THREE.Material | THREE.Material[]) {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

function setTextureRepeat(
  tex: THREE.Texture | undefined,
  rx: number, ry: number,
  wrap: THREE.Wrapping = THREE.RepeatWrapping
) {
  if (!tex) return;
  tex.wrapS = wrap; tex.wrapT = wrap;
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
}

function setupTextureQuality(tex: THREE.Texture | undefined, maxAniso: number) {
  if (!tex) return;
  tex.anisotropy = Math.min(maxAniso, 8);
  tex.minFilter  = THREE.LinearMipmapLinearFilter;
  tex.magFilter  = THREE.LinearFilter;
  tex.needsUpdate = true;
}

function normUV(mesh: THREE.Mesh) {
  const geo = mesh.geometry as THREE.BufferGeometry;
  if (!geo.attributes.uv2 && geo.attributes.uv)
    geo.setAttribute('uv2', geo.attributes.uv);
}

// ─── Иконки ────────────────────────────────────────────────────────────────
function IconArrowRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function IconSparkle() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" /></svg>;
}
function IconRotate() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>;
}
function IconPalette() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4.2 4H15a2 2 0 0 0-2 2v.5A3.5 3.5 0 0 1 9.5 22H12z" /><circle cx="7.5" cy="9.5" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16.5" cy="9.5" r="1" /></svg>;
}
function IconLayers() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>;
}
function IconBolt() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>;
}

// ─── UI ────────────────────────────────────────────────────────────────────
function SectionPill({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3" style={{ border: '1px solid #E8EAF0' }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#9CA3AF]" style={{ background: '#F3F4F6' }}>{icon}</div>
      <div>
        <div className="text-[12px] font-semibold text-[#1D1D1F]">{title}</div>
        <div className="text-[11px] text-[#9CA3AF]">{sub}</div>
      </div>
    </div>
  );
}

function DesignHeader() {
  return (
    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-white" style={{ background: '#F64FA0' }}>
            <IconSparkle />3D Studio
          </span>
          <span>Customization</span>
        </div>
        <h1 className="text-[30px] font-bold leading-[1.08] text-[#1D1D1F] sm:text-[40px]" style={{ letterSpacing: '-0.03em' }}>
          Build your own bag,<br />live in 3D.
        </h1>
        <p className="mt-3 max-w-[700px] text-[13px] leading-[1.8] text-[#6B7280] sm:text-[14px]">
          Change materials, colors, and clasp finishes. Rotate the model, zoom in, and preview the final look before ordering.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/shop/products" className="inline-flex h-11 items-center gap-2 px-5 text-[13px] font-bold tracking-wide text-white transition-opacity hover:opacity-90" style={{ background: '#1D1D1F' }}>
          Back to shop <IconArrowRight />
        </Link>
        <a href="#designer-canvas" className="inline-flex h-11 items-center gap-2 px-5 text-[13px] font-semibold tracking-wide text-[#1D1D1F] transition-colors hover:text-[#F64FA0]" style={{ border: '1px solid #E8EAF0', background: 'white' }}>
          Open designer <IconArrowRight />
        </a>
      </div>
    </div>
  );
}

function ControlSectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
      <span className="text-[#F64FA0]">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function SwatchButton({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5" title={label}>
      <span className="h-8 w-8 rounded-full transition-transform group-hover:scale-105"
        style={{ background: color, border: active ? '2px solid #1D1D1F' : '1px solid rgba(0,0,0,0.12)', boxShadow: '0 2px 4px rgba(0,0,0,0.12)' }} />
      <span className="max-w-[58px] truncate text-[10px] font-medium text-[#6B7280]">{label}</span>
    </button>
  );
}

function MaterialButton({ active, preview, label, onClick }: { active: boolean; preview: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5" title={label}>
      <span className="h-12 w-12 rounded-full border bg-white transition-transform group-hover:scale-105"
        style={{ backgroundImage: `url(${preview})`, backgroundSize: 'cover', backgroundPosition: 'center', border: active ? '2px solid #F64FA0' : '1px solid rgba(0,0,0,0.12)', boxShadow: '0 2px 4px rgba(0,0,0,0.12)' }} />
      <span className="max-w-[64px] truncate text-[10px] font-medium text-[#6B7280]">{label}</span>
    </button>
  );
}

// ─── 3D модель ─────────────────────────────────────────────────────────────
function BagModel({
  purseColor, claspColor, selectedTexture, selectedClaspTexture,
}: {
  purseColor: string; claspColor: string;
  selectedTexture: PurseTextureKey; selectedClaspTexture: ClaspTextureKey;
}) {
  const bodyTex  = useActivePurseTextures(selectedTexture);
  const claspTex = useActiveClaspTextures(selectedClaspTexture);

  const bodyObj  = useLoader(OBJLoader, BODY_OBJ_URL)  as THREE.Group;
  const claspObj = useLoader(OBJLoader, CLASP_OBJ_URL) as THREE.Group;

  const { camera, gl } = useThree();

  const bodyMatsRef  = useRef<THREE.MeshStandardMaterial[]>([]);
  const claspMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Инициализация рендерера
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => { e.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', () => {});
    gl.shadowMap.enabled = false;
    gl.setClearColor(new THREE.Color(CANVAS_BG));
    gl.toneMapping = THREE.NoToneMapping;
    return () => { canvas.removeEventListener('webglcontextlost', onLost); };
  }, [gl]);

  useEffect(() => {
    camera.position.set(0, 1.5, 15);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Применение материалов и текстур — точно воспроизводим логику оригинального Bags.jsx
  useEffect(() => {
    bodyMatsRef.current.forEach((m) => m.dispose());
    bodyMatsRef.current = [];
    claspMatsRef.current.forEach((m) => m.dispose());
    claspMatsRef.current = [];

    const maxAniso = gl.capabilities.getMaxAnisotropy();

    // Качество текстур тела
    Object.values(bodyTex).forEach((t)  => setupTextureQuality(t, maxAniso));
    Object.values(claspTex).forEach((t) => setupTextureQuality(t, maxAniso));

    // ── Repeat-настройки тела (из оригинального Bags.jsx) ──
    if (selectedTexture === 'texture2' && bodyTex.normal) {
      setTextureRepeat(bodyTex.normal, 1, 2);
    } else if (selectedTexture === 'texture5' && bodyTex.normal) {
      setTextureRepeat(bodyTex.normal, 2, 2);
      bodyTex.normal.anisotropy = maxAniso;
    } else if (selectedTexture === 'texture7' && bodyTex.normal) {
      setTextureRepeat(bodyTex.normal, 2, 2, THREE.MirroredRepeatWrapping);
      bodyTex.normal.anisotropy = maxAniso;
      bodyTex.normal.minFilter  = THREE.LinearMipmapLinearFilter;
      bodyTex.normal.magFilter  = THREE.LinearFilter;
    } else if (selectedTexture === 'texture8') {
      (['normal', 'specular', 'ao', 'roughness', 'opacity'] as const).forEach((k) => {
        const t = bodyTex[k];
        if (t) {
          setTextureRepeat(t, 6, 5, THREE.MirroredRepeatWrapping);
          t.anisotropy = maxAniso;
          t.minFilter  = THREE.LinearMipmapLinearFilter;
          t.magFilter  = THREE.LinearFilter;
        }
      });
    }

    // ── Repeat-настройки застёжки (из оригинального Bags.jsx) ──
    if (selectedClaspTexture === 'claspTexture2' && claspTex.normal) {
      setTextureRepeat(claspTex.normal, 2, 8);
    } else if (selectedClaspTexture === 'claspTexture3' && claspTex.normal) {
      setTextureRepeat(claspTex.normal, 10, 2);
      claspTex.normal.anisotropy = maxAniso;
      claspTex.normal.minFilter  = THREE.LinearMipmapLinearFilter;
      claspTex.normal.magFilter  = THREE.LinearFilter;
    }

    // ── Материал тела сумки ──
    // roughnessMap: в оригинале используется glossiness (или roughness если нет glossiness)
    bodyObj.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      if (mesh.material) disposeMaterial(mesh.material as THREE.Material);
      normUV(mesh);

      const mat = new THREE.MeshStandardMaterial({
        map:          bodyTex.diffuse   ?? null,
        normalMap:    bodyTex.normal    ?? null,
        // оригинал: roughnessMap = glossiness (glossiness-файл намеренно стоит на месте roughness)
        roughnessMap: bodyTex.glossiness ?? bodyTex.roughness ?? null,
        aoMap:        bodyTex.ao        ?? null,
        alphaMap:     bodyTex.opacity   ?? null,
        color:        new THREE.Color(purseColor),
        roughness:    selectedTexture === 'texture2' ? 1 : 0.5,
        metalness:    0.0,
        transparent:  selectedTexture === 'texture7' || selectedTexture === 'texture8',
        opacity:      selectedTexture === 'texture7' || selectedTexture === 'texture8' ? 0.98 : 1,
        envMapIntensity: 0.5,
        side: THREE.FrontSide,
      });

      mesh.material   = mat;
      mesh.castShadow    = false;
      mesh.receiveShadow = false;
      bodyMatsRef.current.push(mat);
    });

    // ── Материал застёжки ──
    claspObj.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      if (mesh.material) disposeMaterial(mesh.material as THREE.Material);
      normUV(mesh);

      const mat = new THREE.MeshStandardMaterial({
        map:          claspTex.diffuse   ?? null,
        normalMap:    claspTex.normal    ?? null,
        roughnessMap: claspTex.roughness ?? claspTex.glossiness ?? null,
        aoMap:        claspTex.ao        ?? null,
        color:        new THREE.Color(claspColor),
        metalness:    1.0,
        roughness:    0.25,
        envMapIntensity: 0.4,
        side: THREE.FrontSide,
      });

      mesh.material   = mat;
      mesh.castShadow    = false;
      mesh.receiveShadow = false;
      claspMatsRef.current.push(mat);
    });

    return () => {
      bodyMatsRef.current.forEach((m)  => m.dispose());
      bodyMatsRef.current = [];
      claspMatsRef.current.forEach((m) => m.dispose());
      claspMatsRef.current = [];
    };
  }, [bodyObj, claspObj, bodyTex, claspTex, purseColor, claspColor, selectedTexture, selectedClaspTexture, gl]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <primitive object={bodyObj}  position={[0, -3, 0]} />
      <primitive object={claspObj} position={[0, -3, 0]} />

      <Environment preset="sunset" />

      <OrbitControls
        enableZoom enablePan
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
        target={[0, -3, 0]}
      />
    </>
  );
}

// ─── Canvas-обёртка ─────────────────────────────────────────────────────────
function DesignerCanvas({
  purseColor, claspColor, selectedTexture, selectedClaspTexture,
}: {
  purseColor: string; claspColor: string;
  selectedTexture: PurseTextureKey; selectedClaspTexture: ClaspTextureKey;
}) {
  return (
    <div id="designer-canvas" className="overflow-hidden bg-white"
      style={{ border: '1px solid #E8EAF0', boxShadow: '0 12px 40px rgba(17,24,39,0.05)' }}>
      <div className="flex items-center justify-between border-b border-[#E8EAF0] px-5 py-4">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Live preview</div>
          <div className="mt-1 text-[14px] font-semibold text-[#1D1D1F]">3D bag customization</div>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280]">
          <IconRotate /> Drag to rotate
        </div>
      </div>

      {/* Цвет фона совпадает с CANVAS_BG — тёплый нейтральный кремовый */}
      <div className="relative h-[520px] w-full sm:h-[620px]" style={{ background: CANVAS_BG }}>
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-medium text-[#6B7280]">
            Loading 3D model…
          </div>
        }>
          <Canvas
            shadows={false}
            dpr={1}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
              preserveDrawingBuffer: false,
              failIfMajorPerformanceCaveat: false,
              stencil: false,
              depth: true,
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = false;
              gl.toneMapping = THREE.NoToneMapping;
              gl.setClearColor(new THREE.Color(CANVAS_BG));
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 1.5, 15]} />
            <BagModel
              purseColor={purseColor}
              claspColor={claspColor}
              selectedTexture={selectedTexture}
              selectedClaspTexture={selectedClaspTexture}
            />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
}

// ─── Панель управления ──────────────────────────────────────────────────────
function ControlsPanel({
  purseColor, setPurseColor,
  claspColor, setClaspColor,
  selectedTexture, setSelectedTexture,
  selectedClaspTexture, setSelectedClaspTexture,
}: {
  purseColor: string; setPurseColor: (v: string) => void;
  claspColor: string; setClaspColor: (v: string) => void;
  selectedTexture: PurseTextureKey; setSelectedTexture: (v: PurseTextureKey) => void;
  selectedClaspTexture: ClaspTextureKey; setSelectedClaspTexture: (v: ClaspTextureKey) => void;
}) {
  return (
    <aside className="lg:sticky lg:top-6" style={{ alignSelf: 'start' }}>
      <div className="bg-white" style={{ border: '1px solid #E8EAF0', boxShadow: '0 12px 40px rgba(17,24,39,0.05)' }}>
        <div className="border-b border-[#E8EAF0] px-5 py-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Design tools</div>
          <div className="mt-1 text-[14px] font-semibold text-[#1D1D1F]">Customize every detail</div>
        </div>

        <div className="space-y-6 px-5 py-5">
          <div>
            <ControlSectionTitle icon={<IconLayers />} title="Bag material" />
            <div className="grid grid-cols-4 gap-3">
              {(Object.entries(PURSE_TEXTURES) as [PurseTextureKey, typeof PURSE_TEXTURES[PurseTextureKey]][]).map(([key, mat]) => (
                <MaterialButton key={key} active={selectedTexture === key} preview={mat.preview} label={mat.label} onClick={() => setSelectedTexture(key)} />
              ))}
            </div>
          </div>

          <div>
            <ControlSectionTitle icon={<IconPalette />} title="Bag color" />
            <div className="grid grid-cols-4 gap-y-4 gap-x-3">
              {PURSE_COLORS.map((c) => (
                <SwatchButton key={c.hex} active={purseColor === c.hex} color={c.hex} label={c.name} onClick={() => setPurseColor(c.hex)} />
              ))}
            </div>
          </div>

          <div>
            <ControlSectionTitle icon={<IconBolt />} title="Clasp material" />
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(CLASP_TEXTURES) as [ClaspTextureKey, typeof CLASP_TEXTURES[ClaspTextureKey]][]).map(([key, mat]) => (
                <button key={key} type="button" onClick={() => setSelectedClaspTexture(key)}
                  className="flex h-16 flex-col items-center justify-center rounded-full px-3 text-center text-[10px] font-semibold transition-transform hover:scale-[1.02]"
                  style={{
                    border: selectedClaspTexture === key ? '2px solid #F64FA0' : '1px solid rgba(0,0,0,0.12)',
                    background: selectedClaspTexture === key ? 'rgba(246,79,160,0.04)' : 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                  }}>
                  <span className="mb-1 text-[11px] text-[#1D1D1F]">{mat.label}</span>
                  <span className="text-[#9CA3AF]">{key.replace('claspTexture', 'T')}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <ControlSectionTitle icon={<IconPalette />} title="Clasp color" />
            <div className="grid grid-cols-4 gap-y-4 gap-x-3">
              {CLASP_COLORS.map((c) => (
                <SwatchButton key={c.hex} active={claspColor === c.hex} color={c.hex} label={c.name} onClick={() => setClaspColor(c.hex)} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E8EAF0' }}>
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Tips</div>
            <ul className="mt-3 space-y-2 text-[12px] leading-[1.7] text-[#6B7280]">
              <li>• Rotate with mouse or touch.</li>
              <li>• Use the material swatches to switch fabric style.</li>
              <li>• Colors update instantly on the live model.</li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Страница ───────────────────────────────────────────────────────────────
export default function CustomDesignerPage() {
  const [purseColor,          setPurseColor]          = useState<string>('#C4B8A6');
  const [claspColor,          setClaspColor]          = useState<string>('#C0C0C0');
  const [selectedTexture,     setSelectedTexture]     = useState<PurseTextureKey>('texture1');
  const [selectedClaspTexture,setSelectedClaspTexture]= useState<ClaspTextureKey>('claspTexture1');

  return (
    <div className="min-h-screen text-[#1D1D1F]" style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main className="mx-auto max-w-[1500px] px-6 py-5">
        <DesignHeader />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <DesignerCanvas
              purseColor={purseColor}
              claspColor={claspColor}
              selectedTexture={selectedTexture}
              selectedClaspTexture={selectedClaspTexture}
            />
            <div className="grid gap-[1px] bg-[#E8EAF0] sm:grid-cols-3">
              <SectionPill icon={<IconRotate />}  title="Real-time rotation" sub="Move and inspect the model" />
              <SectionPill icon={<IconPalette />} title="Material control"   sub="Swap fabric instantly" />
              <SectionPill icon={<IconBolt />}    title="Premium finish"     sub="Clasp and leather variants" />
            </div>
          </div>

          <ControlsPanel
            purseColor={purseColor}             setPurseColor={setPurseColor}
            claspColor={claspColor}             setClaspColor={setClaspColor}
            selectedTexture={selectedTexture}   setSelectedTexture={setSelectedTexture}
            selectedClaspTexture={selectedClaspTexture} setSelectedClaspTexture={setSelectedClaspTexture}
          />
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link href="/shop/products" className="p-6 transition-opacity hover:opacity-95"
            style={{ background: '#1D1D1F', border: '1px solid #1D1D1F' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Ready-made bags</div>
            <div className="mt-2 text-[20px] font-bold leading-[1.2] text-white" style={{ letterSpacing: '-0.02em' }}>Shop the catalog</div>
            <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-[#F64FA0]">
              View products <IconArrowRight />
            </div>
          </Link>

          <div className="p-6" style={{ background: 'white', border: '1px solid #E8EAF0' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9CA3AF]">Current setup</div>
            <div className="mt-2 text-[20px] font-bold leading-[1.2] text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
              {PURSE_TEXTURES[selectedTexture].label}
            </div>
            <p className="mt-2 text-[12px] leading-[1.6] text-[#6B7280]">Bag color: {purseColor}</p>
          </div>

          <div className="p-6" style={{ background: '#F64FA0', border: '1px solid #F64FA0' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Clasp finish</div>
            <div className="mt-2 text-[20px] font-bold leading-[1.2] text-white" style={{ letterSpacing: '-0.02em' }}>
              {CLASP_TEXTURES[selectedClaspTexture].label}
            </div>
            <p className="mt-2 text-[12px] leading-[1.6] text-white/75">Color: {claspColor}</p>
          </div>
        </section>
      </main>
    </div>
  );
}