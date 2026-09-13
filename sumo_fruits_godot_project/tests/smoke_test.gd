extends SceneTree

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
		push_error("SMOKE TEST: " + message)

func _run() -> void:
	var sound_manager := root.get_node_or_null("Sound")
	if sound_manager:
		sound_manager.enabled = false
	var result := change_scene_to_file("res://scenes/Main.tscn")
	_check(result == OK, "Main scene could not be loaded")
	await process_frame
	await process_frame

	var main = current_scene
	_check(main != null, "Main scene was not created")
	if main == null:
		quit(1)
		return

	var launcher: SlingshotLauncher = main.get_node("SlingshotLauncher")
	_check(is_instance_valid(launcher.loaded_fruit), "No fruit was loaded into the launcher")
	launcher.start_drag(launcher.global_position)
	launcher.update_drag(launcher.global_position + Vector2(0, 150))
	launcher.release_drag(launcher.global_position + Vector2(0, 150))
	_check(launcher.loaded_fruit == null, "Dragged fruit was not launched")

	var score_before: int = main.score
	var fruit_a: SumoFruit = main._create_fruit(1, Vector2(420, 500), false)
	var fruit_b: SumoFruit = main._create_fruit(1, Vector2(448, 500), false)
	fruit_a.state = SumoFruit.State.IN_RING
	fruit_b.state = SumoFruit.State.IN_RING
	main.merge_manager.handle_contact(fruit_a, fruit_b, 20.0)
	await process_frame
	await process_frame
	_check(main.score > score_before, "Merging did not increase the score")
	_check(main.best_tier >= 2, "Merging did not create the next tier")

	var lives_before: int = main.lives
	var ring_out: SumoFruit = main._create_fruit(1, Vector2(850, 500), false)
	ring_out.rim_permission = true
	await physics_frame
	await process_frame
	_check(main.lives == lives_before - 1, "Ring-out did not remove a life")

	main.bowl.set_mode("ELLIPTICAL")
	_check(main.bowl.arena_mode == "ELLIPTICAL" and main.bowl.radius_x > main.bowl.radius_y, "Elliptical arena mode was not configured")
	main.bowl.set_mode("WOBBLE")
	_check(main.bowl.arena_mode == "WOBBLE", "Wobble arena mode was not configured")
	main.bowl.break_bales([0, 4, 8, 12])
	_check(main.bowl.bale_health[0] == 0 and main.bowl.bale_health[8] == 0, "Broken Tawara configuration failed")

	main.salt_charges = 1
	var bug: ArenaHazard = main._spawn_hazard("BUG", main.bowl.global_position)
	_check(main.throw_salt(main.bowl.global_position), "Salt ability did not activate")
	_check(main.salt_charges == 0 and bug.ring_out, "Salt did not purify a hazard")

	var wasabi: ArenaHazard = main._spawn_hazard("WASABI", main.bowl.global_position)
	var striker: SumoFruit = main._create_fruit(4, main.bowl.global_position, false)
	for _hit in range(2):
		wasabi.hit_cooldown = 0.0
		wasabi._on_body_entered(striker)
	_check(wasabi.ring_out, "Wasabi did not break after its hit-point threshold")

	main.challenge_index = 0
	main._start_mode("CHALLENGE")
	_check(main.bowl.arena_mode == "WOBBLE", "Wobble Sea challenge did not apply its arena rule")
	_check(main._has_kind("CHILI"), "Wobble Sea challenge did not add its chili complication")
	main.best_tier = 7
	main._check_challenge_success()
	_check(main.game_over and main.game_over_panel.visible, "Challenge victory did not show its result panel")
	main.challenge_index = 1
	main._start_mode("CHALLENGE")
	_check(main.bowl.bale_health[0] == 0 and main.bowl.bale_health[4] == 0, "Broken Tawara challenge did not apply broken sectors")
	_check(main._has_kind("WASABI") and main._has_kind("CHILI"), "Broken Tawara challenge did not add its hazards")
	main._start_mode("CAREER")
	_check(main._has_rival(), "Career mode did not spawn its rival")

	main.tuning.slope = 0.77
	main.tuning.clash = 0.35
	main._apply_tuning()
	_check(is_equal_approx(main.bowl.slope_k, 0.77) and is_equal_approx(main.merge_manager.clash_duration, 0.35), "Physics tuner values were not applied")

	if failures.is_empty():
		print("SUMO_FRUITS_SMOKE_TEST: PASS")
		quit(0)
	else:
		print("SUMO_FRUITS_SMOKE_TEST: FAIL (%d)" % failures.size())
		quit(1)
