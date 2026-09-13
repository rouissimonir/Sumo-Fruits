class_name FruitCatalog
extends RefCounted

static var CATALOG: Array[Dictionary] = [
	{
		"tier": 1, "name": "Blueberry", "radius": 16.0, "mass": 1.0,
		"restitution": 0.85, "resistance": 0.05,
		"color": Color("#4B69FD"), "mawashi": Color("#FFFFFF")
	},
	{
		"tier": 2, "name": "Cherry", "radius": 22.0, "mass": 1.8,
		"restitution": 0.82, "resistance": 0.10,
		"color": Color("#E74C3C"), "mawashi": Color("#2C3E50")
	},
	{
		"tier": 3, "name": "Lime", "radius": 28.0, "mass": 3.0,
		"restitution": 0.80, "resistance": 0.16,
		"color": Color("#2ECC71"), "mawashi": Color("#8E44AD")
	},
	{
		"tier": 4, "name": "Orange", "radius": 36.0, "mass": 5.2,
		"restitution": 0.77, "resistance": 0.24,
		"color": Color("#E67E22"), "mawashi": Color("#16A085")
	},
	{
		"tier": 5, "name": "Apple", "radius": 45.0, "mass": 8.5,
		"restitution": 0.74, "resistance": 0.34,
		"color": Color("#C0392B"), "mawashi": Color("#F1C40F")
	},
	{
		"tier": 6, "name": "Grapefruit", "radius": 55.0, "mass": 13.5,
		"restitution": 0.70, "resistance": 0.45,
		"color": Color("#E84393"), "mawashi": Color("#2980B9")
	},
	{
		"tier": 7, "name": "Peach", "radius": 68.0, "mass": 21.0,
		"restitution": 0.66, "resistance": 0.58,
		"color": Color("#FAB1A0"), "mawashi": Color("#8854D0")
	},
	{
		"tier": 8, "name": "Melon", "radius": 82.0, "mass": 32.0,
		"restitution": 0.62, "resistance": 0.70,
		"color": Color("#55EFC4"), "mawashi": Color("#D35400")
	},
	{
		"tier": 9, "name": "Coconut", "radius": 98.0, "mass": 48.0,
		"restitution": 0.58, "resistance": 0.82,
		"color": Color("#795548"), "mawashi": Color("#F39C12")
	},
	{
		"tier": 10, "name": "Watermelon", "radius": 120.0, "mass": 75.0,
		"restitution": 0.54, "resistance": 0.92,
		"color": Color("#27AE60"), "mawashi": Color("#9B59B6")
	},
	{
		"tier": 11, "name": "Yokozuna Pineapple", "radius": 148.0, "mass": 120.0,
		"restitution": 0.50, "resistance": 1.00,
		"color": Color("#F1C40F"), "mawashi": Color("#E74C3C")
	}
]

static func get_tier_data(tier: int) -> FruitData:
	tier = clampi(tier, 1, 11)
	var dict = CATALOG[tier - 1]
	var data = FruitData.new()
	data.tier = dict["tier"]
	data.display_name = dict["name"]
	data.radius = dict["radius"]
	data.mass = dict["mass"]
	data.restitution = dict["restitution"]
	data.knockback_resistance = dict["resistance"]
	data.color = dict["color"]
	data.mawashi_color = dict["mawashi"]
	data.eye_offset = data.radius * 0.28
	data.eye_size = clampf(data.radius * 0.18, 3.0, 18.0)
	data.pupil_size = data.eye_size * 0.55
	return data
