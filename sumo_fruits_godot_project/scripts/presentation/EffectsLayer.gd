class_name EffectsLayer
extends Node2D

var particles: Array[Dictionary] = []
var ripples: Array[Dictionary] = []

func spawn_particles(position: Vector2, color: Color, count: int, kind: String = "SPARK") -> void:
	for _index in range(count):
		var angle := randf_range(0.0, TAU)
		var speed := randf_range(60.0, 230.0)
		particles.append({"position": position, "velocity": Vector2.from_angle(angle) * speed, "color": color, "size": randf_range(3.0, 7.0), "life": randf_range(0.45, 0.8), "max_life": 0.8, "kind": kind})
	queue_redraw()

func spawn_confetti(position: Vector2, count: int) -> void:
	var colors := [Color("f1c40f"), Color("e74c3c"), Color("3498db"), Color("2ecc71"), Color("9b59b6"), Color.WHITE]
	for _index in range(count):
		particles.append({"position": position, "velocity": Vector2.from_angle(randf_range(0.0, TAU)) * randf_range(100.0, 420.0), "color": colors.pick_random(), "size": randf_range(5.0, 11.0), "life": randf_range(1.2, 2.0), "max_life": 2.0, "kind": "CONFETTI"})
	queue_redraw()

func spawn_salt(position: Vector2, radius: float) -> void:
	for _index in range(30):
		var point := position + Vector2.from_angle(randf_range(0.0, TAU)) * randf_range(0.0, radius)
		particles.append({"position": point, "velocity": Vector2(randf_range(-45.0, 45.0), randf_range(-65.0, -20.0)), "color": Color.WHITE, "size": randf_range(2.5, 6.0), "life": randf_range(0.8, 1.4), "max_life": 1.4, "kind": "SALT"})
	queue_redraw()

func spawn_ripple(position: Vector2, radius: float, color: Color = Color(1,1,1,0.5)) -> void:
	ripples.append({"position": position, "radius": radius, "color": color, "life": 0.55, "max_life": 0.55})
	queue_redraw()

func _process(delta: float) -> void:
	for index in range(particles.size() - 1, -1, -1):
		var particle := particles[index]
		particle.life -= delta
		if particle.life <= 0.0:
			particles.remove_at(index)
			continue
		particle.position += particle.velocity * delta
		if particle.kind in ["CONFETTI", "SALT", "DUST"]:
			particle.velocity.y += 70.0 * delta
	for index in range(ripples.size() - 1, -1, -1):
		ripples[index].life -= delta
		if ripples[index].life <= 0.0:
			ripples.remove_at(index)
	queue_redraw()

func _draw() -> void:
	for particle in particles:
		var color: Color = particle.color
		color.a *= clampf(particle.life / particle.max_life, 0.0, 1.0)
		if particle.kind == "CONFETTI":
			draw_set_transform(particle.position, particle.life * 8.0, Vector2.ONE)
			draw_rect(Rect2(-particle.size * 0.6, -particle.size * 0.25, particle.size * 1.2, particle.size * 0.5), color, true)
			draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		else:
			draw_circle(particle.position, particle.size, color)
	for ripple in ripples:
		var progress: float = 1.0 - float(ripple.life) / float(ripple.max_life)
		var color: Color = ripple.color
		color.a *= 1.0 - progress
		draw_arc(ripple.position, ripple.radius * progress, 0.0, TAU, 64, color, 5.0 * (1.0 - progress) + 1.0, true)
