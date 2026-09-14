class_name TechniqueRibbonManager
extends RefCounted

class Ribbon:
	var id: int
	var title: String
	var subtitle: String
	var color: Color
	var duration: float

	func _init(p_id: int, p_title: String, p_sub: String, p_color: Color, p_dur: float):
		id = p_id
		title = p_title
		subtitle = p_sub
		color = p_color
		duration = p_dur

var active_ribbons: Array[Ribbon] = []
var next_id: int = 1

func add_ribbon(title: String, subtitle: String, color: Color = Color("#F1C40F"), duration: float = 2.4) -> void:
	for r in active_ribbons:
		if r.title == title:
			return

	active_ribbons.append(Ribbon.new(next_id, title, subtitle, color, duration))
	next_id += 1

	if active_ribbons.size() > 3:
		active_ribbons.pop_front()

	Juice.request_banner(title, subtitle, color)

func update(delta: float) -> void:
	var i = active_ribbons.size() - 1
	while i >= 0:
		active_ribbons[i].duration -= delta
		if active_ribbons[i].duration <= 0.0:
			active_ribbons.remove_at(i)
		i -= 1

func clear() -> void:
	active_ribbons.clear()
