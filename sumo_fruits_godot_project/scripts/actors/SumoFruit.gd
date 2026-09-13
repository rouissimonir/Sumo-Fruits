class_name SumoFruit
extends RigidBody2D

enum State { IDLE, AIMING, IN_RING, CLASHING, MERGING, RING_OUT }

signal ring_out_committed(fruit: SumoFruit)
signal contact_occurred(fruit: SumoFruit, other_body: Node2D, rel_speed: float)

@export var data: FruitData

var team: String = "PLAYER"

var runtime_id: int = 0
var state: State = State.IDLE
var entry_pending: bool = true
var entry_age: float = 0.0
var rim_permission: bool = false
var clash_id: int = -1

@onready var visual_root: Node2D = $VisualRoot
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

# Area-preserving squash: s(t) = 1 + A * exp(-8t) * cos(24t)
var squash_amplitude: float = 0.0
var squash_normal: Vector2 = Vector2.ZERO
var squash_elapsed: float = 0.0
var squash_active: bool = false
var ring_out_reported: bool = false
var has_entered_ring: bool = false
var was_in_rim_danger: bool = false
var near_rim_saved: bool = false
var wiping_sweat_timer: float = 0.0
var panic: bool = false
var look_target: Vector2 = Vector2.INF
var banked_this_shot: bool = false

func _ready() -> void:
	contact_monitor = true
	max_contacts_reported = 16
	gravity_scale = 0.0
	lock_rotation = true
	add_to_group("fruits")
	body_entered.connect(_on_body_entered)
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
	if visual_root.has_method("configure"):
		visual_root.configure(data)
	queue_redraw()

func trigger_squash(impulse_mag: float, normal: Vector2) -> void:
	squash_amplitude = clamp(impulse_mag / 400.0, 0.1, 0.45)
	squash_normal = normal
	squash_elapsed = 0.0
	squash_active = true
	if visual_root.has_method("trigger_squash"):
		visual_root.trigger_squash(squash_amplitude, normal)

func commit_ring_out() -> void:
	if ring_out_reported or state == State.MERGING:
		return
	ring_out_reported = true
	state = State.RING_OUT
	collision_layer = 0
	collision_mask = 0
	ring_out_committed.emit(self)

func _on_body_entered(other_body: Node) -> void:
	if other_body is not SumoFruit:
		return
	var other := other_body as SumoFruit
	var relative_speed := (linear_velocity - other.linear_velocity).length()
	var normal := (other.global_position - global_position).normalized()
	trigger_squash(relative_speed * mass, -normal)
	contact_occurred.emit(self, other, relative_speed)

func _physics_process(delta: float) -> void:
	if entry_pending and not freeze and state == State.IN_RING:
		entry_age += delta
	if state == State.RING_OUT:
		modulate.a = maxf(0.0, modulate.a - delta * 1.8)
		if modulate.a <= 0.01:
			queue_free()
	if wiping_sweat_timer > 0.0:
		wiping_sweat_timer -= delta
	if visual_root.has_method("refresh_expression"):
		visual_root.refresh_expression()
