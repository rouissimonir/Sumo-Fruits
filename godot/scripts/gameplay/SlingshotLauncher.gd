class_name SlingshotLauncher
extends Node2D

signal fruit_launched(fruit: SumoFruit)

@export var max_pull: float = 180.0
@export var min_pull: float = 16.0
@export var k_spring: float = 13.5

var is_dragging: bool = false
var loaded_fruit: SumoFruit = null
var upcoming_queue: Array[int] = [1, 2, 1]

var fruit_scene: PackedScene = preload("res://scenes/SumoFruit.tscn")

func _ready() -> void:
	call_deferred("spawn_next_fruit")

func spawn_next_fruit() -> void:
	if loaded_fruit: return
	var tier = upcoming_queue.pop_front()
	upcoming_queue.append(randi_range(1, 3))

	loaded_fruit = fruit_scene.instantiate() as SumoFruit
	loaded_fruit.apply_data(FruitCatalog.get_tier_data(tier))
	loaded_fruit.global_position = global_position
	loaded_fruit.state = SumoFruit.State.AIMING
	loaded_fruit.entry_pending = true
	get_parent().add_child(loaded_fruit)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			start_drag(event.position)
		else:
			release_drag(event.position)
	elif event is InputEventMouseMotion and is_dragging:
		update_drag(event.position)

func start_drag(mouse_pos: Vector2) -> void:
	if loaded_fruit and (mouse_pos - global_position).length() < 70.0:
		is_dragging = true
		queue_redraw()

func update_drag(mouse_pos: Vector2) -> void:
	var d = mouse_pos - global_position
	if d.length() > max_pull:
		d = d.normalized() * max_pull
	loaded_fruit.global_position = global_position + d
	queue_redraw()

func release_drag(_mouse_pos: Vector2) -> void:
	if not is_dragging: return
	is_dragging = false
	queue_redraw()

	if not loaded_fruit: return
	var d = loaded_fruit.global_position - global_position
	if d.length() >= min_pull:
		var impulse = -k_spring * d.length() * d.normalized()
		loaded_fruit.state = SumoFruit.State.IN_RING
		loaded_fruit.apply_central_impulse(impulse)
		fruit_launched.emit(loaded_fruit)
		Sound.play_taiko()
		loaded_fruit = null

		# Cooldown before reloading
		var timer = get_tree().create_timer(0.65, false)
		timer.timeout.connect(spawn_next_fruit)
	else:
		# Cancel snap back
		var tween = create_tween()
		tween.tween_property(loaded_fruit, "global_position", global_position, 0.15)

func _draw() -> void:
	# Draw Slingshot Pedestal base
	draw_circle(Vector2.ZERO, 38.0, Color("#3E2723"))
	draw_arc(Vector2.ZERO, 38.0, 0, TAU, 24, Color("#D7CCC8"), 2.0)
	draw_string(ThemeDB.fallback_font, Vector2(-22, 4), "PEDESTAL", HORIZONTAL_ALIGNMENT_CENTER, -1, 8, Color("#BCAAA4"))

	if is_dragging and loaded_fruit:
		var fruit_local = to_local(loaded_fruit.global_position)
		# Draw elastic slingshot bands
		var peg_l = Vector2(-42, 0)
		var peg_r = Vector2(42, 0)
		draw_line(peg_l, fruit_local, Color("#8D6E63"), 4.0)
		draw_line(peg_r, fruit_local, Color("#8D6E63"), 4.0)

		# Draw trajectory prediction dots
		var pull = fruit_local
		var initial_v = -k_spring * pull.length() * pull.normalized() / (loaded_fruit.mass if loaded_fruit.mass > 0 else 1.0)
		var sim_pos = fruit_local
		var sim_v = initial_v
		for step in range(16):
			sim_pos += sim_v * 0.02
			sim_v += Vector2(0, -180.0) * 0.02 # Upward bowl bias
			var alpha = 1.0 - (float(step) / 16.0)
			draw_circle(sim_pos, 3.5, Color(1, 0.85, 0.2, alpha))
