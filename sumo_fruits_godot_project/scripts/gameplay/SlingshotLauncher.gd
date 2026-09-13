class_name SlingshotLauncher
extends Node2D

signal fruit_launched(fruit: SumoFruit)

@export var max_pull: float = 180.0
@export var min_pull: float = 12.0
@export var launch_speed: float = 720.0

var is_dragging: bool = false
var loaded_fruit: SumoFruit = null
var enabled: bool = true
var bowl: BowlArena = null

func configure(arena: BowlArena) -> void:
	bowl = arena

func _ready() -> void:
	queue_redraw()

func load_fruit(fruit: SumoFruit) -> void:
	loaded_fruit = fruit
	fruit.freeze = true
	fruit.state = SumoFruit.State.AIMING
	fruit.entry_pending = true
	fruit.global_position = global_position
	queue_redraw()

func clear_fruit() -> void:
	loaded_fruit = null
	is_dragging = false
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if not enabled or not is_instance_valid(loaded_fruit):
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			start_drag(event.position)
		else:
			release_drag(event.position)
	elif event is InputEventMouseMotion and is_dragging:
		update_drag(event.position)
	elif event is InputEventScreenTouch:
		if event.pressed:
			start_drag(event.position)
		else:
			release_drag(event.position)
	elif event is InputEventScreenDrag and is_dragging:
		update_drag(event.position)

func start_drag(mouse_pos: Vector2) -> void:
	if loaded_fruit and (mouse_pos - global_position).length() < 60.0:
		is_dragging = true

func update_drag(mouse_pos: Vector2) -> void:
	var d = mouse_pos - global_position
	if d.length() > max_pull:
		d = d.normalized() * max_pull
	loaded_fruit.global_position = global_position + d
	queue_redraw()

func release_drag(mouse_pos: Vector2) -> void:
	if not is_dragging: return
	is_dragging = false
	var d = loaded_fruit.global_position - global_position
	if d.length() >= min_pull:
		var fruit := loaded_fruit
		var impulse_magnitude := 12.8 * d.length()
		fruit.freeze = false
		fruit.state = SumoFruit.State.IN_RING
		fruit.rim_permission = true
		fruit.apply_central_impulse(-d.normalized() * impulse_magnitude)
		loaded_fruit = null
		fruit_launched.emit(fruit)
	else:
		loaded_fruit.global_position = global_position
	queue_redraw()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 34.0, Color("59351f"))
	draw_circle(Vector2.ZERO, 25.0, Color("d99a45"))
	if not is_instance_valid(loaded_fruit):
		return
	var local_fruit := to_local(loaded_fruit.global_position)
	draw_line(Vector2(-25, 2), local_fruit, Color("f4d29b"), 7.0, true)
	draw_line(Vector2(25, 2), local_fruit, Color("f4d29b"), 7.0, true)
	if is_dragging:
		_draw_predicted_trajectory(local_fruit)

func _draw_predicted_trajectory(pull_vector: Vector2) -> void:
	if not bowl or not loaded_fruit or pull_vector.length() < 12.0:
		return
	var impulse := -pull_vector.normalized() * 12.8 * pull_vector.length()
	var velocity := impulse / loaded_fruit.mass
	var world_position := loaded_fruit.global_position
	var step := 1.2 / 45.0
	for index in range(45):
		world_position += velocity * step
		velocity = (velocity + bowl.get_bowl_acceleration(world_position) * step) * maxf(0.0, 1.0 - loaded_fruit.data.linear_damp * step)
		var hit := false
		for node in get_tree().get_nodes_in_group("fruits"):
			if node != loaded_fruit and node is SumoFruit and node.data and world_position.distance_to(node.global_position) < loaded_fruit.data.radius + node.data.radius:
				hit = true
				break
		if bowl.get_metrics(world_position, loaded_fruit.data.radius).d_surface <= 0.0 and index > 4:
			hit = true
		if index % 2 == 0 or hit:
			var local_point := to_local(world_position)
			draw_circle(local_point, 7.0 if hit else maxf(2.0, 5.5-index*0.07), Color("ffdb78") if not hit else Color("ff6b5b"))
		if hit:
			break
