class_name BowlArena
extends Node2D

enum ArenaMode { CIRCULAR, ELLIPTICAL, WOBBLE }

signal fruit_ring_out(fruit: SumoFruit)
signal rival_ring_out(rival: RivalSumo)
signal tawara_breached(bale_index: int, angle: float)
signal bale_hit(bale_index: int)
signal occupancy_changed(ratio: float)

@export var radius: float = 380.0
@export var slope_k: float = 0.55
@export var capacity_factor: float = 0.82
@export var arena_mode: ArenaMode = ArenaMode.CIRCULAR

var bales: Array[Dictionary] = []
var active_fruits: Array[SumoFruit] = []
var active_hazards: Array[Hazard] = []
var active_rival: RivalSumo = null
var dynamic_center: Vector2 = Vector2.ZERO

func _ready() -> void:
	_init_tawara_bales()

func setup_arena(mode_name: String, broken_indices: Array[int] = []) -> void:
	match mode_name:
		"ELLIPTICAL":
			arena_mode = ArenaMode.ELLIPTICAL
		"WOBBLE":
			arena_mode = ArenaMode.WOBBLE
		_:
			arena_mode = ArenaMode.CIRCULAR

	_init_tawara_bales()
	for idx in broken_indices:
		if idx >= 0 and idx < bales.size():
			bales[idx]["health"] = 0
			bales[idx]["breached"] = true
	queue_redraw()

func _init_tawara_bales() -> void:
	bales.clear()
	var count = 16
	for i in range(count):
		var angle = (float(i) / count) * TAU
		bales.append({
			"index": i,
			"angle": angle,
			"health": 3,
			"max_health": 3,
			"breached": false,
			"flash": 0.0
		})

func register_fruit(fruit: SumoFruit) -> void:
	if not active_fruits.has(fruit):
		active_fruits.append(fruit)

func unregister_fruit(fruit: SumoFruit) -> void:
	active_fruits.erase(fruit)

func register_hazard(hazard: Hazard) -> void:
	if not active_hazards.has(hazard):
		active_hazards.append(hazard)

func unregister_hazard(hazard: Hazard) -> void:
	active_hazards.erase(hazard)

func register_rival(rival: RivalSumo) -> void:
	active_rival = rival

func unregister_rival() -> void:
	active_rival = null

func _physics_process(delta: float) -> void:
	# Calculate dynamic center for Wobble Sea mode
	if arena_mode == ArenaMode.WOBBLE:
		var total_mass = 0.0
		var weighted_pos = Vector2.ZERO
		for f in active_fruits:
			if is_instance_valid(f) and f.state == SumoFruit.State.IN_RING:
				weighted_pos += (f.global_position - global_position) * f.mass
				total_mass += f.mass
		if active_rival and is_instance_valid(active_rival) and active_rival.ai_state != RivalSumo.AIState.RING_OUT:
			weighted_pos += (active_rival.global_position - global_position) * active_rival.mass
			total_mass += active_rival.mass

		if total_mass > 0.0:
			var target_center = (weighted_pos / total_mass) * 0.28
			dynamic_center = dynamic_center.lerp(target_center, delta * 2.5)
		else:
			dynamic_center = dynamic_center.lerp(Vector2.ZERO, delta * 2.5)
	else:
		dynamic_center = Vector2.ZERO

	var current_origin = global_position + dynamic_center

	# 1. Apply inward bowl gravity to active fruits
	var occupied_area = 0.0
	for f in active_fruits:
		if not is_instance_valid(f): continue
		if f.state == SumoFruit.State.RING_OUT: continue

		var offset = f.global_position - current_origin
		var dist = offset.length()
		var norm = offset.normalized() if dist > 0.1 else Vector2.UP

		# Parabolic bowl pull with elliptical anisotropy support
		if not f.entry_pending:
			var force_scale_y = 1.25 if arena_mode == ArenaMode.ELLIPTICAL else 1.0
			var fx = -norm.x * slope_k * dist * f.mass * 8.0
			var fy = -norm.y * slope_k * dist * f.mass * 8.0 * force_scale_y
			f.apply_central_force(Vector2(fx, fy))
			occupied_area += PI * pow(f.data.radius, 2)

		# Check entry into ring from launcher
		if f.entry_pending:
			if dist < radius * 0.85:
				f.entry_pending = false
				f.has_entered_ring = true
				f.was_in_rim_danger = false
				f.panic = false
			continue

		# Rim boundary check
		var rim_dist = dist + f.data.radius
		if rim_dist >= radius * 0.82:
			f.panic = true
			f.was_in_rim_danger = true
		else:
			if f.was_in_rim_danger and f.linear_velocity.dot(-norm) > 15.0:
				f.rim_save_timer = 1.2
				Sound.play_rim_save()
				Juice.request_banner("土俵際！", "TAWARA SAVE! NOT TODAY!", Color("#F1C40F"))
			f.panic = false
			f.was_in_rim_danger = false

		if rim_dist >= radius:
			var angle = fposmod(atan2(offset.y, offset.x), TAU)
			var bale_idx = int(round((angle / TAU) * 16.0)) % 16
			var bale = bales[bale_idx]

			if not bale["breached"]:
				var inward_normal = -norm
				var v_out = f.linear_velocity.dot(norm)
				if v_out > 0.0:
					f.linear_velocity = f.linear_velocity.bounce(inward_normal) * f.data.restitution
					f.global_position = current_origin + norm * (radius - f.data.radius - 2.0)
					Sound.play_slap()
					bale_hit.emit(bale_idx)

					if v_out > 105.0:
						bale["health"] -= 1
						bale["flash"] = 0.25
						Sound.play_splat()
						Juice.add_trauma(0.12)
						if bale["health"] <= 0:
							bale["breached"] = true
							tawara_breached.emit(bale_idx, bale["angle"])
							Sound.play_taiko()
							Juice.request_banner("俵割れ！", "TAWARA BREACHED!", Color("#E74C3C"))
			else:
				f.state = SumoFruit.State.RING_OUT
				fruit_ring_out.emit(f)
				Sound.play_ringout()
				Juice.add_trauma(0.35)
				Juice.request_banner("勇み足！", "RING OUT! LIVES -1", Color("#E74C3C"))
				_animate_fall(f)

	# 2. Bowl pull & rim check for Rival Sumo Boss
	if active_rival and is_instance_valid(active_rival) and active_rival.ai_state != RivalSumo.AIState.RING_OUT:
		var r_offset = active_rival.global_position - current_origin
		var r_dist = r_offset.length()
		var r_norm = r_offset.normalized() if r_dist > 0.1 else Vector2.UP
		active_rival.apply_central_force(-r_norm * slope_k * r_dist * active_rival.mass * 6.5)

		if r_dist + active_rival.radius >= radius:
			var angle = fposmod(atan2(r_offset.y, r_offset.x), TAU)
			var bale_idx = int(round((angle / TAU) * 16.0)) % 16
			var bale = bales[bale_idx]
			if not bale["breached"]:
				active_rival.linear_velocity = active_rival.linear_velocity.bounce(-r_norm) * 0.75
				active_rival.global_position = current_origin + r_norm * (radius - active_rival.radius - 2.0)
			else:
				active_rival.trigger_ring_out()
				rival_ring_out.emit(active_rival)

	# 3. Bowl pull & rim check for hazards
	for h in active_hazards:
		if not is_instance_valid(h): continue
		if h.ring_out: continue
		var offset = h.global_position - current_origin
		var dist = offset.length()
		var norm = offset.normalized() if dist > 0.1 else Vector2.UP
		h.apply_central_force(-norm * slope_k * dist * h.mass * 6.0)

		if dist + h.radius >= radius:
			var angle = fposmod(atan2(offset.y, offset.x), TAU)
			var bale_idx = int(round((angle / TAU) * 16.0)) % 16
			var bale = bales[bale_idx]
			if not bale["breached"]:
				h.linear_velocity = h.linear_velocity.bounce(-norm) * 0.7
				h.global_position = current_origin + norm * (radius - h.radius - 2.0)
			else:
				h.ring_out = true
				Sound.play_splat()
				Juice.request_banner("送り出し！", "HAZARD EJECTED! +180 PTS", Color("#2ECC71"))

	for b in bales:
		if b["flash"] > 0.0:
			b["flash"] -= delta

	var capacity = capacity_factor * PI * pow(radius, 2)
	occupancy_changed.emit(clampf(occupied_area / capacity, 0.0, 1.2))
	queue_redraw()

func _animate_fall(fruit: SumoFruit) -> void:
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(fruit, "scale", Vector2(0.1, 0.1), 0.6)
	tween.tween_property(fruit, "modulate:a", 0.0, 0.6)
	tween.chain().tween_callback(func():
		unregister_fruit(fruit)
		fruit.queue_free()
	)

func _draw() -> void:
	var plat_size = radius * 2.35
	var plat_rect = Rect2(-plat_size * 0.5, -plat_size * 0.5, plat_size, plat_size)
	draw_rect(plat_rect, Color("#C4A482"))
	draw_rect(plat_rect, Color("#8D6E63"), false, 4.0)

	var draw_center = dynamic_center

	# Concentric Sand Rings
	if arena_mode == ArenaMode.ELLIPTICAL:
		# Elliptical shape (radius x, radius y / 1.12)
		draw_circle(draw_center, radius, Color("#D2B48C"))
		draw_circle(draw_center, radius * 0.72, Color("#C9AB83"))
		draw_circle(draw_center, radius * 0.42, Color("#BFA07A"))
	else:
		draw_circle(draw_center, radius, Color("#D2B48C"))
		draw_circle(draw_center, radius * 0.72, Color("#C9AB83"))
		draw_circle(draw_center, radius * 0.42, Color("#BFA07A"))

	# Dynamic center marker for Wobble Sea mode
	if arena_mode == ArenaMode.WOBBLE and dynamic_center.length() > 5.0:
		draw_circle(draw_center, 8.0, Color(0.2, 0.6, 1.0, 0.5))
		draw_arc(draw_center, 16.0, 0, TAU, 16, Color(0.2, 0.6, 1.0, 0.8), 2.0)

	# Traditional Shikiri-sen starting lines
	var line_len = 65.0
	var line_gap = 22.0
	draw_line(draw_center + Vector2(-line_len * 0.5, -line_gap), draw_center + Vector2(line_len * 0.5, -line_gap), Color("#EAE0D0"), 5.0)
	draw_line(draw_center + Vector2(-line_len * 0.5, line_gap), draw_center + Vector2(line_len * 0.5, line_gap), Color("#EAE0D0"), 5.0)

	# 16 Tawara Straw Bales
	var bale_len = (TAU * radius) / 16.0
	for b in bales:
		var ang = b["angle"]
		var center = Vector2(cos(ang), sin(ang)) * radius
		var tangent = Vector2(-sin(ang), cos(ang))
		var p1 = center - tangent * (bale_len * 0.46)
		var p2 = center + tangent * (bale_len * 0.46)

		if b["breached"]:
			draw_line(p1, p2, Color("#5D4037"), 4.0)
		else:
			var straw_col = Color("#FFEB3B") if b["flash"] > 0.0 else Color("#E67E22")
			if b["health"] < 3:
				straw_col = straw_col.darkened(0.2)
			draw_line(p1, p2, straw_col, 12.0)
			draw_line(p1, p2, Color("#795548"), 2.0)
			draw_circle(p1 + (p2 - p1) * 0.25, 3.5, Color("#3E2723"))
			draw_circle(p1 + (p2 - p1) * 0.75, 3.5, Color("#3E2723"))
