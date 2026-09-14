class_name CareerManager
extends RefCounted

class StageData:
	var index: int
	var name: String
	var rank_title: String
	var rival_id: String
	var arena_mode: String # "CIRCULAR", "ELLIPTICAL", "WOBBLE"
	var complication_description: String
	var unlocked: bool
	var completed: bool
	var has_wasabi: bool
	var has_chili: bool
	var has_fragile_rims: bool

	func _init(p_idx: int, p_name: String, p_rank: String, p_rival: String, p_arena: String, p_desc: String, p_unlocked: bool, p_wasabi: bool = false, p_chili: bool = false, p_fragile: bool = false):
		index = p_idx
		name = p_name
		rank_title = p_rank
		rival_id = p_rival
		arena_mode = p_arena
		complication_description = p_desc
		unlocked = p_unlocked
		completed = false
		has_wasabi = p_wasabi
		has_chili = p_chili
		has_fragile_rims = p_fragile

class ChallengeData:
	var id: String
	var title: String
	var subtitle: String
	var objective: String
	var arena_mode: String
	var description: String
	var broken_bales: Array[int] = []
	var allowed_shots: int = 0
	var has_wasabi: bool = false
	var has_chili: bool = false

	func _init(p_id: String, p_title: String, p_sub: String, p_obj: String, p_arena: String, p_desc: String, p_broken: Array[int] = [], p_shots: int = 0, p_wasabi: bool = false, p_chili: bool = false):
		id = p_id
		title = p_title
		subtitle = p_sub
		objective = p_obj
		arena_mode = p_arena
		description = p_desc
		broken_bales = p_broken
		allowed_shots = p_shots
		has_wasabi = p_wasabi
		has_chili = p_chili

var stages: Array[StageData] = []
var challenges: Array[ChallengeData] = []
var current_stage_index: int = 0
var active_challenge: ChallengeData = null

func _init() -> void:
	_init_stages()
	_init_challenges()

func _init_stages() -> void:
	stages = [
		StageData.new(0, "Maegashira Bout", "Rank 1: Maegashira", "TENGU_ORANGE", "CIRCULAR", "Basic dohyo. Learn Tengu Orange's telegraphed rush lane every 2nd shot.", true, false, false, false),
		StageData.new(1, "Komusubi Bout", "Rank 2: Komusubi", "CHERRY_SLAPPER", "ELLIPTICAL", "Elliptical bowl (q=1.25). Watch the narrow flanks and Cherry Slapper's 3-thrust slap cone.", false, false, false, false),
		StageData.new(2, "Sekiwake Bout", "Rank 3: Sekiwake", "COCONUT_TANK", "CIRCULAR", "Sticky wasabi patches line the sand. Trap the heavy Coconut Tank or lure him across them!", false, true, false, false),
		StageData.new(3, "Yokozuna Championship", "Rank 4: Yokozuna Title Bout", "DRAGONFRUIT_YOKOZUNA", "CIRCULAR", "Destructible straw guards! Heavy impacts crack the rim. Defeat the Grand Champion!", false, false, true, true),
	]

func _init_challenges() -> void:
	challenges = [
		ChallengeData.new("WOBBLE_SEA", "Wobble Sea", "Dynamic Mass-Weighted Dohyo", "Reach Melon (Tier 7) while the bowl gently tilts toward fruit weight!", "WOBBLE", "The bowl leans into clusters. Use sacred salt to anchor your heavy rikishi against the shifting slope.", [], 0, false, true),
		ChallengeData.new("BROKEN_TAWARA", "Broken Tawara Breach", "Fragile Rim High-Stakes Ring-Out", "Survive 12 launches and score 3,000 points with 4 broken rim guards!", "CIRCULAR", "Four bales are broken down to the low ceramic lip. One miscalculated rebound means sudden ring-out.", [0, 4, 8, 12], 0, true, true),
		ChallengeData.new("ONE_BEAUTIFUL_SHOT", "One Beautiful Shot", "Handcrafted Trick-Shot Puzzle", "Execute a single master shot to fuse two Peaches and eject the Beetle!", "CIRCULAR", "Two Peaches sit on opposite sides of a stubborn beetle. Angle your launch off the rim for a double clash!", [2], 2, false, false),
	]

func get_current_stage() -> StageData:
	if current_stage_index >= 0 and current_stage_index < stages.size():
		return stages[current_stage_index]
	return stages[0]

func complete_current_stage() -> bool:
	var cur = get_current_stage()
	cur.completed = true
	if current_stage_index + 1 < stages.size():
		stages[current_stage_index + 1].unlocked = true
		return true
	return false

func advance_stage() -> void:
	if current_stage_index + 1 < stages.size():
		current_stage_index += 1

func set_stage(idx: int) -> bool:
	if idx >= 0 and idx < stages.size() and stages[idx].unlocked:
		current_stage_index = idx
		active_challenge = null
		return true
	return false

func set_challenge(challenge_id: String) -> bool:
	for ch in challenges:
		if ch.id == challenge_id:
			active_challenge = ch
			return true
	return false

func reset_progress() -> void:
	current_stage_index = 0
	active_challenge = null
	_init_stages()
