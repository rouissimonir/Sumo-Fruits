@tool
class_name FruitData
extends Resource

@export var tier: int = 1
@export var display_name: String = ""
@export var radius: float = 16.0
@export var mass: float = 1.0
@export var linear_damp: float = 0.8
@export var restitution: float = 0.85
@export_range(0.0, 1.0) var knockback_resistance: float = 0.05
@export var color: Color = Color("#4B69FD")
@export var mawashi_color: Color = Color("#FFFFFF")
@export var eye_offset: float = 4.0
@export var eye_size: float = 3.0
@export var pupil_size: float = 1.5

func validate() -> bool:
	return tier >= 1 and tier <= 11 and radius > 0 and mass > 0
