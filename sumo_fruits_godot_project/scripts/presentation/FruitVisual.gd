extends Node2D

var data: FruitData = null
var squash_amplitude: float = 0.0
var squash_elapsed: float = 0.0
var squash_angle: float = 0.0
var ripple_elapsed: float = 1.0
var left_tail: PackedVector2Array = []
var right_tail: PackedVector2Array = []

func configure(fruit_data: FruitData) -> void:
	data = fruit_data
	var segment := clampf(data.radius * 0.28, 6.0, 22.0)
	left_tail = PackedVector2Array([Vector2(-data.radius * 0.45, data.radius * 0.6), Vector2(-data.radius * 0.45, data.radius * 0.6 + segment), Vector2(-data.radius * 0.45, data.radius * 0.6 + segment * 2.0)])
	right_tail = PackedVector2Array([Vector2(data.radius * 0.45, data.radius * 0.6), Vector2(data.radius * 0.45, data.radius * 0.6 + segment), Vector2(data.radius * 0.45, data.radius * 0.6 + segment * 2.0)])
	queue_redraw()

func trigger_squash(amplitude: float, normal: Vector2) -> void:
	squash_amplitude = amplitude
	squash_elapsed = 0.0
	squash_angle = normal.angle()
	ripple_elapsed = 0.0

func trigger_ripple() -> void:
	ripple_elapsed = 0.0

func refresh_expression() -> void:
	queue_redraw()

func _process(delta: float) -> void:
	if not data:
		return
	if squash_amplitude > 0.0:
		squash_elapsed += delta
		if squash_elapsed >= 0.6:
			squash_amplitude = 0.0
			scale = Vector2.ONE
			rotation = 0.0
		else:
			var amount := squash_amplitude * exp(-8.0 * squash_elapsed) * cos(24.0 * squash_elapsed)
			var stretch := maxf(0.65, 1.0 + amount)
			rotation = squash_angle
			scale = Vector2(stretch, 1.0 / stretch)
	ripple_elapsed += delta
	_step_tail(left_tail, Vector2(-data.radius * 0.45, data.radius * 0.62), delta)
	_step_tail(right_tail, Vector2(data.radius * 0.45, data.radius * 0.62), delta)
	queue_redraw()

func _step_tail(points: PackedVector2Array, root: Vector2, delta: float) -> void:
	if points.size() != 3:
		return
	var parent_body := get_parent() as RigidBody2D
	var segment := clampf(data.radius * 0.28, 6.0, 22.0)
	points[0] = root
	var inertia := -parent_body.linear_velocity * 0.018 if parent_body else Vector2.ZERO
	for index in range(1, 3):
		var target := points[index - 1] + Vector2(0, segment) + inertia
		points[index] = points[index].lerp(target, minf(1.0, delta * 13.0))
		var direction := points[index - 1].direction_to(points[index])
		points[index] = points[index - 1] + direction * segment

func _draw() -> void:
	if not data:
		return
	var fruit := get_parent() as SumoFruit
	var r := data.radius
	if left_tail.size() == 3:
		draw_polyline(left_tail, data.mawashi_color.darkened(0.25), maxf(3.0, data.mawashi_width * 0.65), true)
		draw_polyline(right_tail, data.mawashi_color.darkened(0.25), maxf(3.0, data.mawashi_width * 0.65), true)
	draw_circle(Vector2(3, 6), r, Color(0, 0, 0, 0.28))
	draw_circle(Vector2.ZERO, r, data.secondary_color.darkened(0.3))
	draw_circle(Vector2.ZERO, r - maxf(3.0, r * 0.055), data.color)
	draw_circle(Vector2(-r * 0.28, -r * 0.3), r * 0.21, data.color.lightened(0.30))
	if data.tier in [4, 8, 10]:
		for index in range(5):
			var angle := TAU * index / 5.0
			draw_circle(Vector2.from_angle(angle) * r * 0.65, r * 0.055, data.secondary_color)
	elif data.tier == 9:
		for index in range(7):
			draw_arc(Vector2.ZERO, r * (0.35 + index * 0.07), 0, TAU, 40, Color(0.25,0.12,0.05,0.22), 2.0)

	var belt_height := maxf(data.mawashi_width, r * 0.22)
	draw_rect(Rect2(-r * 0.92, r * 0.28, r * 1.84, belt_height), data.mawashi_color, true)
	draw_rect(Rect2(-r * 0.22, r * 0.22, r * 0.44, belt_height * 1.5), data.mawashi_color.darkened(0.18), true)

	var eye_y := -r * 0.13
	var eye_x := data.eye_offset
	var eye_r := maxf(2.2, data.eye_size)
	var pupil_shift := Vector2.ZERO
	if fruit and fruit.look_target != Vector2.INF:
		pupil_shift = fruit.global_position.direction_to(fruit.look_target) * minf(eye_r * 0.35, 4.0)
	if fruit and fruit.panic:
		draw_line(Vector2(-eye_x-eye_r, eye_y-eye_r-3), Vector2(-eye_x+eye_r, eye_y-eye_r+1), Color("442014"), 2.0)
		draw_line(Vector2(eye_x-eye_r, eye_y-eye_r+1), Vector2(eye_x+eye_r, eye_y-eye_r-3), Color("442014"), 2.0)
	draw_circle(Vector2(-eye_x, eye_y), eye_r, Color.WHITE)
	draw_circle(Vector2(eye_x, eye_y), eye_r, Color.WHITE)
	draw_circle(Vector2(-eye_x, eye_y) + pupil_shift, maxf(1.2, data.pupil_size), Color("20150f"))
	draw_circle(Vector2(eye_x, eye_y) + pupil_shift, maxf(1.2, data.pupil_size), Color("20150f"))
	if fruit and fruit.panic:
		draw_circle(Vector2(0, r * 0.08), r * 0.1, Color("442014"))
	else:
		draw_arc(Vector2(0, r * 0.04), r * 0.17, 0.18, PI - 0.18, 18, Color("442014"), maxf(1.5, r * 0.035), true)
	if fruit and fruit.wiping_sweat_timer > 0.0:
		draw_circle(Vector2(r * 0.62, -r * 0.18), maxf(3.0, r * 0.06), Color("9de7ff"))

	if data.tier == 11:
		for index in range(7):
			var angle := lerpf(-PI * 0.9, -PI * 0.1, float(index) / 6.0)
			draw_colored_polygon(PackedVector2Array([Vector2(0,-r*0.72), Vector2.from_angle(angle)*r*1.32, Vector2.from_angle(angle+0.16)*r*1.08]), Color("4b8e3a"))
	elif data.tier >= 3:
		draw_circle(Vector2(0, -r * 0.84), r * 0.13, Color("4b8e3a"))

	if ripple_elapsed < 0.8:
		var progress := ripple_elapsed / 0.8
		draw_arc(Vector2.ZERO, r * (0.25 + progress * 0.7), 0, TAU, 32, Color(1,1,1,0.55*(1.0-progress)), 2.0, true)
