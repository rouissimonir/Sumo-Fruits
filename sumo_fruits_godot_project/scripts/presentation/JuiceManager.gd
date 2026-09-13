extends Node

var trauma: float = 0.0
var trauma_decay: float = 1.4

func add_trauma(amount: float) -> void:
	trauma = clamp(trauma + amount, 0.0, 1.0)

func hit_stop(duration_seconds: float) -> void:
	Engine.time_scale = 0.05
	var timer = get_tree().create_timer(duration_seconds, true, false, true)
	timer.timeout.connect(func():
		Engine.time_scale = 1.0
	)

func _process(delta: float) -> void:
	if trauma > 0.0:
		trauma = max(0.0, trauma - trauma_decay * delta)
