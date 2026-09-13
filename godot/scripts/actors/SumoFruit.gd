class_name SumoFruit
extends RigidBody2D

enum State { IDLE, AIMING, IN_RING, CLASHING, MERGING, RING_OUT }

signal ring_out_committed(fruit: SumoFruit)
signal contact_occurred(fruit: SumoFruit, other_body: Node2D, rel_speed: float)

@export var data: FruitData

var state: State = State.IDLE
var entry_pending: bool = true
var has_entered_ring: bool = false
var was_in_rim_danger: bool = false
var panic: bool = false
var rim_save_timer: float = 0.0
var clash_id: int = -1

# Squash & Stretch
var squash_amplitude: float = 0.0
var squash_normal: Vector2 = Vector2.ZERO
var squash_elapsed: float = 0.0
var squash_active: bool = false

# Verlet Mawashi Tails (2 cloth tails)
var tail_left_pos: Vector2 = Vector2.ZERO
var tail_left_prev: Vector2 = Vector2.ZERO
var tail_right_pos: Vector2 = Vector2.ZERO
var tail_right_prev: Vector2 = Vector2.ZERO

@onready var visual_root: Node2D = $VisualRoot
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	contact_monitor = true
	max_contacts_reported = 16
	gravity_scale = 0.0
	lock_rotation = true
	body_entered.connect(_on_body_entered)
	if data:
		apply_data(data)

func apply_data(new_data: FruitData) -> void:
	data = new_data
	mass = data.mass
	linear_damp = data.linear_damp
	var circle = CircleShape2D.new()
	circle.radius = data.radius
	if collision_shape:
		collision_shape.shape = circle
	var mat = PhysicsMaterial.new()
	mat.bounce = data.restitution
	mat.friction = 0.2
	physics_material_override = mat
	
	tail_left_pos = Vector2(-data.radius * 0.3, data.radius * 0.9)
	tail_left_prev = tail_left_pos
	tail_right_pos = Vector2(data.radius * 0.3, data.radius * 0.9)
	tail_right_prev = tail_right_pos
	queue_redraw()

func trigger_squash(impulse_mag: float, normal: Vector2) -> void:
	squash_amplitude = clampf(impulse_mag / 400.0, 0.1, 0.45)
	squash_normal = normal
	squash_elapsed = 0.0
	squash_active = true

func _physics_process(delta: float) -> void:
	if squash_active:
		squash_elapsed += delta
		if squash_elapsed > 0.6:
			squash_active = false
			if visual_root:
				visual_root.scale = Vector2.ONE
		elif visual_root:
			var s = 1.0 + squash_amplitude * exp(-8.0 * squash_elapsed) * cos(24.0 * squash_elapsed)
			var sx = s
			var sy = 1.0 / s
			visual_root.rotation = squash_normal.angle()
			visual_root.scale = Vector2(sx, sy)

	if rim_save_timer > 0.0:
		rim_save_timer -= delta

	# Verlet Tail simulation
	_update_tails(delta)
	queue_redraw()

func _update_tails(delta: float) -> void:
	if not data: return
	var damping = 0.88
	var anchor_l = Vector2(-data.radius * 0.3, data.radius * 0.75)
	var anchor_r = Vector2(data.radius * 0.3, data.radius * 0.75)
	
	var vel_l = (tail_left_pos - tail_left_prev) * damping
	tail_left_prev = tail_left_pos
	tail_left_pos += vel_l - linear_velocity * delta * 0.2
	
	var vel_r = (tail_right_pos - tail_right_prev) * damping
	tail_right_prev = tail_right_pos
	tail_right_pos += vel_r - linear_velocity * delta * 0.2
	
	# Constrain length
	var max_len = data.radius * 0.65
	if (tail_left_pos - anchor_l).length() > max_len:
		tail_left_pos = anchor_l + (tail_left_pos - anchor_l).normalized() * max_len
	if (tail_right_pos - anchor_r).length() > max_len:
		tail_right_pos = anchor_r + (tail_right_pos - anchor_r).normalized() * max_len

func _on_body_entered(other: Node) -> void:
	if other is Node2D:
		var rel_vel = linear_velocity
		if other is RigidBody2D:
			rel_vel -= other.linear_velocity
		var rel_speed = rel_vel.length()
		if rel_speed > 40.0:
			trigger_squash(rel_speed, -rel_vel.normalized())
			Sound.play_slap()
		contact_occurred.emit(self, other, rel_speed)

func _draw() -> void:
	if not data: return
	var r = data.radius

	# 1. Verlet Tails (Drawn Behind Fruit)
	draw_line(Vector2(-r * 0.3, r * 0.75), tail_left_pos, data.mawashi_color, 3.5)
	draw_line(Vector2(r * 0.3, r * 0.75), tail_right_pos, data.mawashi_color, 3.5)

	# 2. Fruit Body
	draw_circle(Vector2.ZERO, r, data.color)
	# Body Rim Stroke
	draw_arc(Vector2.ZERO, r, 0, TAU, 32, data.color.darkened(0.25), 2.5)
	# Specular Shine
	draw_circle(Vector2(-r * 0.32, -r * 0.32), r * 0.22, Color(1, 1, 1, 0.45))

	# 3. Traditional Chonmage Topknot (Hair knot on top)
	var topknot_pos = Vector2(0, -r * 0.95)
	draw_circle(topknot_pos, r * 0.18, Color("#1A1412"))
	draw_arc(topknot_pos, r * 0.18, 0, TAU, 16, Color("#3B2F2A"), 1.5)

	# 4. Mawashi (Sumo belt)
	var mawashi_w = r * 1.95
	var mawashi_h = r * 0.28
	var mawashi_rect = Rect2(-mawashi_w * 0.5, r * 0.15, mawashi_w, mawashi_h)
	draw_rect(mawashi_rect, data.mawashi_color)
	draw_rect(mawashi_rect, Color(0, 0, 0, 0.3), false, 1.5)
	# Center knot
	draw_rect(Rect2(-r * 0.18, r * 0.1, r * 0.36, mawashi_h * 1.3), data.mawashi_color)
	draw_rect(Rect2(-r * 0.18, r * 0.1, r * 0.36, mawashi_h * 1.3), Color(0, 0, 0, 0.4), false, 1.2)

	# 5. Sumo Eyes & Expression
	var eye_x = data.eye_offset
	var eye_y = -r * 0.1
	if panic:
		# Squinting panic eyes '> <'
		draw_line(Vector2(-eye_x - 4, eye_y - 2), Vector2(-eye_x, eye_y), Color("#1A1412"), 2.2)
		draw_line(Vector2(-eye_x - 4, eye_y + 2), Vector2(-eye_x, eye_y), Color("#1A1412"), 2.2)
		draw_line(Vector2(eye_x + 4, eye_y - 2), Vector2(eye_x, eye_y), Color("#1A1412"), 2.2)
		draw_line(Vector2(eye_x + 4, eye_y + 2), Vector2(eye_x, eye_y), Color("#1A1412"), 2.2)
		# Sweat droplet
		draw_circle(Vector2(eye_x + 7, eye_y - 8), 2.5, Color("#74B9FF"))
	else:
		# Big focused sumo eyes
		draw_circle(Vector2(-eye_x, eye_y), data.eye_size, Color.WHITE)
		draw_circle(Vector2(eye_x, eye_y), data.eye_size, Color.WHITE)
		# Pupils look forward/in motion direction
		var look_dir = linear_velocity.normalized() * (data.pupil_size * 0.4)
		draw_circle(Vector2(-eye_x, eye_y) + look_dir, data.pupil_size, Color("#1A1412"))
		draw_circle(Vector2(eye_x, eye_y) + look_dir, data.pupil_size, Color("#1A1412"))
		# Rosy cheeks
		draw_circle(Vector2(-eye_x - 4, eye_y + 6), r * 0.08, Color(1, 0.4, 0.4, 0.4))
		draw_circle(Vector2(eye_x + 4, eye_y + 6), r * 0.08, Color(1, 0.4, 0.4, 0.4))

	# 6. "Not Today!" Rim Save Sweat wiping indicator
	if rim_save_timer > 0.0:
		var alpha = clampf(rim_save_timer, 0.0, 1.0)
		draw_string(ThemeDB.fallback_font, Vector2(-28, -r - 10), "NOT TODAY!", HORIZONTAL_ALIGNMENT_CENTER, -1, 11, Color(1, 0.85, 0.2, alpha))
