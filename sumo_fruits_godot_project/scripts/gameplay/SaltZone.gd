class_name SaltZone
extends Node2D

signal expired(zone: SaltZone)

var zone_radius: float = 90.0
var duration: float = 6.0
var max_duration: float = 6.0

func _process(delta: float) -> void:
	duration -= delta
	if duration <= 0.0:
		expired.emit(self)
		queue_free()
		return
	for node in get_tree().get_nodes_in_group("fruits"):
		if node is SumoFruit and node.state == SumoFruit.State.IN_RING and node.global_position.distance_to(global_position) < zone_radius + node.data.radius * 0.5:
			var bowl := get_parent().get_node_or_null("BowlArena") as BowlArena
			var normal := Vector2.ZERO
			var surface := 100.0
			if bowl:
				var metrics := bowl.get_metrics(node.global_position, node.data.radius)
				normal = metrics.normal
				surface = metrics.d_surface
			var outward_speed := maxf(0.0, node.linear_velocity.dot(normal))
			var proximity := clampf((85.0 - maxf(0.0, surface)) / 85.0, 0.0, 1.0)
			var acceleration: Vector2 = -3.2 * node.linear_velocity - 4.5 * proximity * outward_speed * normal
			node.apply_central_force(acceleration * node.mass)
	queue_redraw()

func _draw() -> void:
	var pulse := 0.5 + 0.5 * sin(Time.get_ticks_msec() * 0.007)
	var alpha := clampf(duration / max_duration, 0.0, 1.0)
	draw_circle(Vector2.ZERO, zone_radius, Color(0.55, 0.82, 1.0, 0.11 * alpha))
	draw_arc(Vector2.ZERO, zone_radius + pulse * 4.0, 0.0, TAU, 72, Color(0.7, 0.9, 1.0, 0.65 * alpha), 3.0, true)
	for index in range(12):
		var angle := TAU * index / 12.0 + Time.get_ticks_msec() * 0.0004
		draw_circle(Vector2.from_angle(angle) * zone_radius * 0.7, 2.5, Color(1,1,1,0.8 * alpha))
