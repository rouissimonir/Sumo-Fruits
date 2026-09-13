class_name MergeClashManager
extends Node

signal fusion_committed(new_tier: int, spawn_pos: Vector2, points: int)

var active_clashes: Dictionary = {}
var next_clash_id: int = 1

func handle_contact(fruit_a: SumoFruit, fruit_b: SumoFruit, rel_speed: float) -> void:
	if not is_instance_valid(fruit_a) or not is_instance_valid(fruit_b):
		return
	if not fruit_a.data or not fruit_b.data:
		return
	if fruit_a.data.tier != fruit_b.data.tier:
		return
	if fruit_a.data.tier >= 11:
		return
	if fruit_a.state != SumoFruit.State.IN_RING or fruit_b.state != SumoFruit.State.IN_RING:
		return

	if rel_speed >= 120.0:
		start_clash(fruit_a, fruit_b)
	else:
		commit_fusion(fruit_a, fruit_b)

func start_clash(fruit_a: SumoFruit, fruit_b: SumoFruit) -> void:
	var cid = next_clash_id
	next_clash_id += 1
	fruit_a.state = SumoFruit.State.CLASHING
	fruit_b.state = SumoFruit.State.CLASHING
	fruit_a.clash_id = cid
	fruit_b.clash_id = cid

	Juice.hit_stop(0.06)
	Juice.add_trauma(0.18)
	Sound.play_slap()
	Juice.request_banner("残った！", "TSUPPARI CLASH!", Color("#FFD700"))

	var timer = get_tree().create_timer(0.45, false, false, true)
	timer.timeout.connect(func():
		if is_instance_valid(fruit_a) and is_instance_valid(fruit_b):
			commit_fusion(fruit_a, fruit_b)
	)

func commit_fusion(fruit_a: SumoFruit, fruit_b: SumoFruit) -> void:
	var next_tier = fruit_a.data.tier + 1
	var spawn_pos = (fruit_a.global_position + fruit_b.global_position) * 0.5
	var points = 10 * int(pow(2, next_tier - 1))

	var arena = get_tree().root.find_child("BowlArena", true, false)
	if arena is BowlArena:
		arena.unregister_fruit(fruit_a)
		arena.unregister_fruit(fruit_b)

	fruit_a.queue_free()
	fruit_b.queue_free()

	Juice.add_trauma(0.28 if next_tier < 11 else 0.6)
	Sound.play_taiko()
	fusion_committed.emit(next_tier, spawn_pos, points)
