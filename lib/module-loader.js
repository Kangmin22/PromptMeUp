// lib/module-loader.js
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

// 모든 모듈을 메모리에 한 번만 로드하기 위한 변수
let allModules = null;

/**
 * prompt-modules.yaml 파일을 읽고 파싱하여 모든 모듈의 배열을 반환합니다.
 * @returns {Array} 모듈 객체들의 배열
 */
function loadAllModules() {
  // 이미 로드했다면, 캐시된 결과를 반환
  if (allModules !== null) {
    return allModules;
  }

  try {
    const filePath = path.join(process.cwd(), 'prompt-modules.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents);
    
    // core, builder_extensions 등 모든 카테고리의 모듈들을 하나의 배열로 합칩니다.
    allModules = Object.values(data).flat();
    return allModules;

  } catch (e) {
    console.error("prompt-modules.yaml 파일을 읽거나 파싱하는 중 오류 발생:", e);
    return [];
  }
}

// 이 모듈이 처음 import될 때 모든 모듈을 미리 로드합니다.
loadAllModules();

/**
 * 미리 로드된 모든 모듈을 반환합니다.
 * @returns {Array} 모듈 객체들의 배열
 */
export function getAllModules() {
  return allModules || [];
}

/**
 * ID로 특정 모듈을 찾아서 반환합니다.
 * @param {string} id - 찾고자 하는 모듈의 ID
 * @returns {object | undefined} 해당 ID의 모듈 객체 또는 undefined
 */
export function findModuleById(id) {
  return (allModules || []).find(module => module.id === id);
}