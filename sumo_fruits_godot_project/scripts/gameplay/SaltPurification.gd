class_name SaltPurification
extends Area2D

@export var duration: float = 6.0
@export var radius: float = 80.0

var timer: float = 0.0

func _ready() -> void:
	timer = duration
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	timer -= delta
	if timer <= 0.0:
		queue_free()

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("hazards"):
		# Purify and banish hazard outward
		var dir = (body.global_position - global_position).normalized()
		if body is RigidBody2D:
			body.apply_central_impulse(dir * 350.0)
