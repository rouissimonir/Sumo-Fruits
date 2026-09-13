class_name Hazard
extends RigidBody2D

enum Kind { WASABI, CHILI, ICE, RIVAL }

signal hazard_defeated(hazard: Hazard, points: int)

@export var kind: Kind = Kind.WASABI
@export var radius: float = 24.0
@export var hp: int = 3
@export var max_hp: int = 3

var hit_flash_timer: float = 0.0
var ring_out: bool = false
var fall_progress: float = 0.0
var ai_charge_timer: float = 2.0

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	gravity_scale = 0.0
	contact_monitor = true
	max_contacts_reported = 8
	body_entered.connect(_on_body_entered)
	setup_kind(kind)

func setup_kind(new_kind: Kind) -> void:
	kind = new_kind
	match kind:
		Kind.WASABI:
			radius = 26.0
			mass = 4.5
			hp = 3
			max_hp = 3
			linear_damp = 1.6
		Kind.CHILI:
			radius = 20.0
			mass = 2.0
			hp = 1
			max_hp = 1
			linear_damp = 0.5
		Kind.ICE:
			radius = 22.0
			mass = 3.5
			hp = 1
			max_hp = 1
			linear_damp = 0.05
		Kind.RIVAL:
			radius = 36.0
			mass = 12.0
			hp = 5
			max_hp = 5
			linear_damp = 0.8
			
	if collision_shape:
		var circle = CircleShape2D.new()
		circle.radius = radius
		collision_shape.shape = circle
	queue_redraw()

func _physics_process(delta: float) -> void:
	if hit_flash_timer > 0.0:
		hit_flash_timer -= delta
		queue_redraw()
		
	if ring_out:
		fall_progress += delta * 2.0
		scale = Vector2.ONE * maxf(0.1, 1.0 - fall_progress)
		modulate.a = maxf(0.0, 1.0 - fall_progress)
		if fall_progress >= 1.0:
			queue_free()
		return

	if kind == Kind.RIVAL:
		ai_charge_timer -= delta
		if ai_charge_timer <= 0.0:
			ai_charge_timer = randf_range(2.0, 3.5)
			_rival_charge()

func _rival_charge() -> void:
	var fruits = get_tree().get_nodes_in_group("fruits")
	var target: SumoFruit = null
	var highest_tier = -1
	for f in fruits:
		if f is SumoFruit and f.state == SumoFruit.State.IN_RING:
			if f.data and f.data.tier > highest_tier:
				highest_tier = f.data.tier
				target = f
	if target:
		var dir = (target.global_position - global_position).normalized()
		apply_central_impulse(dir * 280.0)
		Sound.play_taiko()

func take_damage(amount: int, push_dir: Vector2) -> void:
	hp -= amount
	hit_flash_timer = 0.18
	apply_central_impulse(push_dir * 180.0)
	Sound.play_splat()
	Juice.add_trauma(0.15)
	queue_redraw()

	if hp <= 0:
		defeat(180 if kind == Kind.WASABI else 350)

func defeat(points: int) -> void:
	Sound.play_splat()
	hazard_defeated.emit(self, points)
	Juice.request_banner("撃退！", "HAZARD PURIFIED! +%d PTS" % points, Color("#2ECC71"))
	queue_free()

func _on_body_entered(other: Node) -> void:
	if other is SumoFruit:
		var rel_vel = linear_velocity - other.linear_velocity
		var impact_speed = rel_vel.length()
		var push_dir = -rel_vel.normalized()

		match kind:
			Kind.WASABI:
				# Slow the fruit down significantly
				other.linear_velocity *= 0.65
				# Take damage
				var dmg = 2 if (other.data and other.data.tier >= 4) or impact_speed > 220.0 else 1
				take_damage(dmg, push_dir)
			Kind.CHILI:
				# Rocket blast boost to fruit!
				var boost_dir = other.linear_velocity.normalized() if other.linear_velocity.length() > 10.0 else Vector2.RIGHT
				other.apply_central_impulse(boost_dir * 380.0)
				Sound.play_taiko()
				Juice.request_banner("激辛！", "CHILI ROCKET BOOST!", Color("#E74C3C"))
				queue_free()
			Kind.ICE:
				# Ice kick
				other.apply_central_impulse(push_dir * 120.0)
				Sound.play_slap()

func _draw() -> void:
	match kind:
		Kind.WASABI:
			var is_flash = hit_flash_timer > 0.0
			var body_col = Color("#A9DFBF") if is_flash else Color("#27AE60")
			var top_col = Color("#D5F5E3") if is_flash else Color("#2ECC71")

			# Mound body
			draw_circle(Vector2.ZERO, radius, body_col)
			draw_arc(Vector2.ZERO, radius, 0, TAU, 24, Color("#1E8449"), 2.5)
			# Top dollop
			draw_circle(Vector2(-2, -3), radius * 0.6, top_col)
			draw_circle(Vector2(-4, -5), radius * 0.28, Color("#E8F8F5"))

			# Face
			if is_flash:
				draw_line(Vector2(-8, -2), Vector2(-4, 0), Color("#145A32"), 2.0)
				draw_line(Vector2(-8, 2), Vector2(-4, 0), Color("#145A32"), 2.0)
				draw_line(Vector2(8, -2), Vector2(4, 0), Color("#145A32"), 2.0)
				draw_line(Vector2(8, 2), Vector2(4, 0), Color("#145A32"), 2.0)
			else:
				draw_circle(Vector2(-6, -2), 2.5, Color("#145A32"))
				draw_circle(Vector2(6, -2), 2.5, Color("#145A32"))
				draw_line(Vector2(-5, 4), Vector2(-2, 2), Color("#145A32"), 1.8)
				draw_line(Vector2(-2, 2), Vector2(2, 4), Color("#145A32"), 1.8)
				draw_line(Vector2(2, 4), Vector2(5, 2), Color("#145A32"), 1.8)

			# Overhead Status Badge
			var badge_y = -radius - 22
			var b_w = 96.0
			var b_h = 22.0
			draw_rect(Rect2(-b_w * 0.5, badge_y, b_w, b_h), Color(0.08, 0.1, 0.08, 0.92))
			draw_rect(Rect2(-b_w * 0.5, badge_y, b_w, b_h), Color("#27AE60"), false, 1.2)

			draw_string(ThemeDB.fallback_font, Vector2(-b_w * 0.5 + 6, badge_y + 10), "WASABI", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("#A9DFBF"))
			# 3 HP Dots
			for p in range(3):
				var dot_col = Color("#2ECC71") if p < hp else Color("#3E4A3E")
				draw_circle(Vector2(b_w * 0.5 - 24 + p * 8, badge_y + 6), 3.0, dot_col)
			draw_string(ThemeDB.fallback_font, Vector2(0, badge_y + 19), "Hit 3x • Push Out • Salt [S]", HORIZONTAL_ALIGNMENT_CENTER, -1, 7, Color("#D5F5E3"))

		Kind.CHILI:
			draw_circle(Vector2.ZERO, radius, Color("#E74C3C"))
			draw_arc(Vector2.ZERO, radius, 0, TAU, 20, Color("#922B21"), 2.0)
			draw_circle(Vector2(0, -radius * 0.8), radius * 0.3, Color("#27AE60"))
			draw_string(ThemeDB.fallback_font, Vector2(0, 4), "CHILI", HORIZONTAL_ALIGNMENT_CENTER, -1, 9, Color.WHITE)

		Kind.ICE:
			var s = radius * 1.6
			draw_rect(Rect2(-s * 0.5, -s * 0.5, s, s), Color(0.45, 0.85, 1.0, 0.85))
			draw_rect(Rect2(-s * 0.5, -s * 0.5, s, s), Color.WHITE, false, 2.0)
			draw_rect(Rect2(-s * 0.35, -s * 0.35, s * 0.25, s * 0.4), Color(1, 1, 1, 0.5))

		Kind.RIVAL:
			draw_circle(Vector2.ZERO, radius, Color("#8E44AD"))
			draw_arc(Vector2.ZERO, radius, 0, TAU, 28, Color("#5B2C6F"), 3.0)
			# Black belt
			draw_rect(Rect2(-radius * 0.9, radius * 0.2, radius * 1.8, radius * 0.3), Color("#1A1412"))
			# Menacing eyes
			draw_circle(Vector2(-radius * 0.35, -radius * 0.1), 4.0, Color("#E74C3C"))
			draw_circle(Vector2(radius * 0.35, -radius * 0.1), 4.0, Color("#E74C3C"))
			draw_string(ThemeDB.fallback_font, Vector2(0, -radius - 8), "RIVAL TENGU", HORIZONTAL_ALIGNMENT_CENTER, -1, 9, Color("#F1C40F"))
