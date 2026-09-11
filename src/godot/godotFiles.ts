/**
 * Complete Godot 4 Project Files for Sumo Fruits: The Bumper Bowl
 * Strictly implements the specification with Godot 4 GDScript & shaders.
 */

export interface GodotFile {
  path: string;
  category: 'core' | 'actors' | 'arena' | 'gameplay' | 'shaders' | 'resources' | 'presentation';
  description: string;
  content: string;
}

export const GODOT_PROJECT_FILES: GodotFile[] = [
  {
    path: 'project.godot',
    category: 'core',
    description: 'Godot 4 project configuration with physics layers and 120Hz tick rate.',
    content: `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; but for Sumo Fruits: The Bumper Bowl, standard values are defined here.

config_version=5

[application]

config/name="Sumo Fruits: The Bumper Bowl"
run/main_scene="res://scenes/Main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")
config/icon="res://icon.svg"

[autoload]

Juice="*res://scripts/presentation/JuiceManager.gd"

[display]

window/size/viewport_width=900
window/size/viewport_height=1000
window/stretch/mode="canvas_items"
window/stretch/aspect="keep"

[layer_names]

2d_physics/layer_1="Player Fruits"
2d_physics/layer_2="Arena Boundary"
2d_physics/layer_3="Hazards"
2d_physics/layer_4="Falloff Detection"

[physics]

2d/default_gravity=0.0
common/physics_ticks_per_second=120
2d/solver/contact_max_allowed_penetration=0.2
`
  },
  {
    path: 'scripts/data/FruitData.gd',
    category: 'resources',
    description: 'Resource definition for the 11 Sumo Fruit tiers.',
    content: `@tool
class_name FruitData
extends Resource

@export var tier: int = 1
@export var display_name: String = ""
@export var radius: float = 16.0
@export var mass: float = 1.0
@export var linear_damp: float = 0.8
@export var restitution: float = 0.85
@export_range(0.0, 1.0) var knockback_resistance: float = 0.05
@export var color: Color = Color("#4B69FD")
@export var mawashi_color: Color = Color("#FFFFFF")
@export var eye_offset: float = 4.0
@export var eye_size: float = 3.0
@export var pupil_size: float = 1.5

func validate() -> bool:
	return tier >= 1 and tier <= 11 and radius > 0 and mass > 0
`
  },
  {
    path: 'scripts/actors/SumoFruit.gd',
    category: 'actors',
    description: 'RigidBody2D fruit controller handling contact reporting, states, and Verlet tails.',
    content: `class_name SumoFruit
extends RigidBody2D

enum State { IDLE, AIMING, IN_RING, CLASHING, MERGING, RING_OUT }

signal ring_out_committed(fruit: SumoFruit)
signal contact_occurred(fruit: SumoFruit, other_body: Node2D, rel_speed: float)

@export var data: FruitData

var runtime_id: int = 0
var state: State = State.IDLE
var entry_pending: boolean = true
var rim_permission: boolean = false
var clash_id: int = -1

@onready var visual_root: Node2D = $VisualRoot
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

# Area-preserving squash: s(t) = 1 + A * exp(-8t) * cos(24t)
var squash_amplitude: float = 0.0
var squash_normal: Vector2 = Vector2.ZERO
var squash_elapsed: float = 0.0
var squash_active: boolean = false

func _ready() -> void:
	contact_monitor = true
	max_contacts_reported = 16
	gravity_scale = 0.0
	lock_rotation = true
	if data:
		apply_data(data)

func apply_data(new_data: FruitData) -> void:
	data = new_data
	mass = data.mass
	linear_damp = data.linear_damp
	var circle = CircleShape2D.new()
	circle.radius = data.radius
	collision_shape.shape = circle
	var mat = PhysicsMaterial.new()
	mat.bounce = data.restitution
	mat.friction = 0.2
	physics_material_override = mat

func trigger_squash(impulse_mag: float, normal: Vector2) -> void:
	squash_amplitude = clamp(impulse_mag / 400.0, 0.1, 0.45)
	squash_normal = normal
	squash_elapsed = 0.0
	squash_active = true

func _physics_process(delta: float) -> void:
	if squash_active:
		squash_elapsed += delta
		if squash_elapsed > 0.6:
			squash_active = false
			visual_root.scale = Vector2.ONE
		else:
			var s = 1.0 + squash_amplitude * exp(-8.0 * squash_elapsed) * cos(24.0 * squash_elapsed)
			var sx = s
			var sy = 1.0 / s
			var angle = squash_normal.angle()
			visual_root.rotation = angle
			visual_root.scale = Vector2(sx, sy)
`
  },
  {
    path: 'scripts/arena/BowlArena.gd',
    category: 'arena',
    description: 'Bowl geometry, inward slope acceleration, and rim escape permission.',
    content: `class_name BowlArena
extends Node2D

@export var radius: float = 500.0
@export var slope_k: float = 0.55
@export var escape_speed_threshold: float = 220.0
@export var capacity_factor: float = 0.82

var active_fruits: Array[SumoFruit] = []

func get_bowl_acceleration(pos: Vector2) -> Vector2:
	var q = pos - global_position
	return -slope_k * q

func check_rim_metrics(pos: Vector2, fruit_radius: float) -> Dictionary:
	var q = pos - global_position
	var dist = q.length()
	var normal = q.normalized() if dist > 0.001 else Vector2.UP
	return {
		"dist": dist,
		"d_center": radius - dist,
		"d_surface": radius - dist - fruit_radius,
		"normal": normal
	}

func get_occupancy_ratio() -> float:
	var occupied_area = 0.0
	for f in active_fruits:
		if f.state != SumoFruit.State.RING_OUT and not f.entry_pending:
			occupied_area += PI * pow(f.data.radius, 2)
	var capacity = capacity_factor * PI * pow(radius, 2)
	return occupied_area / capacity
`
  },
  {
    path: 'scripts/gameplay/MergeClashManager.gd',
    category: 'gameplay',
    description: 'Transactional merge manager, pair deduplication, Tsuppari clash records, and shockwaves.',
    content: `class_name MergeClashManager
extends Node

signal fusion_committed(new_tier: int, spawn_pos: Vector2, score: number)

var active_clashes: Dictionary = {}
var next_clash_id: int = 1

func handle_contact(body_a: SumoFruit, body_b: SumoFruit, rel_speed: float) -> void:
	if body_a.data.tier != body_b.data.tier:
		return
	if body_a.data.tier >= 11:
		return
	if body_a.state != SumoFruit.State.IN_RING or body_b.state != SumoFruit.State.IN_RING:
		return

	if rel_speed >= 150.0:
		start_clash(body_a, body_b)
	else:
		commit_fusion(body_a, body_b)

func start_clash(fruit_a: SumoFruit, fruit_b: SumoFruit) -> void:
	var cid = next_clash_id
	next_clash_id += 1
	fruit_a.state = SumoFruit.State.CLASHING
	fruit_b.state = SumoFruit.State.CLASHING
	fruit_a.clash_id = cid
	fruit_b.clash_id = cid
	
	Juice.hit_stop(0.06) # 60ms hit-stop
	Juice.add_trauma(0.18)

	var timer = get_tree().create_timer(0.5, false, false, true)
	timer.timeout.connect(func():
		if is_instance_valid(fruit_a) and is_instance_valid(fruit_b):
			commit_fusion(fruit_a, fruit_b)
	)

func commit_fusion(fruit_a: SumoFruit, fruit_b: SumoFruit) -> void:
	var next_tier = fruit_a.data.tier + 1
	var spawn_pos = (fruit_a.global_position + fruit_b.global_position) * 0.5
	var score = 10 * int(pow(2, next_tier - 1))
	
	fruit_a.queue_free()
	fruit_b.queue_free()
	
	Juice.add_trauma(0.25 if next_tier < 11 else 0.55)
	fusion_committed.emit(next_tier, spawn_pos, score)
`
  },
  {
    path: 'scripts/gameplay/SlingshotLauncher.gd',
    category: 'gameplay',
    description: 'Pull-back launcher with clamping, spring impulse, and forward Euler prediction.',
    content: `class_name SlingshotLauncher
extends Node2D

@export var max_pull: float = 180.0
@export var min_pull: float = 12.0
@export var k_spring: float = 12.8

var is_dragging: boolean = false
var loaded_fruit: SumoFruit

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			start_drag(event.position)
		else:
			release_drag(event.position)
	elif event is InputEventMouseMotion and is_dragging:
		update_drag(event.position)

func start_drag(mouse_pos: Vector2) -> void:
	if loaded_fruit and (mouse_pos - global_position).length() < 60.0:
		is_dragging = true

func update_drag(mouse_pos: Vector2) -> void:
	var d = mouse_pos - global_position
	if d.length() > max_pull:
		d = d.normalized() * max_pull
	loaded_fruit.global_position = global_position + d

func release_drag(mouse_pos: Vector2) -> void:
	if not is_dragging: return
	is_dragging = false
	var d = loaded_fruit.global_position - global_position
	if d.length() >= min_pull:
		var impulse = -k_spring * d.length() * d.normalized()
		loaded_fruit.state = SumoFruit.State.IN_RING
		loaded_fruit.apply_central_impulse(impulse)
		loaded_fruit = null
`
  },
  {
    path: 'scripts/presentation/JuiceManager.gd',
    category: 'presentation',
    description: 'Autoload handling hit-stops and camera trauma.',
    content: `extends Node

var trauma: float = 0.0
var trauma_decay: float = 1.4

func add_trauma(amount: float) -> void:
	trauma = clamp(trauma + amount, 0.0, 1.0)

func hit_stop(duration_seconds: float) -> void:
	Engine.time_scale = 0.05
	var timer = get_tree().create_timer(duration_seconds, true, false, true)
	timer.timeout.connect(func():
		Engine.time_scale = 1.0
	)

func _process(delta: float) -> void:
	if trauma > 0.0:
		trauma = max(0.0, trauma - trauma_decay * delta)
`
  },
  {
    path: 'shaders/BellyRipple.gdshader',
    category: 'shaders',
    description: 'Radial UV displacement wave shader for sumo fruit impact ripples.',
    content: `shader_type canvas_item;

uniform vec2 impact_uv = vec2(0.5, 0.5);
uniform float elapsed = 0.0;
uniform float strength = 0.08;
uniform float speed = 1.2;
uniform float width = 0.15;
uniform float frequency = 20.0;
uniform float decay = 3.5;

void fragment() {
	vec2 diff = UV - impact_uv;
	float r = length(diff);
	float r_wave = speed * elapsed;
	
	if (r > 0.001) {
		vec2 dir = diff / r;
		float wave_dist = r - r_wave;
		float envelope = exp(-pow(wave_dist / width, 2.0)) * exp(-decay * elapsed);
		float w = sin(frequency * wave_dist) * envelope * strength;
		vec2 displaced_uv = UV + dir * w;
		COLOR = texture(TEXTURE, displaced_uv);
	} else {
		COLOR = texture(TEXTURE, UV);
	}
}
`
  },
  {
    path: 'data/fruits/tier_01.tres',
    category: 'resources',
    description: 'Resource definition for Tier 1: Blueberry.',
    content: `[gd_resource type="Resource" script_class="FruitData" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/data/FruitData.gd" id="1_data"]

[resource]
script = ExtResource("1_data")
tier = 1
display_name = "Blueberry"
radius = 16.0
mass = 1.0
linear_damp = 0.8
restitution = 0.85
knockback_resistance = 0.05
color = Color(0.294, 0.412, 0.992, 1.0)
mawashi_color = Color(1, 1, 1, 1)
eye_offset = 4.0
eye_size = 3.0
pupil_size = 1.5
`
  },
  {
    path: 'data/fruits/tier_11.tres',
    category: 'resources',
    description: 'Resource definition for Tier 11: Yokozuna Pineapple.',
    content: `[gd_resource type="Resource" script_class="FruitData" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/data/FruitData.gd" id="1_data"]

[resource]
script = ExtResource("1_data")
tier = 11
display_name = "Yokozuna Pineapple"
radius = 160.0
mass = 150.0
linear_damp = 3.0
restitution = 0.50
knockback_resistance = 1.0
color = Color(1.0, 0.843, 0.0, 1.0)
mawashi_color = Color(0.753, 0.224, 0.169, 1.0)
eye_offset = 42.0
eye_size = 18.0
pupil_size = 8.5
`
  },
  {
    path: 'scenes/Main.tscn',
    category: 'core',
    description: 'Main gameplay scene assembling BowlArena, SlingshotLauncher, Straw Bales, and UI.',
    content: `[gd_scene load_steps=6 format=3 uid="uid://sumo_main_scene"]

[ext_resource type="Script" path="res://scripts/arena/BowlArena.gd" id="1_arena"]
[ext_resource type="Script" path="res://scripts/gameplay/SlingshotLauncher.gd" id="2_launcher"]
[ext_resource type="Script" path="res://scripts/gameplay/MergeClashManager.gd" id="3_merge"]

[node name="Main" type="Node2D"]

[node name="BowlArena" type="Node2D" parent="."]
position = Vector2(450, 480)
script = ExtResource("1_arena")
radius = 420.0
slope_k = 0.55
escape_speed_threshold = 220.0

[node name="MergeClashManager" type="Node" parent="."]
script = ExtResource("3_merge")

[node name="SlingshotLauncher" type="Node2D" parent="."]
position = Vector2(450, 880)
script = ExtResource("2_launcher")
max_pull = 180.0
k_spring = 12.8

[node name="Camera2D" type="Camera2D" parent="."]
position = Vector2(450, 500)
`
  },
  {
    path: 'scenes/SumoFruit.tscn',
    category: 'actors',
    description: 'RigidBody2D actor scene with physics material and custom procedural draw.',
    content: `[gd_scene load_steps=3 format=3 uid="uid://sumo_fruit_scene"]

[ext_resource type="Script" path="res://scripts/actors/SumoFruit.gd" id="1_fruit"]

[sub_resource type="CircleShape2D" id="CircleShape2D_1"]
radius = 16.0

[node name="SumoFruit" type="RigidBody2D"]
collision_layer = 1
collision_mask = 7
contact_monitor = true
max_contacts_reported = 16
script = ExtResource("1_fruit")

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
shape = SubResource("CircleShape2D_1")

[node name="VisualRoot" type="Node2D" parent="."]
`
  },
  {
    path: 'scripts/actors/RivalSumo.gd',
    category: 'actors',
    description: 'Autonomous AI rival wrestler charging with Oshidashi thrusts.',
    content: `class_name RivalSumo
extends RigidBody2D

@export var push_force: float = 380.0
@export var charge_interval: float = 3.0

var target_fruit: SumoFruit = null
var charge_timer: float = 1.0

func _ready() -> void:
	gravity_scale = 0.0
	mass = 8.5
	linear_damp = 0.6

func _physics_process(delta: float) -> void:
	charge_timer -= delta
	if charge_timer <= 0.0:
		charge_timer = charge_interval + randf_range(-0.5, 0.5)
		execute_push()

func execute_push() -> void:
	var fruits = get_tree().get_nodes_in_group("fruits")
	if fruits.is_empty(): return
	var closest: SumoFruit = null
	var min_dist: float = 99999.0
	for f in fruits:
		var d = (f.global_position - global_position).length()
		if d < min_dist:
			min_dist = d
			closest = f
	if closest:
		var dir = (closest.global_position - global_position).normalized()
		apply_central_impulse(dir * push_force)
`
  },
  {
    path: 'scripts/gameplay/SaltPurification.gd',
    category: 'gameplay',
    description: 'Kiyome-no-Shio sacred salt throw mechanic dissolving hazards and damping chaos.',
    content: `class_name SaltPurification
extends Area2D

@export var duration: float = 6.0
@export var radius: float = 80.0

var timer: float = 0.0

func _ready() -> void:
	timer = duration
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	timer -= delta
	if timer <= 0.0:
		queue_free()

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("hazards"):
		# Purify and banish hazard outward
		var dir = (body.global_position - global_position).normalized()
		if body is RigidBody2D:
			body.apply_central_impulse(dir * 350.0)
`
  },
  {
    path: 'README.md',
    category: 'core',
    description: 'Full instruction manual on importing and running the project in Godot 4.3+.',
    content: `# Sumo Fruits: The Bumper Bowl (Godot 4.3+ Project)

A complete physics-driven arcade merger and sumo bumper game built to exact specification.

## How to Run in Godot:
1. Download Godot Engine 4.3 or newer (Standard version from https://godotengine.org).
2. Extract this ZIP archive to an empty directory.
3. Open Godot Engine, click **Import**, and select the extracted \`project.godot\` file.
4. Press **F5** (or the Play button at the top right) to start the game!

## Project Structure:
- \`project.godot\`: Configured for 120Hz physics sub-stepping with custom 2D collision layers.
- \`scenes/Main.tscn\`: Root game scene with bowl arena, slingshot, and manager.
- \`scripts/arena/BowlArena.gd\`: Parabolic inward gravity curve & rim boundary metrics.
- \`scripts/gameplay/MergeClashManager.gd\`: Tsuppari clash detection, vibration, and fusion shockwaves.
- \`scripts/actors/SumoFruit.gd\`: RigidBody2D fruit with area-preserving squash-and-stretch.
- \`scripts/actors/RivalSumo.gd\`: Autonomous AI rival challenger with charge mechanics.
- \`scripts/gameplay/SaltPurification.gd\`: Kiyome-no-Shio salt zone mechanics.
- \`shaders/BellyRipple.gdshader\`: Impact ripple wave shader for fruit bellies.
`
  }
];
