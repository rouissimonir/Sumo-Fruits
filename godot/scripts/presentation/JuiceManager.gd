extends Node

var trauma: float = 0.0
var trauma_decay: float = 1.4
var camera: Camera2D = null
var initial_cam_pos: Vector2 = Vector2.ZERO

signal banner_requested(japanese_text: String, sub_text: String, color: Color)

func register_camera(cam: Camera2D) -> void:
	camera = cam
	initial_cam_pos = cam.position

func add_trauma(amount: float) -> void:
	trauma = clampf(trauma + amount, 0.0, 1.0)

func hit_stop(duration_seconds: float) -> void:
	Engine.time_scale = 0.05
	var timer = get_tree().create_timer(duration_seconds, true, false, true)
	timer.timeout.connect(func():
		Engine.time_scale = 1.0
	)

func request_banner(japanese: String, english: String, col: Color = Color("#FFD700")) -> void:
	banner_requested.emit(japanese, english, col)

func _process(delta: float) -> void:
	if trauma > 0.0:
		trauma = maxf(0.0, trauma - trauma_decay * delta)
		if camera:
			var shake = pow(trauma, 2.0)
			var offset_x = (randf() * 2.0 - 1.0) * 16.0 * shake
			var offset_y = (randf() * 2.0 - 1.0) * 16.0 * shake
			camera.position = initial_cam_pos + Vector2(offset_x, offset_y)
	elif camera:
		camera.position = initial_cam_pos
