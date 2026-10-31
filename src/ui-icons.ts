// Small, original illustrations: the same ink, ochre and straw as the farm.
const drawings = {
  bag: '<path fill="#9c633a" d="M9 12V8h14v4h5v19H4V12z"/><path fill="#c49455" d="M6 15h20v14H6z"/><path fill="#e3bc79" d="M5 11h22v8H5z"/><path fill="#64432b" d="M13 17h6v7h-6z"/><path fill="none" d="M11 10V5h10v5M5 11h22v19H5z"/>',
  hoe: '<path stroke="#e0b777" stroke-width="5" d="m8 29 16-23"/><path fill="#89918a" d="m14 5 8-3 9 6-4 8-7-7-6 1z"/><path stroke="#f3d69c" d="m10 25 9-13"/>',
  hand: '<path fill="#e8b979" d="M9 20V9q0-4 4-2V4q2-3 4 0v2q4-2 4 2v3q4-1 4 3v10l-6 7h-9L3 21q-2-4 1-5z"/><path fill="none" d="M13 8v10m4-10v10m4-6v7"/>',
  map: '<path fill="#e6c58b" d="m3 6 9-3 9 4 8-3v24l-8 3-9-4-9 3z"/><path fill="none" d="M12 4v22M21 7v22"/><path stroke="#a85d38" stroke-dasharray="2 3" fill="none" d="m7 23 3-9 8 7 7-10"/><path stroke="#a85d38" d="m23 9 4 4m0-4-4 4"/>',
  pause: '<path fill="#e6c58b" d="M7 5h6v25H7zm13 0h6v25h-6z"/>',
  people:
    '<path fill="#d5ac70" d="M3 29v-7q5-9 12 0v7zm14 0v-7q6-9 12 0v7z"/><path fill="#e7c694" d="M5 7h8v9H5zm14-2h8v11h-8z"/><path fill="#936035" d="M2 7h14M16 5h14"/>',
} as const;

export function uiIcon(name: keyof typeof drawings) {
  return `<svg class="farm-icon" viewBox="0 0 32 34" aria-hidden="true" focusable="false" fill="none" stroke="#513a29" stroke-width="1.5" stroke-linejoin="round">${drawings[name]}</svg>`;
}
