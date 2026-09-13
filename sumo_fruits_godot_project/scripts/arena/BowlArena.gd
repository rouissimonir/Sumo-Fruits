class_name BowlArena
extends Node2D

signal fruit_entered(fruit: SumoFruit)
signal fruit_ringed_out(fruit: SumoFruit)
signal bale_damaged(index: int, health: int, hit_position: Vector2)
signal bale_broken(index: int, hit_position: Vector2)
signal rim_saved(fruit: SumoFruit)

@export var radius: float = 340.0
@export var slope_k: float = 0.55
@export var escape_speed_threshold: float = 220.0
@export var capacity_factor: float = 0.82
@export var rim_damping: float = 0.65
@export var bale_max_health: int = 3

var arena_mode: String = "CIRCULAR"
var radius_x: float = 340.0
var radius_y: float = 340.0
var wobble_offset: Vector2 = Vector2.ZERO
var tilt_acceleration: Vector2 = Vector2.ZERO
var active_fruits: Array[SumoFruit] = []
var bale_health: PackedInt32Array = []

func _ready() -> void:
	reset_bales()
	set_mode(arena_mode)
	queue_redraw()

func set_mode(mode: String) -> void:
	arena_mode = mode
	if mode == "ELLIPTICAL":
		var root_aspect := sqrt(1.25)
		radius_x = radius * root_aspect
		radius_y = radius / root_aspect
	else:
		radius_x = radius
		radius_y = radius
		if mode != "WOBBLE":
			wobble_offset = Vector2.ZERO
			tilt_acceleration = Vector2.ZERO
	queue_redraw()

func set_tuning(new_slope: float, new_escape_speed: float, new_rim_damping: float, new_bale_health: int) -> void:
	slope_k = new_slope
	escape_speed_threshold = new_escape_speed
	rim_damping = new_rim_damping
	if new_bale_health != bale_max_health:
		bale_max_health = new_bale_health
		reset_bales()

func reset_bales() -> void:
	bale_health = PackedInt32Array()
	for _index in range(16):
		bale_health.append(bale_max_health)
	queue_redraw()

func break_bales(indices: Array) -> void:
	for value in indices:
		var index := int(value)
		if index >= 0 and index < bale_health.size():
			bale_health[index] = 0
	queue_redraw()

func register_fruit(fruit: SumoFruit) -> void:
	if not active_fruits.has(fruit):
		active_fruits.append(fruit)

func unregister_fruit(fruit: SumoFruit) -> void:
	active_fruits.erase(fruit)

func update_wobble(delta: float) -> void:
	if arena_mode != "WOBBLE":
		return
	var weighted_offset := Vector2.ZERO
	var total_mass := 0.0
	for fruit in active_fruits:
		if is_instance_valid(fruit) and fruit.data and fruit.state == SumoFruit.State.IN_RING and not fruit.entry_pending:
			weighted_offset += (fruit.global_position - global_position) * fruit.data.mass
			total_mass += fruit.data.mass
	var target := Vector2.ZERO
	if total_mass > 0.0:
		target = (weighted_offset / total_mass * 0.35).limit_length(45.0)
	wobble_offset = wobble_offset.lerp(target, minf(1.0, delta * 2.5))
	tilt_acceleration = wobble_offset * 1.8
	queue_redraw()

func get_bowl_center() -> Vector2:
	return global_position + (wobble_offset if arena_mode == "WOBBLE" else Vector2.ZERO)

func get_bowl_acceleration(pos: Vector2) -> Vector2:
	var offset := pos - global_position
	var acceleration: Vector2
	if arena_mode == "ELLIPTICAL":
		acceleration = Vector2(-slope_k * radius / radius_x * offset.x, -slope_k * radius / radius_y * offset.y)
	else:
		acceleration = -slope_k * offset
	if arena_mode == "WOBBLE":
		acceleration += tilt_acceleration
	return acceleration

func get_metrics(pos: Vector2, body_radius: float) -> Dictionary:
	var center := get_bowl_center()
	var q := pos - center
	if arena_mode == "ELLIPTICAL":
		var angle := atan2(q.y, q.x)
		var cosine := cos(angle)
		var sine := sin(angle)
		var boundary_radius := radius_x * radius_y / sqrt(pow(radius_y * cosine, 2) + pow(radius_x * sine, 2))
		var distance := q.length()
		var gradient := Vector2(2.0 * q.x / pow(radius_x, 2), 2.0 * q.y / pow(radius_y, 2)).normalized()
		return {"distance": distance, "d_center": boundary_radius - distance, "d_surface": boundary_radius - distance - body_radius, "normal": gradient, "angle": fposmod(angle, TAU)}
	var distance := q.length()
	var normal := q.normalized() if distance > 0.001 else Vector2.UP
	return {"distance": distance, "d_center": radius - distance, "d_surface": radius - distance - body_radius, "normal": normal, "angle": fposmod(atan2(q.y, q.x), TAU)}

func get_occupancy_ratio(extra_bodies: Array = []) -> float:
	var occupied_area := 0.0
	for fruit in active_fruits:
		if is_instance_valid(fruit) and fruit.data and fruit.state != SumoFruit.State.RING_OUT and not fruit.entry_pending:
			occupied_area += PI * pow(fruit.data.radius, 2)
	for body in extra_bodies:
		if is_instance_valid(body) and not body.ring_out:
			occupied_area += PI * pow(body.body_radius, 2)
	return occupied_area / (capacity_factor * PI * pow(radius, 2))

func get_bale_index(angle: float) -> int:
	return int(floor(fposmod(angle, TAU) / TAU * 16.0)) % 16

func _physics_process(delta: float) -> void:
	update_wobble(delta)
	for index in range(active_fruits.size() - 1, -1, -1):
		var fruit := active_fruits[index]
		if not is_instance_valid(fruit):
			active_fruits.remove_at(index)
			continue
		if fruit.freeze or fruit.state == SumoFruit.State.RING_OUT or fruit.state == SumoFruit.State.MERGING or not fruit.data:
			continue
		fruit.apply_central_force(get_bowl_acceleration(fruit.global_position) * fruit.mass)
		var metrics := get_metrics(fruit.global_position, fruit.data.radius)
		var normal: Vector2 = metrics.normal
		var outward_speed := fruit.linear_velocity.dot(normal)

		if fruit.entry_pending:
			if metrics.d_surface > 25.0:
				fruit.entry_pending = false
				fruit.has_entered_ring = true
				fruit.rim_permission = false
				fruit_entered.emit(fruit)
			elif metrics.distance > radius + 260.0 or fruit.entry_age > 5.0:
				_ring_out(fruit)
			continue

		var bale_index := get_bale_index(metrics.angle)
		var threshold := 80.0 if bale_health[bale_index] <= 0 else escape_speed_threshold
		if metrics.d_surface <= 15.0 and outward_speed >= threshold:
			fruit.rim_permission = true
		elif metrics.d_surface > 25.0:
			fruit.rim_permission = false

		if metrics.d_center < 0.0:
			_ring_out(fruit)
			continue
		if metrics.d_surface <= 0.0 and not fruit.rim_permission and outward_speed > 0.0:
			fruit.was_in_rim_danger = true
			fruit.banked_this_shot = true
			if outward_speed > 115.0 and bale_health[bale_index] > 0:
				bale_health[bale_index] = maxi(0, bale_health[bale_index] - 1)
				bale_damaged.emit(bale_index, bale_health[bale_index], fruit.global_position)
				if bale_health[bale_index] == 0:
					bale_broken.emit(bale_index, fruit.global_position)
				queue_redraw()
		fruit.linear_velocity -= normal * outward_speed * (1.0 + fruit.data.restitution)
		var corrected_distance: float = float(metrics.distance) + float(metrics.d_surface)
		fruit.global_position -= normal * maxf(0.0, metrics.distance - corrected_distance)
		fruit.linear_velocity *= clampf(rim_damping, 0.0, 1.0)
		fruit.trigger_squash(outward_speed * fruit.mass, normal)

		if metrics.d_surface <= 22.0 and outward_speed > 15.0:
			fruit.was_in_rim_danger = true
		if fruit.was_in_rim_danger and metrics.d_surface > 45.0 and outward_speed <= 12.0 and not fruit.near_rim_saved:
			fruit.was_in_rim_danger = false
			fruit.near_rim_saved = true
			fruit.wiping_sweat_timer = 1.4
			rim_saved.emit(fruit)
		elif metrics.d_surface > 70.0:
			fruit.near_rim_saved = false
		fruit.panic = (metrics.d_surface < 28.0 and outward_speed > 10.0) or metrics.d_surface < 15.0

func _ring_out(fruit: SumoFruit) -> void:
	unregister_fruit(fruit)
	fruit.commit_ring_out()
	fruit_ringed_out.emit(fruit)

func _draw() -> void:
	var center_offset := wobble_offset if arena_mode == "WOBBLE" else Vector2.ZERO
	draw_set_transform(center_offset, 0.0, Vector2(radius_x / radius, radius_y / radius))
	draw_circle(Vector2.ZERO, radius + 36.0, Color("6e523a"))
	draw_circle(Vector2.ZERO, radius + 12.0, Color("b69665"))
	draw_circle(Vector2.ZERO, radius, Color("d9c08f"))
	draw_circle(Vector2.ZERO, radius - 9.0, Color("c9a973"))
	draw_arc(Vector2.ZERO, radius - 7.0, 0.0, TAU, 128, Color(0.55, 0.36, 0.18, 0.45), 3.0, true)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for index in range(16):
		var angle := TAU * (float(index) + 0.5) / 16.0
		var position := center_offset + Vector2(cos(angle) * (radius_x + 10.0), sin(angle) * (radius_y + 10.0))
		var health := bale_health[index] if index < bale_health.size() else bale_max_health
		var color := Color("e1bd70") if health >= 3 else Color("c99b52") if health == 2 else Color("a96d3a") if health == 1 else Color(0.25, 0.16, 0.1, 0.35)
		draw_set_transform(position, angle + PI * 0.5, Vector2.ONE)
		if health > 0:
			draw_rect(Rect2(-30, -9, 60, 18), color, true)
			draw_line(Vector2(-18, -9), Vector2(-18, 9), Color("76502c"), 2.0)
			draw_line(Vector2(18, -9), Vector2(18, 9), Color("76502c"), 2.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
