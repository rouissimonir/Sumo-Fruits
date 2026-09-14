class_name FruitCatalog
extends RefCounted

static var CATALOG: Array[Dictionary] = [
	{
		"tier": 1, "name": "Blueberry", "radius": 16.0, "mass": 1.0,
		"restitution": 0.85, "resistance": 0.05,
		"color": Color("#3B82F6"), "mawashi": Color("#F8FAFC")
	},
	{
		"tier": 2, "name": "Cherry", "radius": 22.0, "mass": 2.2,
		"restitution": 0.82, "resistance": 0.10,
		"color": Color("#991B1B"), "mawashi": Color("#FFFFFF")
	},
	{
		"tier": 3, "name": "Lime", "radius": 28.0, "mass": 4.0,
		"restitution": 0.80, "resistance": 0.18,
		"color": Color("#65A30D"), "mawashi": Color("#0F172A")
	},
	{
		"tier": 4, "name": "Strawberry", "radius": 36.0, "mass": 7.0,
		"restitution": 0.78, "resistance": 0.28,
		"color": Color("#E11D48"), "mawashi": Color("#059669")
	},
	{
		"tier": 5, "name": "Peach", "radius": 46.0, "mass": 11.5,
		"restitution": 0.75, "resistance": 0.40,
		"color": Color("#FB923C"), "mawashi": Color("#7C3AED")
	},
	{
		"tier": 6, "name": "Orange", "radius": 58.0, "mass": 18.0,
		"restitution": 0.72, "resistance": 0.55,
		"color": Color("#F97316"), "mawashi": Color("#0E7490")
	},
	{
		"tier": 7, "name": "Apple", "radius": 72.0, "mass": 27.0,
		"restitution": 0.70, "resistance": 0.70,
		"color": Color("#DC2626"), "mawashi": Color("#18181B")
	},
	{
		"tier": 8, "name": "Melon", "radius": 88.0, "mass": 40.0,
		"restitution": 0.68, "resistance": 0.82,
		"color": Color("#84CC16"), "mawashi": Color("#0284C7")
	},
	{
		"tier": 9, "name": "Coconut", "radius": 106.0, "mass": 58.0,
		"restitution": 0.65, "resistance": 0.92,
		"color": Color("#78350F"), "mawashi": Color("#F59E0B")
	},
	{
		"tier": 10, "name": "Watermelon", "radius": 130.0, "mass": 85.0,
		"restitution": 0.60, "resistance": 0.98,
		"color": Color("#15803D"), "mawashi": Color("#9333EA")
	},
	{
		"tier": 11, "name": "Yokozuna Pineapple", "radius": 160.0, "mass": 150.0,
		"restitution": 0.50, "resistance": 1.00,
		"color": Color("#EAB308"), "mawashi": Color("#B91C1C")
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
