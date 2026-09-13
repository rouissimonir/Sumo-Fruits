class_name MergeClashManager
extends Node

signal clash_started(position: Vector2, tier: int)
signal clash_pulse(position: Vector2, tier: int)
signal fusion_committed(fruit_a: SumoFruit, fruit_b: SumoFruit, new_tier: int, spawn_pos: Vector2, velocity: Vector2, score: int)

@export var clash_duration: float = 0.5
var active_clashes: Dictionary = {}
var next_clash_id: int = 1

func clear() -> void:
	for record in active_clashes.values():
		for fruit_key in ["a", "b"]:
			var fruit: SumoFruit = record[fruit_key]
			if is_instance_valid(fruit):
				fruit.freeze = false
				fruit.state = SumoFruit.State.IN_RING
	active_clashes.clear()

func has_active_clashes() -> bool:
	return not active_clashes.is_empty()

func handle_contact(body_a: SumoFruit, body_b: SumoFruit, relative_speed: float) -> void:
	if not is_instance_valid(body_a) or not is_instance_valid(body_b) or not body_a.data or not body_b.data:
		return
	if body_a.team != "PLAYER" or body_b.team != "PLAYER":
		return
	if body_a.data.tier != body_b.data.tier or body_a.data.tier >= 11:
		return
	if body_a.entry_pending or body_b.entry_pending:
		return
	if body_a.state != SumoFruit.State.IN_RING or body_b.state != SumoFruit.State.IN_RING:
		return
	if relative_speed >= 150.0:
		start_clash(body_a, body_b)
	else:
		commit_fusion(body_a, body_b, body_a.linear_velocity, body_b.linear_velocity, Vector2.ZERO)

func start_clash(fruit_a: SumoFruit, fruit_b: SumoFruit) -> void:
	var clash_id := next_clash_id
	next_clash_id += 1
	var direction := fruit_a.global_position.direction_to(fruit_b.global_position)
	if direction == Vector2.ZERO:
		direction = Vector2.RIGHT
	var midpoint := (fruit_a.global_position + fruit_b.global_position) * 0.5
	var lock_a := midpoint - direction * fruit_a.data.radius
	var lock_b := midpoint + direction * fruit_b.data.radius
	active_clashes[clash_id] = {"a": fruit_a, "b": fruit_b, "elapsed": 0.0, "lock_a": lock_a, "lock_b": lock_b, "velocity_a": fruit_a.linear_velocity, "velocity_b": fruit_b.linear_velocity, "deferred": Vector2.ZERO, "pulse": -1}
	fruit_a.state = SumoFruit.State.CLASHING
	fruit_b.state = SumoFruit.State.CLASHING
	fruit_a.clash_id = clash_id
	fruit_b.clash_id = clash_id
	fruit_a.freeze = true
	fruit_b.freeze = true
	clash_started.emit(midpoint, fruit_a.data.tier)

func add_deferred_impulse(fruit: SumoFruit, impulse: Vector2) -> bool:
	for clash_id in active_clashes:
		var record: Dictionary = active_clashes[clash_id]
		if record.a == fruit or record.b == fruit:
			record.deferred += impulse
			active_clashes[clash_id] = record
			return true
	return false

func _physics_process(delta: float) -> void:
	var completed: Array[int] = []
	for clash_id in active_clashes:
		var record: Dictionary = active_clashes[clash_id]
		var fruit_a: SumoFruit = record.a
		var fruit_b: SumoFruit = record.b
		if not is_instance_valid(fruit_a) or not is_instance_valid(fruit_b):
			completed.append(clash_id)
			continue
		record.elapsed += delta
		var vibration := sin(record.elapsed * TAU * 25.0) * 2.2
		var normal: Vector2 = Vector2(record.lock_a).direction_to(Vector2(record.lock_b))
		fruit_a.global_position = record.lock_a - normal * vibration
		fruit_b.global_position = record.lock_b + normal * vibration
		var pulse_index := int(floor(record.elapsed * 25.0))
		if pulse_index != record.pulse:
			record.pulse = pulse_index
			clash_pulse.emit((fruit_a.global_position + fruit_b.global_position) * 0.5, fruit_a.data.tier)
		active_clashes[clash_id] = record
		if record.elapsed >= clash_duration:
			fruit_a.freeze = false
			fruit_b.freeze = false
			commit_fusion(fruit_a, fruit_b, record.velocity_a, record.velocity_b, record.deferred)
			completed.append(clash_id)
	for clash_id in completed:
		active_clashes.erase(clash_id)

func commit_fusion(fruit_a: SumoFruit, fruit_b: SumoFruit, incoming_a: Vector2, incoming_b: Vector2, deferred_impulse: Vector2) -> void:
	if not is_instance_valid(fruit_a) or not is_instance_valid(fruit_b):
		return
	if fruit_a.state == SumoFruit.State.MERGING or fruit_b.state == SumoFruit.State.MERGING:
		return
	fruit_a.state = SumoFruit.State.MERGING
	fruit_b.state = SumoFruit.State.MERGING
	var next_tier := fruit_a.data.tier + 1
	var spawn_position := (fruit_a.global_position + fruit_b.global_position) * 0.5
	var next_mass := _mass_for_tier(next_tier)
	var momentum := incoming_a * fruit_a.data.mass + incoming_b * fruit_b.data.mass + deferred_impulse
	var spawn_velocity := momentum / maxf(0.001, next_mass)
	var points := 10 * int(pow(2, next_tier - 1))
	fusion_committed.emit(fruit_a, fruit_b, next_tier, spawn_position, spawn_velocity, points)

func _mass_for_tier(tier: int) -> float:
	var masses := [1.0, 2.2, 4.0, 7.0, 11.5, 18.0, 27.0, 40.0, 58.0, 85.0, 150.0]
	return masses[clampi(tier - 1, 0, masses.size() - 1)]
