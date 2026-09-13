class_name RivalSumo
extends RigidBody2D

@export var push_force: float = 380.0
@export var charge_interval: float = 3.0

var target_fruit: SumoFruit = null
var charge_timer: float = 1.0

func _ready() -> void:
	gravity_scale = 0.0
	mass = 8.5
	linear_damp = 0.6

func _physics_process(delta: float) -> void:
	charge_timer -= delta
	if charge_timer <= 0.0:
		charge_timer = charge_interval + randf_range(-0.5, 0.5)
		execute_push()

func execute_push() -> void:
	var fruits = get_tree().get_nodes_in_group("fruits")
	if fruits.is_empty(): return
	var closest: SumoFruit = null
	var min_dist: float = 99999.0
	for f in fruits:
		var d = (f.global_position - global_position).length()
		if d < min_dist:
			min_dist = d
			closest = f
	if closest:
		var dir = (closest.global_position - global_position).normalized()
		apply_central_impulse(dir * push_force)
