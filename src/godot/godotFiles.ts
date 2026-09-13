/**
 * The downloadable bundle is sourced from the real Godot project so the web
 * exporter cannot drift away from the version validated by Godot and CI.
 */
export interface GodotFile {
  path: string;
  category: 'core' | 'actors' | 'arena' | 'gameplay' | 'shaders' | 'resources' | 'presentation';
  description: string;
  content: string;
}

const rawProjectFiles = import.meta.glob<string>(
  '../../sumo_fruits_godot_project/**/*.{godot,tscn,tres,gd,gdshader,cfg,svg,md}',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

const projectPrefix = '../../sumo_fruits_godot_project/';

function categoryFor(path: string): GodotFile['category'] {
  if (path.startsWith('scripts/actors/')) return 'actors';
  if (path.startsWith('scripts/arena/')) return 'arena';
  if (path.startsWith('scripts/gameplay/')) return 'gameplay';
  if (path.startsWith('scripts/presentation/')) return 'presentation';
  if (path.startsWith('shaders/')) return 'shaders';
  if (path.startsWith('data/')) return 'resources';
  return 'core';
}

function descriptionFor(path: string): string {
  if (path === 'project.godot') return 'Godot 4.7 project configuration and input map.';
  if (path === 'export_presets.cfg') return 'Codemagic-ready iOS export preset.';
  if (path === 'scenes/Main.tscn') return 'Playable game scene and runtime systems.';
  if (path === 'scenes/SumoFruit.tscn') return 'Physics fruit actor with procedural visuals.';
  if (path.startsWith('data/fruits/')) return 'Fruit tier physics and visual data.';
  if (path.endsWith('.gd')) return 'Validated GDScript source file.';
  if (path.endsWith('.gdshader')) return 'Godot canvas shader.';
  return 'Godot project file.';
}

export const GODOT_PROJECT_FILES: GodotFile[] = Object.entries(rawProjectFiles)
  .map(([modulePath, content]) => {
    const path = modulePath.replace(projectPrefix, '').replaceAll('\\', '/');
    return {
      path,
      category: categoryFor(path),
      description: descriptionFor(path),
      content,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
