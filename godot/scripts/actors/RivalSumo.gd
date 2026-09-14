class_name RivalSumo
extends RigidBody2D

enum MoveType { OSHIDASHI_PUSH, TSUPPARI_SLAP }
enum AIState { IDLE, PLANNING, EXECUTING, RECOVERING, RING_OUT }

signal rival_defeated(rival_id: String, points: int)
signal attack_executed(move_type: MoveType)

@export var profile_id: String = "TENGU_ORANGE"
@export var rival_name: String = "Tengu Orange"
@export var rival_title: String = "Wind God of the Dohyo"
@export var tier: int = 5
@export var radius: float = 40.0
@export var move_type: MoveType = MoveType.OSHIDASHI_PUSH
@export var attack_interval: int = 2
@export var crest_symbol: String = "👺"
@export var base_color: Color = Color("#E67E22")
@export var mawashi_color: Color = Color("#16A085")

var ai_state: AIState = AIState.PLANNING
var shot_counter: int = 0
var intent_dir: Vector2 = Vector2.DOWN
var target_pos: Vector2 = Vector2.ZERO
var execution_timer: float = 0.0
var execution_total_time: float = 0.45
var slap_steps_remaining: int = 0
var recovery_timer: float = 0.0
var attack_canceled_by_yokozuna: bool = false
var fall_progress: float = 0.0

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

static func create_profile(id: String) -> Dictionary:
	match id:
		"TENGU_ORANGE":
			return {
				"name": "Tengu Orange",
				"title": "Wind God of the Dohyo",
				"tier": 5,
				"radius": 40.0,
				"mass": 10.5,
				"color": Color("#E67E22"),
				"mawashi": Color("#16A085"),
				"crest": "👺",
				"move": MoveType.OSHIDASHI_PUSH,
				"interval": 2,
				"defeat_quote": "Felled by pristine positioning!"
			}
		"CHERRY_SLAPPER":
			return {
				"name": "Cherry Slapper",
				"title": "Twin-Stem Tsuppari Virtuoso",
				"tier": 2,
				"radius": 34.0,
				"mass": 7.5,
				"color": Color("#C0392B"),
				"mawashi": Color("#2C3E50"),
				"crest": "🍒",
				"move": MoveType.TSUPPARI_SLAP,
				"interval": 2,
				"defeat_quote": "My flurries met your stone defense..."
			}
		"COCONUT_TANK":
			return {
				"name": "Coconut Tank",
				"title": "Unyielding Shell Rikishi",
				"tier": 8,
				"radius": 52.0,
				"mass": 28.0,
				"color": Color("#795548"),
				"mawashi": Color("#F39C12"),
				"crest": "🥥",
				"move": MoveType.OSHIDASHI_PUSH,
				"interval": 2,
				"defeat_quote": "Even ancient ironwood can be uprooted!"
			}
		"DRAGONFRUIT_YOKOZUNA":
			return {
				"name": "Dragonfruit Yokozuna",
				"title": "Grand Champion of the Celestial Bowl",
				"tier": 10,
				"radius": 60.0,
				"mass": 42.0,
				"color": Color("#8E44AD"),
				"mawashi": Color("#E74C3C"),
				"crest": "🐉",
				"move": MoveType.OSHIDASHI_PUSH,
				"interval": 2,
				"defeat_quote": "Splendid bout! You are worthy of the white tsuna cord."
			}
		_:
			return create_profile("TENGU_ORANGE")

func setup_profile(id: String) -> void:
	profile_id = id
	var p = create_profile(id)
	rival_name = p["name"]
	rival_title = p["title"]
	tier = p["tier"]
	radius = p["radius"]
	mass = p["mass"]
	base_color = p["color"]
	mawashi_color = p["mawashi"]
	crest_symbol = p["crest"]
	move_type = p["move"]
	attack_interval = p["interval"]

	gravity_scale = 0.0
	contact_monitor = true
	max_contacts_reported = 16
	linear_damp = 1.2
	lock_rotation = true

	if collision_shape:
		var circle = CircleShape2D.new()
		circle.radius = radius
		collision_shape.shape = circle

	queue_redraw()

func _ready() -> void:
	setup_profile(profile_id)
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	if ai_state == AIState.RING_OUT:
		fall_progress += delta * 2.0
		scale = Vector2.ONE * maxf(0.1, 1.0 - fall_progress)
		modulate.a = maxf(0.0, 1.0 - fall_progress)
		if fall_progress >= 1.0:
			queue_free()
		return

	if ai_state == AIState.RECOVERING:
		recovery_timer -= delta
		if recovery_timer <= 0.0:
			ai_state = AIState.PLANNING
			plan_next_intent()
		queue_redraw()
		return

	if ai_state == AIState.EXECUTING:
		execution_timer += delta
		if move_type == MoveType.OSHIDASHI_PUSH:
			var thrust = 220.0 * (1.0 - execution_timer / execution_total_time)
			apply_central_force(intent_dir * thrust * mass)
			if execution_timer >= execution_total_time:
				ai_state = AIState.RECOVERING
				recovery_timer = 0.65
		elif move_type == MoveType.TSUPPARI_SLAP:
			var step_dur = execution_total_time / 3.0
			var step_progress = fmod(execution_timer, step_dur)
			if step_progress < delta * 3.0 and slap_steps_remaining > 0:
				slap_steps_remaining -= 1
				apply_central_impulse(intent_dir * 130.0 * mass * 0.15)
				Sound.play_slap()
				Juice.add_trauma(0.12)
			if execution_timer >= execution_total_time:
				ai_state = AIState.RECOVERING
				recovery_timer = 0.75

	queue_redraw()

func plan_next_intent() -> void:
	if ai_state == AIState.RING_OUT: return
	var fruits = get_tree().get_nodes_in_group("fruits")
	var nearest: SumoFruit = null
	var min_dist = 99999.0

	for f in fruits:
		if f is SumoFruit and f.state == SumoFruit.State.IN_RING:
			var d = (f.global_position - global_position).length()
			if d < min_dist:
				min_dist = d
				nearest = f

	if nearest:
		target_pos = nearest.global_position
		intent_dir = (target_pos - global_position).normalized()
	else:
		target_pos = global_position + Vector2.DOWN * 120.0
		intent_dir = Vector2.DOWN

	queue_redraw()

func on_player_launch() -> void:
	if ai_state == AIState.RING_OUT: return
	shot_counter += 1

	if shot_counter % attack_interval == 0:
		if not attack_canceled_by_yokozuna:
			start_execution()
		else:
			attack_canceled_by_yokozuna = false
			ai_state = AIState.RECOVERING
			recovery_timer = 0.9
	else:
		plan_next_intent()

func start_execution() -> void:
	ai_state = AIState.EXECUTING
	execution_timer = 0.0
	if move_type == MoveType.OSHIDASHI_PUSH:
		execution_total_time = 0.5
		var push_speed = 180.0 + (50.0 if mass < 15.0 else 20.0)
		apply_central_impulse(intent_dir * push_speed * mass * 0.1)
		Sound.play_taiko()
		Juice.request_banner("押し出し！", "RIVAL OSHIDASHI DRIVE!", Color("#E74C3C"))
	elif move_type == MoveType.TSUPPARI_SLAP:
		execution_total_time = 0.65
		slap_steps_remaining = 3
		Sound.play_hyoshigi()
		Juice.request_banner("突っ張り！", "RIVAL TSUPPARI FLURRY!", Color("#E67E22"))

	attack_executed.emit(move_type)

func cancel_attack_yokozuna() -> void:
	attack_canceled_by_yokozuna = true
	ai_state = AIState.RECOVERING
	recovery_timer = 1.2
	linear_velocity *= 0.2
	Juice.request_banner("横綱の威厳！", "RIVAL ATTACK REBUFFED!", Color("#F1C40F"))

func trigger_ring_out() -> void:
	ai_state = AIState.RING_OUT
	Sound.play_ringout()
	Juice.add_trauma(0.5)
	Juice.request_banner("寄り切り！", "RIVAL EJECTED! VICTORY!", Color("#2ECC71"))
	rival_defeated.emit(profile_id, 1000 * tier)

func _on_body_entered(other: Node) -> void:
	if other is SumoFruit:
		var rel_v = linear_velocity - other.linear_velocity
		var spd = rel_v.length()
		if spd > 50.0:
			Sound.play_slap()
			Juice.add_trauma(0.15)
			if other.data and other.data.tier >= 11:
				cancel_attack_yokozuna()

func _draw() -> void:
	var r = radius

	# Draw telegraphed intent line/cone
	if ai_state == AIState.PLANNING:
		var shots_left = attack_interval - (shot_counter % attack_interval)
		var is_next = shots_left == 1
		var col = Color(1.0, 0.2, 0.2, 0.75) if is_next else Color(1.0, 0.8, 0.2, 0.4)
		var local_target = to_local(target_pos)

		if move_type == MoveType.OSHIDASHI_PUSH:
			# Rush lane
			var fwd = intent_dir * minf(220.0, local_target.length())
			var left_norm = Vector2(-intent_dir.y, intent_dir.x) * (r * 0.7)
			draw_line(left_norm, fwd + left_norm, col, 2.0)
			draw_line(-left_norm, fwd - left_norm, col, 2.0)
			draw_line(Vector2.ZERO, fwd, col, 3.5)
			# Arrow head
			draw_line(fwd, fwd - intent_dir * 18.0 + left_norm * 0.6, col, 3.0)
			draw_line(fwd, fwd - intent_dir * 18.0 - left_norm * 0.6, col, 3.0)
		elif move_type == MoveType.TSUPPARI_SLAP:
			# Slap cone
			var ang_spread = 0.4
			var base_ang = intent_dir.angle()
			var p_l = Vector2(cos(base_ang - ang_spread), sin(base_ang - ang_spread)) * 140.0
			var p_r = Vector2(cos(base_ang + ang_spread), sin(base_ang + ang_spread)) * 140.0
			draw_line(Vector2.ZERO, p_l, col, 2.0)
			draw_line(Vector2.ZERO, p_r, col, 2.0)
			draw_arc(Vector2.ZERO, 140.0, base_ang - ang_spread, base_ang + ang_spread, 12, col, 2.0)

	# Main Body
	draw_circle(Vector2.ZERO, r, base_color)
	draw_arc(Vector2.ZERO, r, 0, TAU, 32, base_color.darkened(0.3), 3.0)
	draw_circle(Vector2(-r * 0.3, -r * 0.3), r * 0.25, Color(1, 1, 1, 0.35))

	# Mawashi belt
	var m_w = r * 2.0
	var m_h = r * 0.3
	draw_rect(Rect2(-m_w * 0.5, r * 0.1, m_w, m_h), mawashi_color)
	draw_rect(Rect2(-m_w * 0.5, r * 0.1, m_w, m_h), Color(0, 0, 0, 0.4), false, 2.0)
	# Knot
	draw_rect(Rect2(-r * 0.2, r * 0.05, r * 0.4, m_h * 1.3), mawashi_color)

	# Topknot Chonmage
	var topknot_pos = Vector2(0, -r * 0.95)
	draw_circle(topknot_pos, r * 0.22, Color("#1A1412"))
	draw_arc(topknot_pos, r * 0.22, 0, TAU, 16, Color("#3B2F2A"), 1.8)

	# Fierce Eyes
	var eye_x = r * 0.32
	var eye_y = -r * 0.12
	draw_circle(Vector2(-eye_x, eye_y), r * 0.15, Color.WHITE)
	draw_circle(Vector2(eye_x, eye_y), r * 0.15, Color.WHITE)
	var pupil_offset = intent_dir * (r * 0.06)
	draw_circle(Vector2(-eye_x, eye_y) + pupil_offset, r * 0.08, Color("#1A1412"))
	draw_circle(Vector2(eye_x, eye_y) + pupil_offset, r * 0.08, Color("#1A1412"))

	# Angry Eyebrows
	draw_line(Vector2(-eye_x - 8, eye_y - 6), Vector2(-eye_x + 6, eye_y - 2), Color("#1A1412"), 3.0)
	draw_line(Vector2(eye_x + 8, eye_y - 6), Vector2(eye_x - 6, eye_y - 2), Color("#1A1412"), 3.0)

	# Overhead Boss Tag
	var tag_y = -r - 28.0
	var tag_w = 110.0
	draw_rect(Rect2(-tag_w * 0.5, tag_y, tag_w, 22.0), Color(0.1, 0.08, 0.08, 0.9))
	draw_rect(Rect2(-tag_w * 0.5, tag_y, tag_w, 22.0), Color("#E74C3C"), false, 1.5)
	draw_string(ThemeDB.fallback_font, Vector2(0, tag_y + 15), crest_symbol + " " + rival_name.to_upper(), HORIZONTAL_ALIGNMENT_CENTER, -1, 9, Color("#FFD700"))
