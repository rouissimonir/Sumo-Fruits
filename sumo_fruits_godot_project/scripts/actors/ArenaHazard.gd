class_name ArenaHazard
extends RigidBody2D

signal defeated(hazard: ArenaHazard, reason: String)
signal special_contact(kind: String, position: Vector2)
signal rival_action(kind: String, position: Vector2)

var kind: String = "BUG"
var display_name: String = "Rotten Beetle"
var body_radius: float = 18.0
var score_value: int = 120
var resistance: float = 0.2
var ring_out: bool = false
var cleansing: bool = false
var hit_points: int = 1
var max_hit_points: int = 1
var hit_cooldown: float = 0.0
var bowl: BowlArena = null
var profile: Dictionary = {}
var arrow_angle: float = -PI * 0.5

var shot_counter: int = 0
var attack_interval: int = 2
var intent_direction: Vector2 = Vector2.DOWN
var intent_target: Vector2 = Vector2.ZERO
var intent_locked: bool = false
var shots_until_attack: int = 2
var attack_active: bool = false
var attack_timer: float = 0.0
var attack_duration: float = 0.45
var slap_steps: int = 0
var recovery_timer: float = 0.0
var cancel_next_attack: bool = false

func configure(new_kind: String, arena: BowlArena, rival_profile: Dictionary = {}) -> void:
	kind = new_kind
	bowl = arena
	profile = rival_profile
	match kind:
		"ICE":
			display_name = "Ice Cube"; body_radius = 22.0; mass = 6.0; linear_damp = 0.35; score_value = 150
		"WASABI":
			display_name = "Wasabi Sludge"; body_radius = 24.0; mass = 5.0; linear_damp = 1.1; score_value = 180; hit_points = 3; max_hit_points = 3
		"CHILI":
			display_name = "Fiery Chili"; body_radius = 20.0; mass = 4.0; linear_damp = 0.4; score_value = 220; arrow_angle = randf_range(0.0, TAU)
		"RIVAL":
			display_name = str(profile.get("name", "Rival Rikishi")); body_radius = float(profile.get("radius", 30.0)); mass = float(profile.get("mass", 8.5)); linear_damp = 0.6; score_value = int(profile.get("score", 600)); resistance = 0.5; attack_interval = int(profile.get("interval", 2))
		_:
			display_name = "Rotten Beetle"; body_radius = 18.0; mass = 3.5; linear_damp = 0.7; score_value = 120

func _ready() -> void:
	gravity_scale = 0.0
	lock_rotation = kind != "ICE"
	contact_monitor = true
	max_contacts_reported = 16
	var shape := CircleShape2D.new()
	shape.radius = body_radius
	$CollisionShape2D.shape = shape
	var material := PhysicsMaterial.new()
	material.bounce = 0.95 if kind in ["ICE", "CHILI"] else 0.4 if kind == "WASABI" else 0.85
	material.friction = 0.05 if kind == "ICE" else 0.25
	physics_material_override = material
	body_entered.connect(_on_body_entered)
	add_to_group("hazards")
	if kind == "RIVAL":
		plan_intent()
	queue_redraw()

func _physics_process(delta: float) -> void:
	if hit_cooldown > 0.0:
		hit_cooldown -= delta
	if recovery_timer > 0.0:
		recovery_timer -= delta
	if ring_out:
		modulate.a = maxf(0.0, modulate.a - delta * 2.0)
		if modulate.a <= 0.01:
			queue_free()
		return
	if bowl:
		apply_central_force(bowl.get_bowl_acceleration(global_position) * mass)
		var metrics := bowl.get_metrics(global_position, body_radius)
		var normal: Vector2 = metrics.normal
		var outward_speed := linear_velocity.dot(normal)
		if metrics.d_center < 0.0:
			defeat("RING_OUT")
		elif metrics.d_surface <= 0.0 and not cleansing and outward_speed > 0.0 and outward_speed < 180.0:
			linear_velocity -= normal * outward_speed * (1.0 + float(physics_material_override.bounce))
			global_position -= normal * maxf(0.0, -float(metrics.d_surface))
	if kind == "RIVAL":
		_update_rival(delta)
	rotation += (linear_velocity.x + linear_velocity.y) * delta * 0.002 if kind != "RIVAL" else 0.0
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if body is not SumoFruit or ring_out:
		return
	var fruit := body as SumoFruit
	if fruit.team != "PLAYER":
		return
	match kind:
		"WASABI":
			fruit.linear_velocity *= 0.72
			if hit_cooldown <= 0.0:
				hit_cooldown = 0.25
				var damage := 2 if fruit.data.tier >= 4 or fruit.linear_velocity.length() > 160.0 else 1
				hit_points = maxi(0, hit_points - damage)
				special_contact.emit("WASABI_HIT", global_position)
				if hit_points <= 0:
					defeat("SQUASHED")
		"CHILI":
			var speed := fruit.linear_velocity.length()
			var direction := fruit.linear_velocity.normalized() if speed > 25.0 else Vector2.from_angle(arrow_angle)
			var boost := minf(1350.0 / fruit.mass, minf(300.0, maxf(0.0, 480.0 - speed)))
			fruit.apply_central_impulse(direction * boost * fruit.mass)
			special_contact.emit("CHILI_BOOST", global_position)
			defeat("CONSUMED")
		_:
			special_contact.emit("BUMP", global_position)

func defeat(reason: String) -> void:
	if ring_out:
		return
	ring_out = true
	collision_layer = 0
	collision_mask = 0
	defeated.emit(self, reason)

func purify() -> void:
	if kind in ["CHILI", "RIVAL"] or ring_out:
		return
	cleansing = true
	defeat("PURIFIED")

func plan_intent() -> void:
	if kind != "RIVAL" or ring_out:
		return
	var target: SumoFruit = null
	var closest := INF
	for node in get_tree().get_nodes_in_group("fruits"):
		if node is SumoFruit and node.team == "PLAYER" and node.state == SumoFruit.State.IN_RING and not node.entry_pending:
			var distance := global_position.distance_to(node.global_position)
			if distance < closest:
				closest = distance
				target = node
	intent_target = target.global_position if target else (bowl.global_position + Vector2(0, 100))
	intent_direction = global_position.direction_to(intent_target)
	shots_until_attack = maxi(1, attack_interval - (shot_counter % attack_interval))
	intent_locked = true
	queue_redraw()

func on_player_launch() -> void:
	if kind != "RIVAL" or ring_out:
		return
	shot_counter += 1
	shots_until_attack = maxi(1, attack_interval - (shot_counter % attack_interval))
	if shot_counter % attack_interval == 0:
		if cancel_next_attack:
			cancel_next_attack = false
			plan_intent()
			return
		attack_active = true
		attack_timer = 0.0
		var move := str(profile.get("move", "OSHIDASHI_PUSH"))
		if move == "TSUPPARI_SLAP":
			attack_duration = 0.6
			slap_steps = 3
		else:
			attack_duration = 0.45
			linear_velocity = intent_direction * (300.0 if mass > 12.0 else 340.0)
	else:
		plan_intent()

func _update_rival(delta: float) -> void:
	if not attack_active:
		return
	attack_timer += delta
	var move := str(profile.get("move", "OSHIDASHI_PUSH"))
	if move == "TSUPPARI_SLAP":
		var step_duration := attack_duration / 3.0
		var desired_remaining := 3 - int(floor(attack_timer / step_duration))
		if desired_remaining < slap_steps:
			slap_steps = desired_remaining
			for node in get_tree().get_nodes_in_group("fruits"):
				if node is SumoFruit and node.team == "PLAYER" and global_position.distance_to(node.global_position) < 155.0:
					var direction := global_position.direction_to(node.global_position)
					if direction.dot(intent_direction) > 0.65:
						node.apply_central_impulse(direction * 120.0 * node.mass)
			rival_action.emit("SLAP", global_position)
	else:
		apply_central_force(intent_direction * 180.0 * mass * maxf(0.0, 1.0 - attack_timer / attack_duration))
		rival_action.emit("RUSH", global_position)
	if attack_timer >= attack_duration:
		attack_active = false
		recovery_timer = 0.6
		plan_intent()

func _draw() -> void:
	if kind == "RIVAL" and intent_locked and not attack_active:
		var local_direction := intent_direction.rotated(-global_rotation)
		var telegraph_color := Color(0.95, 0.35, 0.2, 0.38)
		if str(profile.get("move", "")) == "TSUPPARI_SLAP":
			var points := PackedVector2Array([Vector2.ZERO, local_direction.rotated(-PI / 4.0) * 130.0, local_direction.rotated(PI / 4.0) * 130.0])
			draw_colored_polygon(points, telegraph_color)
		else:
			draw_dashed_line(Vector2.ZERO, local_direction * minf(260.0, global_position.distance_to(intent_target) + 50.0), telegraph_color, 5.0, 12.0)

	match kind:
		"ICE":
			var square := PackedVector2Array([Vector2(-17,-17),Vector2(17,-17),Vector2(17,17),Vector2(-17,17)])
			draw_colored_polygon(square, Color("8bd8ff")); draw_polyline(square, Color("d9f5ff"), 3.0)
		"WASABI":
			var color := Color("70bf3f") if hit_cooldown <= 0.0 else Color.WHITE
			draw_circle(Vector2.ZERO, body_radius, color)
			draw_circle(Vector2(-8,-5), 5, Color("315b25")); draw_circle(Vector2(8,-5), 5, Color("315b25"))
			for index in range(max_hit_points):
				draw_rect(Rect2(-18 + index * 13, -body_radius - 11, 10, 4), Color("62d449") if index < hit_points else Color("49342b"), true)
		"CHILI":
			var direction := Vector2.from_angle(arrow_angle)
			draw_circle(Vector2.ZERO, body_radius, Color("e8412d")); draw_line(Vector2.ZERO, direction * 27, Color("ffd15c"), 5.0)
		"RIVAL":
			var rival_color := Color(str(profile.get("color", "#9B59B6")))
			draw_circle(Vector2.ZERO, body_radius + 4, rival_color.darkened(0.45)); draw_circle(Vector2.ZERO, body_radius, rival_color)
			draw_rect(Rect2(-body_radius * 0.9, body_radius * 0.28, body_radius * 1.8, 10), Color("f1c40f"), true)
			draw_circle(Vector2(-body_radius * 0.28,-5), 4, Color.WHITE); draw_circle(Vector2(body_radius * 0.28,-5), 4, Color.WHITE)
			draw_string(ThemeDB.fallback_font, Vector2(-body_radius, -body_radius - 14), str(profile.get("crest", "R")), HORIZONTAL_ALIGNMENT_CENTER, body_radius * 2.0, 15, Color.WHITE)
		_:
			draw_circle(Vector2.ZERO, body_radius, Color("704229")); draw_circle(Vector2(-7,-4), 4, Color("f1c40f")); draw_circle(Vector2(7,-4), 4, Color("f1c40f"))
			for angle in [0.5, 2.6, 3.7, 5.7]:
				draw_line(Vector2.from_angle(angle) * 12, Vector2.from_angle(angle) * 25, Color("3a2218"), 3.0)
