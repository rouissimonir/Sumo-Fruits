class_name SaltPurification
extends Node2D

@export var duration: float = 3.5
@export var radius: float = 140.0

var elapsed: float = 0.0

func _ready() -> void:
	Sound.play_salt()
	Juice.add_trauma(0.2)
	Juice.request_banner("清め塩！", "SACRED SALT PURIFICATION!", Color("#E0F7FA"))

	# Affect nearby fruits and hazards immediately
	var hazards = get_tree().get_nodes_in_group("hazards")
	for h in hazards:
		if h is Hazard and (h.global_position - global_position).length() <= radius:
			h.defeat(180)

	var fruits = get_tree().get_nodes_in_group("fruits")
	for f in fruits:
		if f is SumoFruit and (f.global_position - global_position).length() <= radius:
			f.linear_velocity *= 0.35 # Calm momentum

func _process(delta: float) -> void:
	elapsed += delta
	queue_redraw()
	if elapsed >= duration:
		queue_free()

func _draw() -> void:
	var alpha = maxf(0.0, 1.0 - (elapsed / duration))
	# Shimmering salt circle
	draw_circle(Vector2.ZERO, radius, Color(0.9, 0.95, 1.0, alpha * 0.25))
	draw_arc(Vector2.ZERO, radius, 0, TAU, 32, Color(1, 1, 1, alpha * 0.7), 2.5)

	# Sparkling salt crystals
	for i in range(18):
		var ang = (float(i) / 18.0) * TAU + elapsed * 1.5
		var dist = (radius * 0.8) * sin(float(i) * 2.1 + elapsed * 3.0)
		var pt = Vector2(cos(ang), sin(ang)) * absf(dist)
		draw_circle(pt, 2.5, Color(1, 1, 1, alpha))
